---
title: مرجع قاعدة البيانات
status: ACTIVE
version: 1.1
last_updated: 2026-09-01
owner: المؤسس (أبوحتاب) + Claude
source_of_truth: Supabase Project الفعلي (للجداول المنفَّذة) + هذا الملف (للتخطيط)
---

# مرجع قاعدة البيانات

> لكل جدول: **IMPLEMENTED** (موجود فعلياً في Supabase الآن) أو **CONCEPTUAL** (مخطَّط في الدستور، لم يُبنَ) أو **PROPOSED** (اقتراح Claude، لم يُعتمد).

---

## 1. فلسفة البيانات — Evidence: `CONSTITUTION` §4, §5

- لا استدعاء مباشر لقاعدة البيانات من الواجهة — فقط عبر `[domain].repository.ts`.
- `tenant_id` يأتي من الجلسة/JWT فقط، أبداً من طلب العميل. **`IMPLEMENTED` جزئياً منذ اليوم 4** — `products.tenant_id` موجود ويُشير إلى `merchants.id`؛ التحقق الفعلي عبر `Session.tenantId` لا يزال منطقياً فقط (لا مصادقة حقيقية بعد — راجع `specs/identity/SPEC.md`)، لا `stores` بعد.
- RLS مفعَّل على كل جدول يحوي بيانات — `IMPLEMENTED` على السبعة الجداول الموجودة حالياً (`users`, `categories`, `products`, `merchants`, `inventory`, `carts`, `cart_items`). نمطان مختلفان: قراءة عامة (`categories`/`products`/`inventory`) مقابل قفل كامل بلا أي policy، وصول حصري عبر `service_role` (`merchants`, `carts`, `cart_items` — راجع §6 وADR-008).
- كل سعر يُعاد حسابه من الخادم دائماً، لا يُصدَّق من العميل.

---

## 2. Multi-Tenancy — Evidence: `IMPLEMENTED` (اليوم 4)

**الحالة الحالية:** جدول `merchants` موجود، وعمود `tenant_id` أُضيف لـ `products` (يُشير إلى `merchants.id`). عزل البيانات مُتحقَّق منه فعلياً عبر `CatalogRepository.findProductsByTenant()` — تاجر وهمي لا يرى منتجات تاجر آخر (`IMPLEMENTED`، مُختبَر). **لا `stores` بعد** (طبقة فرعية مؤجَّلة — راجع §4 أدناه).

---

## 3. الجداول — IMPLEMENTED (موجودة فعلياً في Supabase الآن)

### `users`
```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text unique not null,
  email text,
  role text not null default 'customer'
    check (role in ('platform_admin','merchant_owner','merchant_manager','employee','customer')),
  created_at timestamptz not null default now()
);
alter table users enable row level security;
create policy "Users can read own data" on users for select using (auth.uid() = id);
```
**الحالة:** `IMPLEMENTED` — RLS مفعَّل، سياسة قراءة واحدة فقط (المستخدم يقرأ بياناته الخاصة). **لا سياسات Insert/Update/Delete بعد — `OPEN_QUESTION`: من يملك حق إنشاء مستخدم جديد؟ (Auth مباشرة أم عبر service مخصص؟)**

### `categories`
```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  parent_id uuid references categories(id),
  display_order int not null default 0,
  is_active boolean not null default true
);
```
**الحالة:** `IMPLEMENTED` — قسم تجريبي واحد ("حي الطعام اليومي"). `parent_id` موجود لدعم الأقسام الفرعية لاحقاً — غير مُستخدَم فعلياً بعد.

### `products`
```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name text not null,
  description text,
  base_price numeric(10,2) not null check (base_price >= 0),
  unit text not null default 'piece',
  image_url text,
  options jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
```
**الحالة:** `IMPLEMENTED`. **قرار تصميم مهم (Evidence: `DOCUMENTED_DECISION` — راجع ADR-004 في DECISIONS.md):** عمود `options` مرن (JSONB) بدل أعمدة ثابتة أو EAV كامل، مع فرض الشكل الصارم على مستوى TypeScript (`ProductOption` union type) لا على مستوى قاعدة البيانات. **`tenant_id uuid references merchants(id)` أُضيف في اليوم 4** — `nullable` (منتجات لم تُربَط بتاجر بعد تبقى `null`).

### `merchants`
```sql
create table merchants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  business_name text not null,
  phone text not null,
  slug text unique not null,
  commission_rate numeric not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table merchants enable row level security;
```
**الحالة:** `IMPLEMENTED` — الجدول موجود، `tenant_id` في `products` يُشير إليه. **إعادة بناء تعريف SQL هنا استنتاجية (`INFERRED`)** من فحص الأعمدة الفعلية عبر الاستعلامات (لا نص SQL أصلي محفوظ في المستودع بعد — راجع §8 Migrations). RLS مفعَّل ويمنع الإدراج بمفتاح `anon` فعلياً (تحقَّق منه مباشرة)، لكن **نص سياسة RLS الدقيق `OPEN_QUESTION`** — نُفِّذ عبر SQL Editor مباشرة دون توثيق النص هنا.

**`commissionRate` (Evidence: `FOUNDER_DECISION`, راجع `docs/BUSINESS_RULES.md` BR-007):** قيمة قابلة للتهيئة لكل تاجر على حدة، **لا نسبة ثابتة مبرمجة للمنصة كلها** — لا يوجد بعد مصدر رسمي لشرائح عمولة نهائية (`SALSABIL_CONSTITUTION.md` §8 يصف الشرائح كـ"هيكل مقترح وليس نهائياً"). نطاق `MerchantAgreement` الكامل (عقد إلكتروني صريح، شفافية تامة) الذي تتطلبه BR-007 **لم يُبنَ بعد** — الموجود حالياً إسقاط بسيط (`MerchantAgreement` type) من بيانات التاجر، وليس تنفيذاً كاملاً لتلك القاعدة.

### `inventory`
```sql
create table inventory (
  product_id uuid primary key references products(id),
  quantity_available int not null default 0 check (quantity_available >= 0),
  updated_at timestamptz not null default now()
);
```
**الحالة:** `IMPLEMENTED` (الجدول فقط) — لا منطق نقص تلقائي عند الطلب بعد (Orders غير موجود). عمود `quantity_available` يُستهلَك الآن للفحص فقط (لا حجز) عبر `InventoryService.isAvailable()` منذ اليوم 7.

### `carts`, `cart_items` — Evidence: `IMPLEMENTED` (اليوم 7)

> **ملاحظة توثيقية:** هذا القسم لم يكن موجوداً في هذا الملف قبل اليوم 7 رغم أن موجّه المهمة (`CART-001`) أشار إليه كـ"§4.1 — تصميم مقترح" قائم — لم يوجد أي تصميم سابق في المستودع، فأُنشئ من الصفر ضمن دورة Specification → Plan → Review (`AGENTS.md` §6) واعتمده المؤسس صراحة قبل التنفيذ.

```sql
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  session_token uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint carts_identity_xor check (
    (user_id is not null and session_token is null) or
    (user_id is null and session_token is not null)
  ),
  constraint carts_user_id_unique unique (user_id)
);
alter table carts enable row level security;

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  selection jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table cart_items enable row level security;
```

**الحالة:** `IMPLEMENTED` — تحقَّق منه فعلياً عبر اختبار تكامل ضد Supabase الحقيقي (`src/core/modules/cart/cart.integration.test.ts`) وتصفح فعلي في متصفح حقيقي.

**قرارات تصميم موثَّقة (Evidence: `FOUNDER_DECISION`، راجع `ADR-008` في `docs/DECISIONS.md`):**
- **لا عمود سعر في `cart_items` إطلاقاً.** السعر يُحسَب دائماً حياً عبر `CatalogService.calculatePrice()` عند القراءة — لا تكرار لمنطق التسعير، ولا ثقة بأي سعر يصل من العميل (`docs/SECURITY.md` قاعدة 2).
- **`user_id` و`session_token` — أحدهما فقط، أبداً كلاهما أو لا شيء** (`CHECK` صريح). سلة الزائر مدعومة عبر `session_token` عشوائي (`crypto.randomUUID()`) يُخزَّن في cookie `httpOnly`، لأنه لا يوجد تسجيل دخول حقيقي مربوط بـ Supabase Auth بعد (نفس فجوة `specs/identity/SPEC.md`).
- **RLS مفعَّل بلا أي policy على الجدولين** — قفل كامل لـ`anon`/`authenticated` (نفس نمط `merchants`)، **وليس نمط "قراءة عامة" المعتاد على `products`/`categories`/`inventory`** لأن بيانات السلة خاصة بصاحبها. كل الوصول يمر حصرياً عبر `src/core/kernel/database/supabase-admin-client.ts` (مفتاح `service_role`، خادم فقط) — هذا ضروري لأن السلة تُكتَب بلا مصادقة حقيقية (زائر)، فـRLS مسموح لـ`anon` لا يوفر حماية فعلية (كان سيخالف `docs/SECURITY.md` قاعدة 3).
- لا عمود `status` (سلة نشطة واحدة فقط لكل هوية، لا أرشفة/تحويل — يُبنى لاحقاً مع Orders، اليوم 9).

---

## 4. الجداول — CONCEPTUAL (مخطَّطة في الدستور، لم تُبنَ)

راجع `SALSABIL_CONSTITUTION.md §8` للقائمة الكاملة. أبرزها بالترتيب المتوقع للبناء:

| الجدول | ينتمي لِـ | مخطَّط لليوم | الحالة |
|---|---|---|---|
| `stores` | Tenant (طبقة فرعية تحت `merchants`) | غير مجدوَل بعد | `CONCEPTUAL` |
| `sessions` | Khalil | مع تسجيل الدخول | `CONCEPTUAL` — لم يُبنَ بعد رغم إنشاء `merchants` و`carts` |
| `orders`, `order_items`, `order_status_history` | Orders | اليوم 9 (بعد إزاحة يوم، راجع `docs/ROADMAP.md`) | `CONCEPTUAL` |
| `audit_log` | Audit | اليوم 11 (يوم الأمان) | `CONCEPTUAL` |
| `product_variant`, `sku`, `barcode`, `packaging` | Catalog (العمق الكامل) | غير مجدوَل بعد — أُجِّل لصالح Vertical Slice أولاً | `CONCEPTUAL` |

---

## 5. Naming Conventions — Evidence: `INFERRED` من الجداول الموجودة فعلياً

- أسماء الجداول: جمع، snake_case (`products`, `categories`, لا `product`)
- المفتاح الأساسي: `id uuid default gen_random_uuid()` دائماً
- الطوابع الزمنية: `created_at timestamptz not null default now()` — `updated_at` عند الحاجة فقط (ليس إلزامياً في كل جدول حتى الآن، **`OPEN_QUESTION`**: هل نجعله إلزامياً في كل جدول من الآن فصاعداً؟)
- الحقول المنطقية: `is_[state]` (`is_active`)، لا `[state]_flag` أو غيره

---

## 6. RLS — القواعد المطبَّقة فعلياً الآن

| الجدول | السياسة | الحالة |
|---|---|---|
| `users` | قراءة الذات فقط | `IMPLEMENTED` |
| `categories` | قراءة عامة للأقسام النشطة | `IMPLEMENTED` |
| `products` | قراءة عامة للمنتجات النشطة | `IMPLEMENTED` |
| `inventory` | قراءة عامة | `IMPLEMENTED` |
| `merchants` | تمنع إدراج/كتابة بمفتاح `anon` (تحقَّق منه فعلياً) — نص السياسة الدقيق `OPEN_QUESTION` | `IMPLEMENTED` (جزئياً موثَّق) |
| `carts`, `cart_items` | بلا أي policy — قفل كامل لـ`anon`/`authenticated`، وصول حصري عبر `service_role` (اليوم 7، `ADR-008`) | `IMPLEMENTED` |

**سياسات الكتابة (Insert/Update/Delete) لا تزال غير موجودة/موثَّقة على `users`/`categories`/`products`/`inventory` — `OPEN_QUESTION` صريح يحتاج حسماً قبل بناء بوابة التاجر الكاملة (اليوم 5+).**

---

## 7. Soft Delete — Evidence: `OPEN_QUESTION`

غير محسوم بعد هل سلسبيل تعتمد Soft Delete (`deleted_at` عمود) أم Hard Delete مع `audit_log`. الأقرب لروح الدستور (§26، تدقيق كامل) هو Soft Delete + Audit، لكن **لم يُتَّخذ قرار صريح — `OPEN_QUESTION`**.

---

## 8. Migrations

لا نظام Migrations رسمي (مثل Supabase CLI migrations) مُفعَّل بعد — كل SQL نُفِّذ يدوياً عبر SQL Editor. **مخاطرة موثَّقة:** هذا مقبول في مرحلة Vertical Slice الأولى، لكن يجب الانتقال لـ Migrations رسمية قبل أي عمل فريق متعدد أو قبل الإنتاج (اليوم 13، §23). يُضاف كبند في `docs/ROADMAP.md`.
