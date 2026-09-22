---
title: مرجع قاعدة البيانات
status: ACTIVE
version: 1.13
last_updated: 2026-09-09
owner: المؤسس (أبوحتاب) + Claude
source_of_truth: Supabase Project الفعلي (للجداول المنفَّذة) + هذا الملف (للتخطيط)
---

> **تحديث 2026-09-06 (`CONSTITUTION-V2-BATCH2-ARCHITECTURE-SECURITY-DATABASE`):** إضافة §3.1
> "الجدول المركزي الموسَّع" (تصنيف كل جدول قائم عبر ثمانية أبعاد)، §9 "Schema Change Policy"، §10
> "Known Indexing Gaps". لا تغيير على أي DDL موجود — توثيقي بحت.

# مرجع قاعدة البيانات

> لكل جدول: **IMPLEMENTED** (موجود فعلياً في Supabase الآن) أو **CONCEPTUAL** (مخطَّط في الدستور، لم يُبنَ) أو **PROPOSED** (اقتراح Claude، لم يُعتمد).

---

## 1. فلسفة البيانات — Evidence: `CONSTITUTION` §4, §5

- لا استدعاء مباشر لقاعدة البيانات من الواجهة — فقط عبر `[domain].repository.ts`.
- `tenant_id` يأتي من الجلسة/JWT فقط، أبداً من طلب العميل. **`IMPLEMENTED` منذ اليوم 10** — `products.tenant_id` يُشير إلى `merchants.id`؛ `Session.tenantId` أصبح حقيقياً الآن (جدول `sessions`، تسجيل دخول تاجر بالهاتف، اليوم 10، `ADR-012`) — لا يزال بلا كلمة مرور حقيقية ولا Supabase Auth كاملة (`specs/identity/SPEC.md` لا يزال الفجوة الأشمل)، لكن `tenant_id` نفسه صار يُقرأ فعلياً من جلسة server-side لا من مدخل عميل. لا `stores` بعد.
- RLS مفعَّل على كل جدول يحوي بيانات — `IMPLEMENTED` على السبعة عشر جدولاً الموجودة حالياً (`users`, `categories`, `products`, `merchants`, `inventory`, `carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, `sessions`, `audit_log`, `worlds`, `user_personas`, `posts`, `post_media`, `post_products`). ثلاثة أنماط: (أ) قراءة عامة + كتابة ممنوعة لـ`anon` (`categories`/`products`/`inventory` فقط — **`merchants` أُزيلت من هذه المجموعة اليوم 10**، راجع الملاحظة أدناه)، (ب) قفل كامل بلا أي policy، وصول حصري عبر `service_role` (`carts`, `cart_items`, `orders`, `order_items`, `order_status_history`, **`merchants`**, `sessions`, **`audit_log`** — راجع ADR-008/ADR-009/ADR-010/ADR-012/ADR-014)، (ج) قراءة الذات فقط (`users`، **معطَّلة عملياً حالياً — راجع §6**).
- **تصحيح تاريخي (اليوم 9.5، تحقُّق حي):** إلى اليوم 9، `merchants` كانت مصنَّفة خطأً هنا كجزء من النمط (ب)، بينما كانت فعلياً في النمط (أ) — قابلة للقراءة العامة بالكامل عبر `anon` (`phone`/`owner_id` مكشوفان). اليوم 10 (`ADR-012`) نقلها فعلياً وحقيقياً للنمط (ب) — حُذفت سياسة القراءة العامة (`"Merchants are viewable by everyone"`) بعد تأكيد عدم وجود أي مستهلك فعلي لها في الكود.
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

-- 2026-09-09 (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH، scripts/password-auth-schema.sql) —
-- تنفيذ يدوي عبر Supabase SQL Editor، لم يُطبَّق على dev بعد وقت كتابة هذا التحديث.
alter table users add column password_hash text;
alter table users add column must_change_password boolean not null default false;
```
**الحالة:** `IMPLEMENTED` — RLS مفعَّل، سياسة قراءة واحدة فقط (المستخدم يقرأ بياناته الخاصة). **لا سياسات Insert/Update/Delete بعد — `OPEN_QUESTION`: من يملك حق إنشاء مستخدم جديد؟ (Auth مباشرة أم عبر service مخصص؟)**

**`password_hash`/`must_change_password` (Evidence: `PENDING_MIGRATION` — الكود/الاختبارات
الوحدوية جاهزة، الـ`ALTER TABLE` لم يُنفَّذ على dev بعد):** يُغلقان `DD-001`/`INV-AUTHN-001`
(دخول التاجر/الإدارة كان بالهاتف وحده بلا كلمة مرور). `password_hash` نصياً (صيغة `salt:hash`،
`scrypt` عبر `node:crypto`، لا تبعية جديدة) بدل عمود على `merchants` كما اقترح موجّه المهمة أصلاً —
راجع `specs/identity/PASSWORD_AUTH_SPEC.md §0` للتصحيح الكامل (دخول التاجر/الإدارة كلاهما يبحث في
`users`، لا `merchants.phone`). `nullable` عمداً (الحسابان التجريبيان القائمان بلا كلمة مرور بعد) —
منطق التطبيق يرفض أي دخول بكلمة مرور لـ`password_hash is null` (Fail Closed، لا قيد `not null`).
**يجب تشغيل `scripts/backfill-existing-owner-passwords.ts` فور تطبيق هذا الـALTER**، وإلا يُقفَل
على الحسابين التجريبيين فوراً.

**نموذج الهوية المرحلي (اليوم 12، `ADR-015`):** لا صف `users` يُنشَأ إطلاقاً لزائر يتصفّح أو يشتري كعميل عادي —
هويته عبر `carts.session_token` وحده (`ADR-008`) حتى لحظة Checkout حيث يُطلَب الهاتف فقط
(`khalilService.findOrCreateCustomerByPhone`، `ADR-009`). `phone` يبقى `not null unique` كما هو — الزائر بلا
توثيق مُحقَّق عبر غياب صف `users` أصلاً، لا عبر جعل `phone` قابلاً لـ`NULL`. `national_id`/`is_verified` (Phase 2:
توثيق هوية إجباري عند طلب الانضمام كتاجر/شركاء النجاح/تيسير) **غير موجودَين في الجدول إطلاقاً بعد** — `CONCEPTUAL`،
راجع §4 أدناه.

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
-- اليوم 10 (ADR-012): حُذفت سياسة القراءة العامة "Merchants are viewable by everyone" —
-- كانت تكشف phone/owner_id لأي anon بلا مستهلك فعلي واحد في الكود. merchants الآن مقفول
-- بالكامل بلا أي policy، نفس نمط carts/orders — وصول حصري عبر service_role.
```
**الحالة:** `IMPLEMENTED` — الجدول موجود، `tenant_id` في `products` يُشير إليه. **إعادة بناء تعريف SQL هنا استنتاجية (`INFERRED`)** من فحص الأعمدة الفعلية عبر الاستعلامات (لا نص SQL أصلي محفوظ في المستودع بعد — راجع §8 Migrations). **RLS مقفول بالكامل منذ اليوم 10** (`ADR-012`) — إلى اليوم 9 كانت قراءة عامة عبر `anon` (سياسة `"Merchants are viewable by everyone"`، تكشف `phone`/`owner_id`)، حُذفت بعد التأكد من عدم وجود أي مستهلك فعلي لها. `merchant.repository.ts` يستخدم `service_role` الآن (كان يستخدم مفتاح `anon` قبل اليوم 10 — أي استدعاء `create()` عبره كان يفشل صامتاً بلا استخدام فعلي، نفس نمط اكتشاف `ADR-009` مع `khalil`).

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
- **عزل المستأجرين في `transitionStatus()` (اليوم 10، `ADR-012`):** `TransitionOrderStatusInput.tenantId` جديد — إلزامي فعلياً (بالتحقق البرمجي لا النوع) لأي فاعل بدور تاجر (`merchant_owner`/`merchant_manager`/`employee`)، يُقارَن بـ`order.tenantId` قبل السماح بأي انتقال. **هذه فجوة كانت موجودة منذ اليوم 9 ولم تُكتشَف حينها** — لا خطر فعلي طالما تاجر واحد فقط في قاعدة البيانات، لكن بلا هذا التحقق كان أي تاجر يستطيع نظرياً تغيير حالة طلب تاجر آخر بمجرد معرفة `orderId`.

### `sessions` — Evidence: `IMPLEMENTED` (اليوم 10، `ADR-012`؛ يُستخدَم أيضاً لجلسات الإدارة منذ اليوم 11، `ADR-013`)

```sql
create table sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  tenant_id uuid references merchants(id),
  role text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table sessions
  add constraint sessions_role_check
  check (role in ('platform_admin','merchant_owner','merchant_manager','employee','customer'));
alter table sessions enable row level security;
create index sessions_user_id_idx on sessions (user_id);

-- اليوم 19 (Context Engine، ADR-018) — عمود جديد، nullable
alter table sessions add column active_persona_id uuid references user_personas(id);

-- 2026-09-09 (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH، scripts/password-auth-schema.sql) —
-- نسخة "يجب تغيير كلمة المرور" وقت إنشاء الجلسة، لا مصدر حقيقة دائم (users.must_change_password
-- هو المصدر) — تفادياً لقراءة users في كل طلب لاحق. تنفيذ يدوي، لم يُطبَّق على dev بعد.
alter table sessions add column must_change_password boolean not null default false;
```

**الحالة:** `IMPLEMENTED` — كان `CONCEPTUAL` منذ اليوم 2 ("مع تسجيل الدخول")، بُني الآن فعلياً عند أول تدفق دخول حقيقي (تسجيل دخول تاجر بالهاتف بلا كلمة مرور). يُفعِّل لأول مرة `Session`/`canAccessTenant` الموجودين في `src/core/kernel/khalil/` منذ اليوم 4 بلا أي مستهلك فعلي حتى الآن. مُتحقَّق منه حياً: دخول حقيقي بهاتف تاجر تجريبي موجود مسبقاً في القاعدة، قراءة الجلسة عبر `token`، إبطالها (`destroySession`)، ومحاولة إدراج `role` غير صحيحة (رُفضت فعلياً بـ`sessions_role_check`).

**قرارات تصميم (راجع `ADR-012` في `docs/DECISIONS.md` للتفصيل الكامل):**
- **بلا كلمة مرور عمداً** — الهاتف وحده يكفي لتسجيل الدخول (`merchantService.loginOwnerByPhone`)، بشرط أن يطابق مستخدماً بدور `merchant_owner` مرتبطاً فعلياً بتاجر نشط. هذا **ليس** Supabase Auth حقيقياً — لا تحقق هوية حقيقي (OTP/كلمة مرور)، فقط معرفة رقم الهاتف كافية. مقبول مؤقتاً لأن التاجر التجريبي الوحيد الحالي معروف، **يجب** إغلاقه قبل تسجيل تاجر ثانٍ حقيقي.
- **بلا أي policy** — قفل كامل، نفس نمط `carts`/`orders`، وصول حصري عبر `service_role` (`khalil.repository.ts`).
- **`tenant_id` قابل لـ`NULL`** — يبقى `null` لجلسات غير مرتبطة بتاجر. **مستخدَم فعلياً منذ اليوم 11** لجلسات `platform_admin` (`AdminService.loginByPhone` يمرّر `tenantId: null` دائماً عمداً — الإدارة لا تنتمي لتاجر واحد).
- **`expires_at` بدل `is_revoked`** — انتهاء صلاحية زمني ثابت (7 أيام، `TODO` غير معتمد رسمياً — نفس نمط `BR-016`) لا آلية تجديد. الإبطال الفعلي (`destroySession`، تسجيل الخروج) يحذف الصف مباشرة بدل وضع علم.
- **لا فحص جلسات منتهية دورياً (Cron/Cleanup)** — صفوف الجلسات المنتهية تبقى في الجدول إلى الأبد ما لم تُحذَف يدوياً عبر تسجيل خروج فعلي. تحسين مستقبلي غير مبنيّ.

**حسابات اختبار حية موجودة فعلياً في قاعدة البيانات (لا بيانات وهمية — تعتمد عليها اختبارات التكامل مباشرة):**
| الهاتف | الدور | ملاحظة |
|---|---|---|
| `01000000000` | `merchant_owner` | مالك "محل الدواجن التجريبي" — أُنشئ اليوم 4، يُستخدَم في اختبارات `orders`/`merchant` منذ اليوم 8 |
| `01000000001` | `platform_admin` | أُنشئ يدوياً عبر `service_role` اليوم 11 — أول حساب إدارة في المشروع، لا واجهة "Bootstrap Admin" |

### `audit_log` — Evidence: `IMPLEMENTED` (اليوم 12، `ADR-014`)

```sql
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  actor_role text not null
    check (actor_role in ('platform_admin','merchant_owner','merchant_manager','employee','customer','system','anonymous')),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
-- بلا أي policy — نفس نمط merchants/orders/sessions، وصول حصري عبر service_role (ADR-008)
create index audit_log_entity_idx on audit_log (entity_type, entity_id);
create index audit_log_created_at_idx on audit_log (created_at desc);
```

**الحالة:** `IMPLEMENTED` — كان `CONCEPTUAL` منذ اليوم 8 (راجع §4 أدناه)، بُني الآن عند يوم الأمان المخطَّط له تحديداً.
**سجل تدقيق عام خارج نطاق طلب واحد** — عكس `order_status_history` (خاص بدورة حياة الطلب فقط، يبقى كما هو بلا لمس).

**قرارات تصميم (راجع `ADR-014` في `docs/DECISIONS.md` للتفصيل الكامل):**
- **`entity_id text` لا `uuid references`** — الجدول متعدد الأشكال (تاجر، مستخدم...)، لا FK واحد ممكن. نفس فلسفة
  `products.options jsonb` (`ADR-004`): مرونة SQL، انضباط TypeScript (`AuditAction` union type في
  `src/core/modules/audit/types.ts`).
- **`actor_role` يضيف `'anonymous'`** لقيم `order_status_history` الموجودة — محاولة دخول فاشلة برقم هاتف غير
  مسجَّل ليس لها صف `users` مطابق، فلا دور معروف.
- **`action` نص حر منضبط عبر type** لا enum SQL — يتجنب هجرة `ALTER TYPE` عند كل عملية حساسة جديدة مستقبلاً.
  القيم المستخدمة فعلياً اليوم: `merchant.activated`, `merchant.deactivated`, `auth.login_success`,
  `auth.login_failed`.
- **بلا أي policy** — نفس نمط `merchants`/`carts`/`orders`/`sessions`، وصول حصري عبر `service_role`
  (`src/core/modules/audit/audit.repository.ts`).
- **لا بيانات حساسة في `metadata`** — لا كلمة مرور (غير موجودة أصلاً في التصميم)، لا Token جلسة، فقط قيم قبل/بعد
  أو رقم الهاتف/الدور المستخدَم في محاولة الدخول.

### `worlds`, `user_personas` (+ `sessions.active_persona_id`) — Evidence: `IMPLEMENTED` (اليوم 19، `ADR-018`)

```sql
create table worlds (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table worlds enable row level security;
-- بلا أي policy — قفل كامل، نفس النمط 2 (merchants/orders/carts/audit_log). تأكيد المؤسس الصريح:
-- worlds تحدد الصلاحيات، بيانات حساسة، لا قراءة عامة إطلاقاً.

create table user_personas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  world_id uuid not null references worlds(id),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table user_personas enable row level security;
-- بلا أي policy — نفس النمط 2 (شخصية = هوية، بيانات حساسة).

create unique index user_personas_default_per_world_uidx
  on user_personas (user_id, world_id) where is_default = true;
create unique index user_personas_one_default_uidx
  on user_personas (user_id) where is_default = true;

alter table sessions add column active_persona_id uuid references user_personas(id);

-- اليوم 22 (ADR-020) — توضيح نية صريح، لا تغيير سلوك (الافتراضي بلا ON DELETE هو NO ACTION، مطابق
-- عملياً لـRESTRICT هنا). راجع scripts/day22-user-personas-fk-policy.sql — IMPLEMENTED، مُتحقَّق منه حياً.
alter table user_personas drop constraint if exists user_personas_user_id_fkey;
alter table user_personas add constraint user_personas_user_id_fkey
  foreign key (user_id) references users(id) on delete restrict;
```

**الحالة:** `IMPLEMENTED` — كان `CONCEPTUAL` بانتظار بوابة قرار RFC (`docs/DECISIONS.md → CONFLICT-006`)، بُني فعلياً
اليوم 19 كأول تنفيذ حقيقي (لكن محدود جداً) لِـ`ideas/CONTEXTUAL_WORLDS_RFC.md`. **DDL طُبِّق يدوياً عبر Supabase
SQL Editor** (`scripts/day19-context-engine-schema.sql`، نفس عُرف كل جدول سابق — لا اتصال Postgres مباشر متاح
لـ Claude Code في هذا المشروع، فقط `@supabase/supabase-js` عبر PostgREST، الذي لا يُنفِّذ DDL). Seed/Backfill/التحقق
الحي نُفِّذت مباشرة بعدها عبر `scripts/day19-context-engine-seed-and-verify.ts` (`service_role`، DML بحت):
- صف واحد فقط زُرِع في `worlds`: `individuals` (الأفراد).
- Backfill: 5 مستخدمين بدور `customer` كانوا موجودين فعلياً وقت التنفيذ — كلهم حصلوا على شخصية افتراضية
  (`is_default = true`) في عالم `individuals`. **لا التاجر التجريبي ولا حساب `platform_admin`** — عمداً
  (`CONFLICT-006`).
- تحقُّق حي بمحاولات إدراج فاشلة متعمَّدة (9/9 نجحت، نفس منهجية `ADR-010`/`ADR-012`): تكرار `worlds.slug`
  (`23505`)، `user_personas.world_id`/`user_id` غير موجودين (`23503` لكليهما)، شخصية افتراضية ثانية لنفس
  (`user_id`, `world_id`) (`23505` — الفهرس الجزئي الأول)، شخصية افتراضية ثانية لنفس `user_id` عبر عالم آخر
  (`23505` — الفهرس الجزئي الثاني، عبر عالم مؤقت أُنشئ وحُذِف فوراً ضمن السكربت نفسه)، وقراءة `anon` فارغة
  تماماً على الجدولين (قفل RLS).

**قرارات تصميم (راجع `ADR-018` في `docs/DECISIONS.md` للتفصيل الكامل):**
- **`user_personas` تسمح نظرياً بأكثر من شخصية غير افتراضية لكل (`user_id`, `world_id`)** — لا `UNIQUE` كامل على
  الزوج نفسه، فقط على الشخصيات الافتراضية (`is_default = true`). هذا متعمَّد: يسمح مستقبلاً (مثال: عالم "أعمال")
  بأن يملك مستخدم واحد أكثر من شخصية داخل نفس العالم (يدير متجرين منفصلين) دون تعارض بنيوي اليوم.
- **الفهرس الجزئي الأول** (`user_personas_default_per_world_uidx`، على `(user_id, world_id)` حيث `is_default`):
  شخصية افتراضية واحدة على الأكثر لكل عالم يدخله المستخدم — يبقى صحيحاً حتى لو تعدَّدت العوالم مستقبلاً.
- **الفهرس الجزئي الثاني** (`user_personas_one_default_uidx`، على `user_id` حيث `is_default`): شخصية افتراضية
  واحدة على الأكثر لكل مستخدم عبر **كل** العوالم مجتمعة — القيد الفعلي الحاكم اليوم (عالم واحد فقط)، يضمن
  لـ`sessions.active_persona_id` افتراضياً واحداً لا لبس فيه. يُحذَف وحده عند تخفيف القاعدة مستقبلاً، الأول يبقى.
- **`sessions.active_persona_id` قابل لـ`NULL` عمداً** — لا مستهلك فعلي له بعد (لا واجهة تبديل شخصية، لا كود
  يقرأه أو يكتبه خارج هذا الـMigration). بنية تحتية دنيا فقط، بانضباط `SALSABIL_CONSTITUTION.md §1`.
- **`user_personas.user_id` → `on delete restrict` صريح (اليوم 22، `ADR-020`، `IMPLEMENTED` ومُتحقَّق
  منه حياً)** — توضيح نية لا تغيير سلوك فعلي (كان `NO ACTION` ضمنياً، يتصرف مطابقاً). تحقُّق حي: محاولة
  حذف مستخدم اختباري له شخصية رُفضت فعلياً بكود `23503`. مرتبط بـ`docs/DATABASE.md §7` (`OPEN_QUESTION`
  Soft/Hard Delete للمستخدمين عموماً) — يحسم جزءاً ضيقاً فقط، لا السؤال الأشمل.

### `posts`, `post_media`, `post_products` — Evidence: `IMPLEMENTED` (اليوم 23، `ADR-021`، BAYAN-HOME-FEED-001)

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  world_scope uuid not null references worlds(id),
  category_id uuid not null references categories(id),
  post_type text not null check (post_type in ('post', 'reel', 'product_highlight', 'offer')),
  caption text,
  is_published boolean not null default false,
  priority int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table posts enable row level security;
create policy "Public read published posts" on posts for select using (is_published = true);
create index posts_priority_created_idx on posts (priority desc, created_at desc);
create index posts_post_type_idx on posts (post_type);

create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  image_url text not null,
  display_order int not null default 0,
  link jsonb not null default '{"type":"none"}'::jsonb,
  created_at timestamptz not null default now()
);
alter table post_media enable row level security;
create policy "Public read post media" on post_media for select using (true);
create index post_media_post_id_idx on post_media (post_id, display_order);

create table post_products (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  product_id uuid not null references products(id),
  display_order int not null default 0
);
alter table post_products enable row level security;
create policy "Public read post products" on post_products for select using (true);
create index post_products_post_id_idx on post_products (post_id, display_order);
```

**الحالة:** `IMPLEMENTED` — أول تنفيذ فعلي لمحرك بيان (`CONCEPTUAL` منذ الدستور v1.0). DDL طُبِّق يدوياً عبر
Supabase SQL Editor (`scripts/day23-bayan-schema.sql`، نفس قيد عدم وجود اتصال Postgres مباشر). تحقُّق حي
(8/8 نجحت، `scripts/day23-bayan-seed-and-verify.ts`): منشور حقيقي بصورتين (رابط منتج + رابط وصفة) ومسودة
حقيقية — `anon` قرأ المنشور المنشور فقط، لا المسودة إطلاقاً (RLS `is_published = true`)؛ ثلاث محاولات
إدراج فاشلة متعمَّدة رُفضت بالضبط بالأكواد المتوقَّعة (`23503` × 2 لِـ`world_scope`/`category_id`،
`23514` لِـ`post_type`)؛ حذف منشور حذف صوره وروابط منتجاته تلقائياً (`on delete cascade`) بلا صف يتيم.
القاعدة عادت لصفر صفوف في الجداول الثلاثة بعد التنظيف.

**⚠️ `world_scope` (سياق بيانات) ≠ `data-world` (سمة CSS بصرية)** — راجع تحذير التسمية الكامل في §4
أدناه. صفحة خلاصة بيان نفسها تبقى `data-world="reef"` دائماً.

**قرارات تصميم (راجع `ADR-021` للتفصيل الكامل والبدائل المرفوضة):**
- **RLS النمط 1 (قراءة عامة)، لا النمط 2** المستخدَم لـ`worlds`/`user_personas` (`ADR-018`) — هذا محتوى
  عام يتصفحه أي زائر بلا مصادقة، لا بيانات هوية/صلاحيات حساسة.
- **`post_media`/`post_products` بسياسة `using (true)`** — بلا عمود `is_published` خاص بهما، فلا يمكن
  لـRLS وحده استبعاد صور/منتجات منشور مسودة. الاستبعاد الفعلي مسؤولية `bayan.service.ts` (طبقة التطبيق)
  — **نفس نمط عزل المستأجرين في `orders.service.ts`، `ADR-012`**، لا فجوة جديدة. أي دالة قراءة عامة
  مستقبلية على هذين الجدولين مباشرة (بدل عبر `bayan.service.ts`) تُعرِّض بيانات مسودات — نفس تحذير
  `getOrderWithItems`/`getStatusHistory` في `ADR-014`.
- **`link jsonb` على `post_media`** — نفس فلسفة `products.options` (`ADR-004`): Discriminated Union
  (`ProductLink | RecipeLink | NoLink`) مفروض TypeScript فقط، لا قيد قاعدة بيانات.
- **`world_scope uuid references worlds(id)`** — FK حقيقي، لا نص/enum حر كما ورد حرفياً في الموجّه
  الأصلي؛ انحراف طفيف موثَّق صراحة في `ADR-021`، يطابق سابقة `user_personas.world_id`.

### `posts` — امتداد DD-024 (2026-09-22/23، `video_url`/`video_source` + `post_type='article'`) — Evidence: `MIGRATION WRITTEN, NOT YET APPLIED`

```sql
-- scripts/2026-09-22-dd024-bayan-post-shapes.sql
alter table posts drop constraint if exists posts_post_type_check;
alter table posts add constraint posts_post_type_check
  check (post_type in ('post', 'reel', 'product_highlight', 'offer', 'article'));

alter table posts add column if not exists video_url text;
alter table posts add column if not exists video_source text;
```

**الحالة: `MIGRATION WRITTEN, NOT YET APPLIED`** — نفس قيد كل Migration سابقة في هذا المشروع (لا اتصال
Postgres مباشر لـClaude Code، راجع رأس `scripts/2026-09-22-dd024-bayan-post-shapes.sql`) — السكربت
جاهز، يحتاج تنفيذاً يدوياً من المؤسس عبر Supabase SQL Editor (dev أولاً) قبل أن تعمل أي كتابة/قراءة
فعلية لأشكال reel/article الجديدة على بيانات حية. الكود (repository/service/UI) مكتوب ومُختبَر وحدياً
بافتراض هذا المخطط، لكن **لم يُتحقَّق منه حياً بعد** — لا ادعاء PASS على تحقق حي في تقرير هذه المهمة.

**قرارات تصميم (`DD-024`، `docs/DECISIONS.md`):**
- **لا جدول `product_groups` جديد** — "مجموعة منتجات" (شكل 6 من الستة) تُمثَّل بإعادة استخدام
  `post_products` الموجود أصلاً (N صف بدل 1) تماماً كما "معرض صور" (شكل 3) يُمثَّل بـN صف `post_media`
  بدل 1 — كلتاهما قدرة "N عنصر مرتَّب مرتبط بمنشور" موجودة فعلاً، لا مسؤولية جديدة تبرر جدولاً مخصَّصاً
  (`AGENTS.md §2`).
- **`video_url`/`video_source` نصّان NULLABLE بلا DEFAULT** — تُستخدَمان فقط لـ`post_type='reel'`،
  `NULL` لكل الأنواع الأخرى دائماً؛ 100% متوافقة عكسياً (لا صف/كود حالي يتأثر).
- **`video_source` بلا `CHECK` قاعدة بيانات** — نفس فلسفة `post_media.link` أعلاه (Discriminated Union
  مفروض TypeScript فقط عبر `VIDEO_SOURCES`/`VideoSource` في `bayan/types.ts`) — يسمح بإضافة منصة
  فيديو جديدة مستقبلاً بلا Migration.
- **تضمين الفيديو (embed) عبر أنماط iframe عامة معروفة لكل منصة** (`src/core/modules/bayan/reel-
  embed.ts`) — لا `react-player`، لا Meta Graph API oEmbed (يحتاج App Token غير متاح لهذه الجلسة). خطر
  متبقٍ مُسجَّل صراحة في تعليق ذلك الملف: لو غيّرت منصة بنية رابط iframe العام مستقبلاً، الريل يُستبعَد
  بصمت من الخلاصة (لا خطأ حي) — مقبول لمحتوى عرض لا معاملة مالية، غير مسجَّل كـ`DECISION-DEBT` (خطر
  تافه بمعيار `AGENTS.md §12` البند 4، لا يحتاج قراراً بشرياً منفصلاً اليوم).

---

## 3.1 الجدول المركزي الموسَّع — كل جدول `IMPLEMENTED` عبر ثمانية أبعاد

> Evidence: `IMPLEMENTED` (Code Inspection مباشر لـDDL §3 أعلاه، 2026-09-06). **`Data Classification`
> تستخدم أربع فئات فقط بالتصميم** (`PUBLIC` قراءة عامة آمنة، `TENANT_PRIVATE` خاصة بطرف محدد —
> تاجر أو عميل/زائر، لا بالضرورة عبر عمود `tenant_id` حرفياً، `FINANCIAL` تتضمن مبالغ/أسعار مجمَّدة،
> `AUTH_SECRET` هوية/جلسة/صلاحيات) — عمود `Tenant Scoped؟` منفصل تماماً ويُجيب حرفياً: هل الجدول
> يحمل عمود `tenant_id` يُقيِّد الوصول بتاجر مُحدَّد؟ لا تخلط بين العمودين.

| الجدول | Owner Domain | Tenant Scoped؟ | Data Classification | RLS Pattern | FKs الفعلية | Indexes الفعلية | Delete Policy | Audit Required؟ |
|---|---|---|---|---|---|---|---|---|
| `users` | خليل (Khalil) | لا | `AUTH_SECRET` (الهاتف = بيانات اعتماد الدخول الفعلية) | قراءة الذات (`auth.uid()=id`) — **معطَّلة عملياً**، §6 | — | `PK(id)`, `UNIQUE(phone)` | غير محسوم (`OPEN_QUESTION`، §7 Soft/Hard Delete) | جزئي — `auth.login_success`/`auth.login_failed` في `audit_log` فقط، لا كل تعديل |
| `categories` | Catalog | لا | `PUBLIC` | النمط 1 (قراءة عامة) | `parent_id → categories` | `PK(id)`, `UNIQUE(slug)` | غير موثَّق صراحة | لا |
| `products` | Catalog | **نعم** (`tenant_id`) | `PUBLIC` (القراءة)، `tenant_id` نفسه بيانات عزل | النمط 1 | `category_id → categories`, `tenant_id → merchants` (nullable) | `PK(id)`, `products_tenant_id_idx`, `products_category_id_idx` — راجع §10 (TASK-07، مُنفَّذ 2026-09-14) | غير موثَّق صراحة | لا |
| `merchants` | Merchant | لا (هو كيان التاجر نفسه) | `TENANT_PRIVATE` | النمط 2 (قفل كامل منذ اليوم 10، `ADR-012`) | `owner_id` (بلا FK صريح موثَّق — تعريف الجدول نفسه `INFERRED`، §3) | `PK(id)`, `UNIQUE(slug)` | غير موثَّق صراحة | جزئي — `merchant.activated`/`merchant.deactivated` فقط |
| `inventory` | Catalog | **نعم** (عبر `product_id → merchants` بشكل غير مباشر) | `PUBLIC` (قراءة الكمية) | النمط 1 (قراءة)؛ الكتابة عبر `service_role` (`ADR-022`) | `product_id → products` (هو `PK` نفسه) | `PK(product_id)` | غير موثَّق صراحة | لا — `INV-AUDIT-001` `VIOLATED` جزئياً (خصم/استرجاع ناجح بلا سجل مباشر) |
| `carts` | Cart | لا (هوية عميل/زائر، لا تاجر) | `TENANT_PRIVATE` (خاصة بالعميل/الزائر) | النمط 2 (`ADR-008`) | `user_id → users` (nullable) | `PK(id)`, `UNIQUE(session_token)`, `UNIQUE(user_id)` | غير موثَّق صراحة | لا |
| `cart_items` | Cart | يرث `carts` | `TENANT_PRIVATE` | النمط 2 | `cart_id → carts` (**cascade**), `product_id → products` | `PK(id)`, `cart_items_cart_id_idx` — راجع §10 (TASK-07، مُنفَّذ 2026-09-14) | `cart_id`: cascade | لا |
| `orders` | Orders | **نعم** (`tenant_id`) | `FINANCIAL` | النمط 2 (`ADR-009`) | `user_id → users`, `tenant_id → merchants` | `PK(id)`, `orders_tenant_id_idx`, `orders_user_id_idx` — راجع §10 (TASK-07، مُنفَّذ 2026-09-14) | غير موثَّق صراحة | نعم (`order_status_history`) |
| `order_items` | Orders | يرث `orders` | `FINANCIAL` (`unit_price_snapshot` مجمَّد) | النمط 2 | `order_id → orders` (**cascade**), `product_id → products` | `PK(id)`, `order_items_order_id_idx` — راجع §10 (TASK-07، مُنفَّذ 2026-09-14) | `order_id`: cascade | جزئي — عبر `order_status_history`، لا سجل مباشر لبنود الطلب نفسها |
| `order_status_history` | Orders | يرث `orders` | `TENANT_PRIVATE` (سجل تشغيلي) | النمط 2 (`ADR-010`) | `order_id → orders` (**cascade**), `actor_id → users` (nullable) | `PK(id)`, `order_status_history_order_id_idx` | `order_id`: cascade | نعم — هو نفسه سجل التدقيق |
| `sessions` | خليل (Khalil) | Nullable (تاجر) / `null` (إدارة/عميل) | `AUTH_SECRET` | النمط 2 (`ADR-012`) | `user_id → users`, `tenant_id → merchants` (nullable), `active_persona_id → user_personas` (nullable) | `PK(token)`, `sessions_user_id_idx` | غير موثَّق صراحة (حذف يدوي فقط عبر `destroySession`) | جزئي — محاولات الدخول فقط، لا كل إنشاء/إبطال جلسة |
| `audit_log` | Audit | لا (نطاق منصّة عام) | `TENANT_PRIVATE` (بيانات تشغيلية/أمنية حساسة) | النمط 2 (`ADR-014`) | `actor_id → users` (nullable) | `PK(id)`, `audit_log_entity_idx`, `audit_log_created_at_idx` | غير موثَّق صراحة | هو نفسه سجل التدقيق |
| `worlds` | خليل (Context Engine) | لا | `AUTH_SECRET` (صلاحيات/هوية — تأكيد مؤسس صريح، `ADR-018`) | النمط 2 | — | `PK(id)`, `UNIQUE(slug)` | غير موثَّق صراحة | لا |
| `user_personas` | خليل (Context Engine) | لا | `AUTH_SECRET` | النمط 2 (`ADR-018`) | `user_id → users` (**restrict**، `ADR-020`), `world_id → worlds` | `PK(id)`, فهرسان جزئيان (`user_personas_default_per_world_uidx`, `user_personas_one_default_uidx`) | `user_id`: **restrict** | لا |
| `posts` | بيان (Bayan) | لا (`world_scope`، لا `tenant_id`) | `PUBLIC` (المنشورة فقط، `is_published=true`) | النمط 1 (`ADR-021`) | `world_scope → worlds`, `category_id → categories` | `PK(id)`, `posts_priority_created_idx`, `posts_post_type_idx` | غير موثَّق صراحة | لا |
| `post_media` | بيان (Bayan) | لا | `PUBLIC` (عزل المسودات بطبقة تطبيق لا RLS، راجع §6) | النمط 1 (`using(true)`) | `post_id → posts` (**cascade**) | `PK(id)`, `post_media_post_id_idx` | `post_id`: cascade | لا |
| `post_products` | بيان (Bayan) | لا | `PUBLIC` | النمط 1 (`using(true)`) | `post_id → posts` (**cascade**), `product_id → products` | `PK(id)`, `post_products_post_id_idx` | `post_id`: cascade | لا |

**"غير موثَّق صراحة" في عمود Delete Policy** يعني: لا `ON DELETE` صريح في الـDDL المسجَّل في §3 —
يتصرف Postgres افتراضياً كـ`NO ACTION` (يرفض الحذف إن وُجد صف مرتبط)، **لكن هذا لم يُسجَّل بعد
كقرار معماري صريح** بنفس انضباط `user_personas.user_id` (`ADR-020`) — فجوة توثيقية معروفة، لا خطراً
تشغيلياً فورياً (لا كود يحذف صفوف `users`/`merchants`/`orders`/... اليوم).

---

## 3.1 Phase 2 — الطلب متعدد التجار / موظفو التاجر / مكتب الدليفري — `APPROVED`، بانتظار تنفيذ يدوي (TASK-12)

عشرة جداول جديدة (`customer_orders`, `merchant_suborders`, `merchant_suborder_items`,
`merchant_suborder_status_history`, `delivery_quotes`, `merchant_staff`, `delivery_offices`,
`drivers`, `delivery_jobs`, `delivery_job_suborders`) — **مصدر الحقيقة الكامل لكل تعريف حقل/قيد/فهرس
هو `specs/orders/PHASE_2_DOMAIN_DESIGN.md` (status: `APPROVED`، اعتمده المؤسس 2026-09-15)، لا يُكرَّر
هنا تفادياً لازدواج مصدر الحقيقة.** كلها `CREATE TABLE` بحت (بلا `ALTER` على أي جدول مالي حي)، بإضافة
استثناءين آمنين فقط على جداول قائمة: توسيع قيد `users.role` ليشمل `'driver'`، وعمود جديد
`merchants.default_settlement_model` (`nullable`).

السكربت الكامل جاهز، **لم يُنفَّذ على أي بيئة بعد**: `scripts/2026-09-15-phase-2-multi-merchant-schema.sql`
(TASK-12). كل جدول جديد يُقفَل بالكامل عبر RLS بلا أي `policy` (النمط 2 — وصول حصري عبر `service_role`).
حالة هذا القسم: `APPROVED_PENDING_MANUAL_EXECUTION` — يُحدَّث إلى `IMPLEMENTED` فقط بعد تأكيد المؤسس
تنفيذ السكربت فعلياً على `dev` (ثم `staging`).

---

## 4. الجداول — CONCEPTUAL (مخطَّطة في الدستور، لم تُبنَ)

راجع `SALSABIL_CONSTITUTION.md §8` للقائمة الكاملة. أبرزها بالترتيب المتوقع للبناء:

| الجدول | ينتمي لِـ | مخطَّط لليوم | الحالة |
|---|---|---|---|
| `stores` | Tenant (طبقة فرعية تحت `merchants`) | غير مجدوَل بعد | `CONCEPTUAL` |
| `users.national_id`, `users.is_verified` (أعمدة جديدة على `users`، لا جدول منفصل) | Identity — Phase 2 من نموذج الهوية المرحلي (`ADR-015`) | يُبنى عند بدء نطاق تاجر جديد/شركاء النجاح/تيسير تحديداً — غير مجدوَل بعد | `CONCEPTUAL` — توثيق هوية إجباري فقط عند تلك الخدمات، لا للتصفح/الشراء العادي |
| `product_variant`, `sku`, `barcode`, `packaging` | Catalog (العمق الكامل) | غير مجدوَل بعد — أُجِّل لصالح Vertical Slice أولاً | `CONCEPTUAL` |

**⚠️ نفس تحذير التسمية ينطبق على `posts.world_scope` (اليوم 23، `IMPLEMENTED`، `ADR-021`):** فلتر بيانات
يشير لجدول `worlds` — أي سياق/شخصية يخص هذا المحتوى (اليوم فقط `individuals`) — لا علاقة له إطلاقاً بسمة
`data-world` البصرية. صفحة خلاصة بيان نفسها تبقى `data-world="reef"` دائماً (هي الصفحة الرئيسية لريف)،
حتى بعد بناء واجهتها بالكامل.

**⚠️ تحذير تسمية صريح — `worlds` (جدول `IMPLEMENTED`، راجع §3 أعلاه) ≠ `WorldSlug`/`WORLD_THEMES`
(`src/config/theme-registry.ts`):** المفهومان يحملان اسماً متشابهاً بالصدفة، ولا علاقة بنيوية بينهما:
- `WorldSlug`/`WORLD_THEMES` (`ADR-007`, `IMPLEMENTED` منذ اليوم 6): تعداد ثابت في الكود (`'diwan' | 'reef' | 'asrab' | ...`) لثيمات CSS **بصرية** فقط — أي لون/رمز يُطبَّق عبر `data-world="<slug>"`. لا صلة له بهوية المستخدم أو صلاحياته.
- `worlds` (جدول Supabase، `IMPLEMENTED` اليوم 19): صفوف بيانات تمثّل **سياقات هوية** (Context Packages بحسب RFC) — صف `individuals` وحده موجود اليوم (لا صف "أعمال" أو غيره، `CONFLICT-006`). يرتبط بـ`user_personas` و`sessions.active_persona_id`.
- عالم بصري واحد (مثال: `reef`) قد يُستهلَك من أكثر من صف `worlds` مستقبلاً (فرد يتصفح ريف بشخصية "فرد" مقابل شخصية "تاجر جملة")، والعكس أيضاً وارد نظرياً — **لا افتراض تطابق واحد-لواحد بين الاثنين**. أي كود مستقبلي يخلط بينهما (مثال: افتراض أن `WorldSlug` يكفي لتحديد صلاحيات المستخدم) خطأ معماري يجب رفضه.

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
| `users` | قراءة الذات فقط (`auth.uid() = id`) — **معطَّلة عملياً، راجع الملاحظة أدناه** | `IMPLEMENTED` (بلا أثر فعلي بعد) |
| `categories` | قراءة عامة للأقسام النشطة | `IMPLEMENTED` |
| `products` | قراءة عامة للمنتجات النشطة | `IMPLEMENTED` |
| `inventory` | قراءة عامة (RLS)؛ الكتابة (خصم/استرجاع) عبر `service_role` يتجاوز RLS — لا سياسة `anon` جديدة (`ADR-022`) | `IMPLEMENTED` |
| `merchants` | بلا أي policy — قفل كامل، وصول حصري عبر `service_role` (اليوم 10، `ADR-012` — كانت قراءة عامة إلى اليوم 9، راجع الملاحظة الأمنية أدناه) | `IMPLEMENTED` |
| `carts`, `cart_items` | بلا أي policy — قفل كامل لـ`anon`/`authenticated`، وصول حصري عبر `service_role` (اليوم 7، `ADR-008`) | `IMPLEMENTED` |
| `orders`, `order_items`, `order_status_history` | بلا أي policy — نفس نمط القفل الكامل (اليوم 8، `ADR-009`؛ الثالث اليوم 9، `ADR-010`) | `IMPLEMENTED` (دورة حياة كاملة) |
| `sessions` | بلا أي policy — قفل كامل، وصول حصري عبر `service_role` (اليوم 10، `ADR-012`) | `IMPLEMENTED` |
| `audit_log` | بلا أي policy — قفل كامل، وصول حصري عبر `service_role` (اليوم 12، `ADR-014`) | `IMPLEMENTED` |
| `worlds`, `user_personas` | بلا أي policy — قفل كامل، وصول حصري عبر `service_role` (اليوم 19، `ADR-018`) | `IMPLEMENTED` |
| `posts` | قراءة عامة للمنشورات المنشورة فقط (`is_published = true`) — النمط 1، لا النمط 2 (اليوم 23، `ADR-021`) | `IMPLEMENTED` |
| `post_media`, `post_products` | قراءة عامة كاملة (`using (true)`) — استبعاد محتوى المسودات مسؤولية `bayan.service.ts`، لا RLS (اليوم 23، `ADR-021`) | `IMPLEMENTED` |

**سياسات الكتابة (Insert/Update/Delete) لا تزال غير موجودة/موثَّقة على `users`/`categories`/`products` — `OPEN_QUESTION` صريح. لا كود كتابة إطلاقاً على `categories`/`products` حتى الآن (`catalog.repository.ts` قراءة فقط) — لا خطر فعلي اليوم. **قاعدة القرار المعتمدة لأي كتابة مستقبلية على هذه الجداول** (مثال: بوابة تاجر تضيف منتجاً): يُحسَم عندها تحديداً بين نقل الجدول لعميل `service_role` (نمط ب) أو سياسة كتابة مقيَّدة بالدور — لا يُقرَّر مسبقاً بلا حاجة فعلية (نفس منهج `ADR-008`).**

**`inventory` مُستثناة من `OPEN_QUESTION` أعلاه منذ 2026-09-05 (`ADR-022`):** أول كتابة فعلية عليه (`InventoryRepository.decrementIfAvailable`/`restore` — خصم/استرجاع مخزون عند Checkout، يحل سباق TOCTOU كان قائماً بين فحص `isAvailable()` والقرار المنفصل) تمر عبر `service_role` (`supabaseAdmin`)، بنفس القاعدة المذكورة أعلاه بالضبط — لا سياسة كتابة `anon` جديدة على جدول النمط 1 نفسه.

**ملاحظة أمنية (اليوم 12، `ADR-014`): سياسة `users` ميتة فعلياً.** `auth.uid() = id` لا تُطابِق شيئاً أبداً لأنه لا Supabase Auth حقيقية في المشروع بعد — الدخول بالكامل عبر جدول `sessions` المخصَّص بكوكي عشوائي، لا JWT حقيقي بمعرّف مستخدم (`specs/identity/SPEC.md`). **غير خطيرة** (تمنع القراءة بدل أن تسمح بها خطأً — فشل آمن) لكنها كانت موثَّقة سابقاً هنا وكأنها فعّالة. تبقى في مكانها بلا تغيير SQL — ستُفعَّل تلقائياً عند بناء Supabase Auth حقيقية مستقبلاً.

**✅ ملاحظة أمنية محلولة (اكتُشفت أثناء تخطيط اليوم 10، حُسمت في تنفيذه):** إلى اليوم 9، `merchants` كانت قابلة للقراءة العامة بالكامل عبر `anon` — `phone` و`owner_id` لكل تاجر مقروءان من أي طرف يملك مفتاح `anon` العام. تحقَّقنا فعلياً أن لا مستهلك واحد لهذه القراءة العامة في كامل الكود (النطاق دُفن منذ اليوم 4 بلا استخدام)، فحُذفت السياسة بالكامل (`ADR-012`) بدل تقييدها لأعمدة علنية فقط — الحل الأبسط الممكن لأن لا حاجة فعلية للقراءة العامة أصلاً حتى الآن.

**⚠️ ملاحظة أمنية (اليوم 12، `ADR-014`) — فخ كامن لا ثغرة نشطة:** `orders.service.ts` → `getOrderWithItems(orderId)` و`getStatusHistory(orderId)` بلا أي فحص تاجر داخلي (عكس `transitionStatus`). لا مستهلك واحد لهما في `src/app` اليوم فلا خطر فعلي، لكن **ممنوع** استدعاؤهما من أي Server Action/صفحة مستقبلية (مثال: صفحة تفاصيل طلب) بلا تمرير `tenantId` من الجلسة والتحقق منه أولاً، بنفس نمط `transitionStatus`. راجع التعليق التحذيري فوق التعريفين في الكود نفسه.

---

## 7. Soft Delete — Evidence: `OPEN_QUESTION`

غير محسوم بعد هل سلسبيل تعتمد Soft Delete (`deleted_at` عمود) أم Hard Delete مع `audit_log`. الأقرب لروح الدستور (§26، تدقيق كامل) هو Soft Delete + Audit، لكن **لم يُتَّخذ قرار صريح — `OPEN_QUESTION`**.

**جزء ضيق محسوم (اليوم 22، `ADR-020`):** سياسة FK الفنية لِـ`user_personas.user_id` تحديداً — `ON DELETE RESTRICT` صريح (لا `CASCADE`)، مُطبَّق ومُتحقَّق منه حياً (راجع §3 أدناه). هذا **لا يحسم** السؤال الأشمل أعلاه (Soft/Hard Delete لجدول `users` نفسه أو أي جدول آخر) — يبقى `OPEN_QUESTION` كما هو، لكنه يضمن أن أي حذف مستقبلي لمستخدم له شخصية يُواجَه بقرار صريح وقتها، لا بفقدان صامت.

---

## 8. Migrations

لا نظام Migrations رسمي (مثل Supabase CLI migrations) مُفعَّل بعد — كل SQL نُفِّذ يدوياً عبر SQL Editor. **مخاطرة موثَّقة:** هذا مقبول في مرحلة Vertical Slice الأولى، لكن يجب الانتقال لـ Migrations رسمية قبل أي عمل فريق متعدد أو قبل الإنتاج (اليوم 13، §23). يُضاف كبند في `docs/ROADMAP.md`.

**أول خطوة فعلية (اليوم 17، `ADR-017`):** `scripts/schema-setup.sql` يُعيد بناء المخطط الكامل (الاثني عشر جدولاً، بترتيب Foreign Keys صارم) كملف SQL واحد قابل للصق في مشروع Supabase جديد فارغ — يُستخدَم فعلياً لتأسيس بيئة `staging.reefam.com`. `scripts/seed-test-accounts.sql` (منفصل) يزرع حسابات/بيانات اختبار أولية بعده. **هذا ليس نظام Migrations رسمياً بعد** — لا تتبع نُسخ مخطط، لا `up`/`down`، لا أداة CLI مخصَّصة — فقط أول أثر ملموس نحوه بدل توثيق نظري فقط. راجع `ADR-017` للتفصيل الكامل، بما فيه توثيق أن أجزاءً من `schema-setup.sql` (RLS الفعلية على `categories`/`products`/`inventory`، شكل جدول `merchants`) إعادة بناء استنتاجية (`INFERRED`) لا نقلاً حرفياً موثَّقاً — لا نص SQL أصلي محفوظ لها في هذا المستودع.

**⚠️ ملاحظة نطاق:** `schema-setup.sql` (اليوم 17) أُنشئ قبل `worlds`/`user_personas` (اليوم 19) و`posts`/`post_media`/`post_products` (اليوم 23) — أي بيئة جديدة كاملة تحتاج تطبيق `scripts/schema-setup.sql` ثم `scripts/day19-context-engine-schema.sql` ثم `scripts/day22-user-personas-fk-policy.sql` ثم `scripts/day23-bayan-schema.sql` بالترتيب، لا الاكتفاء بالأول (نفس الفجوة الموثَّقة أصلاً في `ADR-018`، §3 أعلاه).

---

## 9. Schema Change Policy — سياسة أي تغيير Schema مستقبلي

> Evidence: `PROPOSED` (سياسة إجرائية جديدة، `2026-09-06` — لا تُغيِّر أي Migration سابقة بأثر رجعي).

أي `migration` جديدة (سواء عبر SQL Editor يدوياً كما هو الحال اليوم، أو عبر أداة Migrations رسمية
مستقبلاً — راجع `DD-005` أعلاه) **يجب** أن تُوثِّق الخمسة التالية **قبل** التنفيذ، بنفس مستوى
التفصيل المُطبَّق فعلياً في كل `ADR` من `ADR-008` حتى `ADR-022`:

1. **السبب (Reason)** — ما المشكلة/الميزة التي تتطلب هذا التغيير تحديداً، لا وصفاً عاماً.
2. **الجداول المتأثرة (Affected Tables)** — قائمة صريحة، بما فيها أي جدول يتأثر بشكل غير مباشر (FK جديد يشير إليه، مثلاً).
3. **التوافق العكسي (Backward Compatibility)** — هل الكود الحالي (قبل نشر التغيير) يستمر بالعمل بلا كسر إن طُبِّقت الـMigration أولاً؟ (نمط `ALTER TABLE ADD COLUMN nullable` المتَّبع فعلياً في `ADR-018`/`ADR-019` مثال آمن؛ `DROP COLUMN`/`ALTER ... NOT NULL` على عمود له بيانات حية يحتاج خطة توافق صريحة).
4. **استراتيجية التراجع (Rollback Strategy)** — كيف تُلغى هذه الـMigration لو ظهر خطأ بعد التطبيق؟ (لا نظام Migrations رسمياً يوفر `down` تلقائياً اليوم، §8 أعلاه — التراجع اليوم SQL يدوي مقابل يُكتب مسبقاً، لا يُرتجَل وقت الحادثة).
5. **تأثير الفهارس/RLS (Index/RLS Impact)** — هل يحتاج العمود/الجدول الجديد فهرساً (راجع أنماط الاستعلام الفعلية في `*.repository.ts` قبل الافتراض، وراجع §10 أدناه لفجوات قائمة فعلاً)؟ أي نمط RLS ينطبق (النمط 1 أم 2، راجع §1/§6) — **يُحسَم وقت التصميم، لا بعد النشر** (نفس قاعدة `docs/ARCHITECTURE.md §3.1`).

**أي `ADR` مستقبلي يوثِّق Migration جديدة يجب أن يغطي هذه الخمسة صراحة** — غياب أي بند منها في
الـADR نفسه يُعامَل كنقص توثيقي (`AGENTS.md §13` — No Silent State Change).

---

## 10. Known Indexing Gaps — فجوات الفهرسة المعروفة

> Evidence: `IMPLEMENTED` (Code Inspection مباشر لكل DDL في §3 أعلاه مقابل أنماط الاستعلام الفعلية
> في `*.repository.ts`، أُجري في هذه الدفعة، 2026-09-06). **⚠️ ملاحظة استمرارية مهمة:** هذه المهمة
> كُلِّفت بنسخ "جدول الفهارس الخمسة المفقودة من تقرير التدقيق الشامل سابقاً" حرفياً. بحثاً مباشراً في
> هذا المستودع (`docs/DECISIONS.md`, `docs/ROADMAP.md`, `INVARIANTS.md`, وكل ملف `.md` آخر) — **لا
> يوجد أي ملف تقرير تدقيق محفوظ بهذا المحتوى فعلياً.** `FULL-ARCHITECTURE-SECURITY-AUDIT-001` نفسه
> موصوف صراحة في `docs/DECISIONS.md → ADR-022` كـ"تقرير منفصل لا ملف في المستودع". القسم التالي
> **تحليل مستقل جديد** أُجري الآن لنفس السؤال بالضبط (فهارس مفقودة على أعمدة FK تُستهلَك فعلياً في
> استعلامات ساخنة)، **وليس نسخاً عن تقرير سابق** — راجع Task Report لهذه الدفعة تحت "Continuity Gaps
> Found" للتفصيل الكامل لفجوة عدم بقاء تقارير التدقيق كملفات دائمة.

Postgres **لا** يُنشئ فهرساً تلقائياً على عمود FK (بخلاف `PRIMARY KEY`/`UNIQUE`). الأعمدة الخمسة
التالية مراجع FK فعلية، **كانت** بلا فهرس مباشر وقت هذا التحليل (2026-09-06)، **وتُستهلَك فعلياً في
استعلامات متكررة** (لا نظرية) عبر `*.repository.ts` — **الجدول أدناه تحليل تاريخي كما وقفت عليه
الحالة وقتها؛ راجع التحديث ✅ 2026-09-14 أسفل الجدول للحالة الفعلية الحالية (مفهرَسة على `staging`
الآن):**

| # | العمود | الجدول | يُستهلَك في | الأثر التشغيلي المحتمل |
|---|---|---|---|---|
| 1 | `products.tenant_id` | `products` | `CatalogRepository.findProductsByTenant()` — كل تحميل بوابة تاجر لمنتجاته | Sequential Scan على كامل `products` عند نمو الكتالوج فعلياً (لا أثر ملحوظ اليوم بمنتج واحد) |
| 2 | `orders.tenant_id` | `orders` | `OrdersRepository` خلف `getOrdersForTenant()` — أهم استعلام في بوابة التاجر ولوحة الإدارة | نفس الأثر، يتفاقم أسرع من `products` (الطلبات تتراكم زمنياً بخلاف الكتالوج) |
| 3 | `orders.user_id` | `orders` | لا استهلاك مباشر اليوم (لا صفحة "طلباتي" للعميل)، لكن FK قائم ومرشَّح واضح لأول ميزة كهذه | لا أثر فعلي اليوم — فرصة إضافته الآن أرخص من إضافته بعد نمو بيانات حقيقي |
| 4 | `cart_items.cart_id` | `cart_items` | `CartRepository` خلف `CartService.getSummary()` — يُستدعى في كل عرض سلة تقريباً (أعلى تردد استعلام في المشروع) | أعلى أولوية عملية من الأربعة الأخرى — أكثر مسار يُستدعى تكراراً في تجربة العميل الحالية |
| 5 | `order_items.order_id` | `order_items` | `OrdersRepository` خلف `getOrderWithItems()`/`getOrderForCustomerView()` — كل عرض تفاصيل طلب (تاجر، إدارة، وصفحة تتبّع العميل الضيف) | يتفاقم مع كل طلب جديد يُضاف للجدول |

**لماذا لم تُصلَح الآن:** هذه دفعة توثيقية بقيد `NO BEHAVIOR CHANGE` صريح — إضافة فهرس عملية DDL
حقيقية على قاعدة حية (Migration، راجع §9 أعلاه)، خارج نطاق مهمة توثيق محض. **الخطر المتبقي:** منخفض
عملياً اليوم (حجم بيانات تجريبي صغير في كل الجداول الخمسة)، يتصاعد تدريجياً مع نمو عدد الطلبات
والمنتجات — لا خطر أمني، خطر أداء (Sequential Scan بدل Index Scan) عند نمو حقيقي. **لا `Decision
Debt` جديد سُجِّل لهذا في `docs/DECISIONS.md` ضمن هذه الدفعة تحديداً** — ذلك الملف خارج نطاق هذه
المهمة صراحة (راجع قيود المهمة أدناه)؛ يُوصى بتسجيله كـ`DD` في أول دفعة لاحقة تُخوَّل لمس
`docs/DECISIONS.md` — موثَّق هنا بدل تركه صامتاً (`AGENTS.md §12`، No Silent Risk Acceptance)، وفي
Task Report هذه الدفعة تحت Outstanding Risks.

**✅ تحديث 2026-09-14 (TASK-07، `docs/audits/2026-09-14-reef-v1-engineering-audit.md` §13/§22) —
مُنفَّذ فعلياً على كلا البيئتين (`dev` و`staging`)، مُتحقَّق منه حياً:** الستة فهارس في
`scripts/2026-09-14-add-missing-indexes.sql` (`products_tenant_id_idx`, `products_category_id_idx`,
`orders_tenant_id_idx`, `orders_user_id_idx`, `cart_items_cart_id_idx`, `order_items_order_id_idx`)
نُفِّذت يدويًا عبر Supabase SQL Editor على **`salsabil-staging`** (تأكَّد وجودها عبر استعلام
`pg_indexes` المُرفَق نهاية السكربت) **و`salsabil-core` (dev)** (تأكَّد وجودها/استخدامها عبر
`EXPLAIN ANALYZE` حي — `Index Scan` فعلي على `products_category_id_idx` على الأقل، لا `Seq Scan`) —
لا افتراضًا في كلتا الحالتين. الجدول أعلاه في هذا القسم (الخمسة الأصلية) والجدول الموسَّع في `§3.1`
يعكسان الآن الحالة الفعلية الجديدة لهذه الأعمدة الستة (`indexes الفعلية`، لا "بلا فهرس") على كلا
البيئتين. **الخطر المذكور أعلاه (Sequential Scan عند نمو البيانات) أُغلِق فعليًا لهذه الأعمدة على
كلا البيئتين** — مؤكَّد أداءً (لا بنيويًا فقط) على `dev` عبر `Index Scan` حي على الأقل لفهرس واحد
(`products_category_id_idx`)؛ الفهارس الخمسة الباقية مؤكَّدة الوجود بنيويًا (`pg_indexes`/DDL) على
الحالتين، بلا قياس `EXPLAIN ANALYZE` مُبلَّغ صراحة لكل واحد منها على حدة — استعلامات `EXPLAIN
ANALYZE` الجاهزة في نهاية السكربت متاحة لذلك متى احتاج المؤسس تأكيدًا إضافيًا لكل فهرس على حدة.
`products.category_id` يبقى **إضافة خارج قائمة التدقيق الأصلية** — راجع تعليقات السكربت نفسه
للتبرير الكامل بمسار كود (`src/app/(reef)/[category]/page.tsx:33`).
