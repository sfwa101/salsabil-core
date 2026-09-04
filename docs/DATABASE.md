---
title: مرجع قاعدة البيانات
status: ACTIVE
version: 1.10
last_updated: 2026-09-05
owner: المؤسس (أبوحتاب) + Claude
source_of_truth: Supabase Project الفعلي (للجداول المنفَّذة) + هذا الملف (للتخطيط)
---

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
```
**الحالة:** `IMPLEMENTED` — RLS مفعَّل، سياسة قراءة واحدة فقط (المستخدم يقرأ بياناته الخاصة). **لا سياسات Insert/Update/Delete بعد — `OPEN_QUESTION`: من يملك حق إنشاء مستخدم جديد؟ (Auth مباشرة أم عبر service مخصص؟)**

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
| `inventory` | قراءة عامة | `IMPLEMENTED` |
| `merchants` | بلا أي policy — قفل كامل، وصول حصري عبر `service_role` (اليوم 10، `ADR-012` — كانت قراءة عامة إلى اليوم 9، راجع الملاحظة الأمنية أدناه) | `IMPLEMENTED` |
| `carts`, `cart_items` | بلا أي policy — قفل كامل لـ`anon`/`authenticated`، وصول حصري عبر `service_role` (اليوم 7، `ADR-008`) | `IMPLEMENTED` |
| `orders`, `order_items`, `order_status_history` | بلا أي policy — نفس نمط القفل الكامل (اليوم 8، `ADR-009`؛ الثالث اليوم 9، `ADR-010`) | `IMPLEMENTED` (دورة حياة كاملة) |
| `sessions` | بلا أي policy — قفل كامل، وصول حصري عبر `service_role` (اليوم 10، `ADR-012`) | `IMPLEMENTED` |
| `audit_log` | بلا أي policy — قفل كامل، وصول حصري عبر `service_role` (اليوم 12، `ADR-014`) | `IMPLEMENTED` |
| `worlds`, `user_personas` | بلا أي policy — قفل كامل، وصول حصري عبر `service_role` (اليوم 19، `ADR-018`) | `IMPLEMENTED` |
| `posts` | قراءة عامة للمنشورات المنشورة فقط (`is_published = true`) — النمط 1، لا النمط 2 (اليوم 23، `ADR-021`) | `IMPLEMENTED` |
| `post_media`, `post_products` | قراءة عامة كاملة (`using (true)`) — استبعاد محتوى المسودات مسؤولية `bayan.service.ts`، لا RLS (اليوم 23، `ADR-021`) | `IMPLEMENTED` |

**سياسات الكتابة (Insert/Update/Delete) لا تزال غير موجودة/موثَّقة على `users`/`categories`/`products`/`inventory` — `OPEN_QUESTION` صريح. مراجعة اليوم 12 تحقَّقت حياً: لا كود كتابة إطلاقاً على `categories`/`products`/`inventory` حتى الآن (`catalog.repository.ts`/`inventory.repository.ts` قراءة فقط) — لا خطر فعلي اليوم. **قاعدة القرار المعتمدة لأي كتابة مستقبلية على هذه الجداول** (مثال: بوابة تاجر تضيف منتجاً): يُحسَم عندها تحديداً بين نقل الجدول لعميل `service_role` (نمط ب) أو سياسة كتابة مقيَّدة بالدور — لا يُقرَّر مسبقاً بلا حاجة فعلية (نفس منهج `ADR-008`).**

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
