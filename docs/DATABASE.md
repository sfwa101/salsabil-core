---
title: مرجع قاعدة البيانات
status: ACTIVE
version: 1.3
last_updated: 2026-09-02
owner: المؤسس (أبوحتاب) + Claude
source_of_truth: Supabase Project الفعلي (للجداول المنفَّذة) + هذا الملف (للتخطيط)
---

# مرجع قاعدة البيانات

> لكل جدول: **IMPLEMENTED** (موجود فعلياً في Supabase الآن) أو **CONCEPTUAL** (مخطَّط في الدستور، لم يُبنَ) أو **PROPOSED** (اقتراح Claude، لم يُعتمد).

---

## 1. فلسفة البيانات — Evidence: `CONSTITUTION` §4, §5

- لا استدعاء مباشر لقاعدة البيانات من الواجهة — فقط عبر `[domain].repository.ts`.
- `tenant_id` يأتي من الجلسة/JWT فقط، أبداً من طلب العميل. **`IMPLEMENTED` جزئياً منذ اليوم 4** — `products.tenant_id` موجود ويُشير إلى `merchants.id`؛ التحقق الفعلي عبر `Session.tenantId` لا يزال منطقياً فقط (لا مصادقة حقيقية بعد — راجع `specs/identity/SPEC.md`)، لا `stores` بعد.
- RLS مفعَّل على كل جدول يحوي بيانات — `IMPLEMENTED` على العشرة جداول الموجودة حالياً (`users`, `categories`, `products`, `merchants`, `inventory`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`). نمطان مختلفان: قراءة عامة (`categories`/`products`/`inventory`) مقابل قفل كامل بلا أي policy، وصول حصري عبر `service_role` (`merchants`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history` — راجع §6 وADR-008/ADR-009/ADR-010).
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

### `orders`, `order_items`, `order_status_history` — Evidence: `IMPLEMENTED` (اليوم 8 `CHECKOUT-001` للأولين، اليوم 9 `ORDERS-002` لدورة الحياة الكاملة + الثالث)

```sql
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  tenant_id uuid not null references merchants(id),
  status text not null default 'pending',
  payment_method text not null default 'cash_on_delivery',
  delivery_address jsonb not null,
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table orders enable row level security;

-- اليوم 9: القيد المؤجَّل عمداً في ADR-009، مُحسَم الآن (ADR-010)
alter table orders
  add constraint orders_status_check
  check (status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled'));

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  selection jsonb not null default '{}'::jsonb,
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot >= 0),
  created_at timestamptz not null default now()
);
alter table order_items enable row level security;

-- اليوم 9 (ORDERS-002) — سجل تدقيق دورة حياة الطلب، CONSTITUTION §4 بند 5
create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_role text not null,
  actor_id uuid references users(id),
  note text,
  created_at timestamptz not null default now()
);
alter table order_status_history
  add constraint order_status_history_to_status_check
    check (to_status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  add constraint order_status_history_from_status_check
    check (from_status is null or from_status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  add constraint order_status_history_actor_role_check
    check (actor_role in ('platform_admin','merchant_owner','merchant_manager','employee','customer','system'));
alter table order_status_history enable row level security;
create index order_status_history_order_id_idx on order_status_history (order_id);
```

**الحالة:** `IMPLEMENTED` — دورة حياة كاملة (`pending → confirmed → preparing → ready → out_for_delivery → delivered`، مع `cancelled` من أي حالة غير نهائية). مُتحقَّق منه حياً: محاولة إدراج `status` غير صحيحة في `orders` رُفضت فعلياً بـ`orders_status_check` (كود خطأ `23514`)، ودورة حياة كاملة نُفِّذت ضد Supabase حقيقي عبر `src/core/modules/orders/orders.integration.test.ts` مع بناء سجل `order_status_history` متسلسل صحيح. راجع `ADR-010` و`specs/orders/README.md` للتفصيل الكامل (آلة الحالات، مصفوفة الفاعلين المخوَّلين).

**قرارات تصميم (راجع `ADR-009`/`ADR-010` في `docs/DECISIONS.md` للتفصيل الكامل):**
- **`unit_price_snapshot` عكس `cart_items` تماماً:** يُحسَب من `CatalogService.calculatePrice()` في لحظة إنشاء الطلب فقط، ثم يُجمَّد للأبد — لا يُعاد حسابه بعد هذه اللحظة مهما تغيّر سعر المنتج لاحقاً.
- **`delivery_address` JSONB على الطلب نفسه** (`{ line1, city, notes? }`) — لا جدول عناوين منفصل قابل لإعادة الاستخدام، عمداً، خارج نطاق Vertical Slice.
- **طلب واحد بلا تقسيم لكل تاجر** — `tenant_id` عمود واحد إلزامي على الطلب (لا جدول ربط). مبرَّر حالياً لأن `products` يحتوي منتجاً واحداً من تاجر واحد فقط (تحقَّق منه مباشرة من Supabase الحي وقت التخطيط، لا من التوثيق فقط). **تقسيم الطلب لكل تاجر عند تعدد التجار `PROPOSED` ومؤجَّل** — `orders.service.ts` يرفض صراحة أي محاولة سلة بمنتجات من أكثر من `tenant_id` بدل إنشاء طلب خاطئ صامتاً.
- **بلا أي policy على الجداول الثلاثة** — نفس نمط `carts`/`merchants`، وصول حصري عبر `service_role`.
- **لا معاملة قاعدة بيانات ذرية حقيقية (Postgres transaction/RPC)** بين إنشاء `orders` و`order_items` — إن فشل إدراج البنود، يُحذَف صف `orders` تعويضياً (compensating action) في الكود بدل معاملة DB حقيقية. تحسين مستقبلي موثَّق، لم يُبنَ اليوم.
- **`order_status_history.from_status` قابل لـ`NULL`** — القيد الأول عند إنشاء الطلب (`null → pending`) لا حالة سابقة له فعلياً.
- **`order_status_history.actor_id` قابل لـ`NULL`** — عندما `actor_role = 'system'` (القيد الأول عند Checkout)، لا مستخدم بشري فعلي وراء الانتقال.
- **`updated_at` على `orders` يُحدَّث يدوياً في الكود** (`orders.repository.ts` → `updateOrderStatus`) عند كل انتقال حالة — **لا trigger على مستوى قاعدة البيانات** (لا جدول حالي في المشروع يستخدم trigger، القرار الحالي إبقاء الاتساق مع هذا النمط، راجع ADR-010).

---

## 4. الجداول — CONCEPTUAL (مخطَّطة في الدستور، لم تُبنَ)

راجع `SALSABIL_CONSTITUTION.md §8` للقائمة الكاملة. أبرزها بالترتيب المتوقع للبناء:

| الجدول | ينتمي لِـ | مخطَّط لليوم | الحالة |
|---|---|---|---|
| `stores` | Tenant (طبقة فرعية تحت `merchants`) | غير مجدوَل بعد | `CONCEPTUAL` |
| `sessions` | Khalil | مع تسجيل الدخول | `CONCEPTUAL` — لم يُبنَ بعد رغم إنشاء `merchants`, `carts`, `orders` |
| `audit_log` | Audit (عام، خارج نطاق طلب واحد) | اليوم 12 (يوم الأمان، بعد الإزاحة) | `CONCEPTUAL` — `order_status_history` (تدقيق خاص بالطلبات فقط) `IMPLEMENTED` منذ اليوم 9، راجع §3 |
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
| `orders`, `order_items`, `order_status_history` | بلا أي policy — نفس نمط القفل الكامل (اليوم 8، `ADR-009`؛ الثالث اليوم 9، `ADR-010`) | `IMPLEMENTED` (دورة حياة كاملة) |

**سياسات الكتابة (Insert/Update/Delete) لا تزال غير موجودة/موثَّقة على `users`/`categories`/`products`/`inventory` — `OPEN_QUESTION` صريح يحتاج حسماً قبل بناء بوابة التاجر الكاملة (اليوم 5+).**

---

## 7. Soft Delete — Evidence: `OPEN_QUESTION`

غير محسوم بعد هل سلسبيل تعتمد Soft Delete (`deleted_at` عمود) أم Hard Delete مع `audit_log`. الأقرب لروح الدستور (§26، تدقيق كامل) هو Soft Delete + Audit، لكن **لم يُتَّخذ قرار صريح — `OPEN_QUESTION`**.

---

## 8. Migrations

لا نظام Migrations رسمي (مثل Supabase CLI migrations) مُفعَّل بعد — كل SQL نُفِّذ يدوياً عبر SQL Editor. **مخاطرة موثَّقة:** هذا مقبول في مرحلة Vertical Slice الأولى، لكن يجب الانتقال لـ Migrations رسمية قبل أي عمل فريق متعدد أو قبل الإنتاج (اليوم 13، §23). يُضاف كبند في `docs/ROADMAP.md`.
