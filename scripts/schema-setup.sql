-- scripts/schema-setup.sql
-- تأسيس المخطط الكامل (Schema) لمشروع Supabase جديد نظيف — للاستخدام في بيئة staging/إنتاج
-- منفصلة تماماً عن بيانات التطوير المحلية (PRODUCTION-PREP-001).
--
-- ⚠️ هذا ليس نظام Migrations رسمياً — أول خطوة عملية نحوه فقط (راجع docs/SECURITY.md
-- OPEN_QUESTIONS بند 8، وdocs/DATABASE.md §8). كل جدول أدناه يعكس **الحالة الحية الحالية**
-- للمخطط كما وُثِّقت في docs/DATABASE.md §3 (تحقُّق حي، لا افتراضات) — التعليقات فوق كل جدول
-- تُحيل لليوم/الـADR الذي أنشأه أو عدَّله، لكن الـSQL نفسه هو شكل الجدول *النهائي* اليوم، لا إعادة
-- تشغيل تاريخي حرفي (مثال: products.tenant_id أُضيف عبر ALTER TABLE في اليوم 4 تاريخياً، لكنه هنا
-- مُدرَج مباشرة داخل CREATE TABLE لأن هذا تأسيس مشروع جديد لا إعادة لعب تاريخ الهجرات).
--
-- الترتيب صارم حسب Foreign Keys: users → merchants → categories → products → inventory →
-- carts → cart_items → orders → order_items → order_status_history → sessions → audit_log.
--
-- طريقة التشغيل: الصق الملف كاملاً في Supabase Dashboard → SQL Editor → Run، على مشروع Supabase
-- **جديد وفارغ تماماً**. لا يُشغَّل هذا الملف على مشروع يحوي بيانات بالفعل (لا حماية IF NOT EXISTS
-- على معظم الجداول عمداً — فشل صريح أفضل من تجاوز صامت لمخطط قائم مختلف).
--
-- بعد هذا الملف: شغّل scripts/seed-test-accounts.sql لحسابات الاختبار الأولية (منفصل عمداً —
-- بيانات وهمية، لا مخطط).

-- ============================================================================
-- users — اليوم 2 (ربط Supabase الفعلي)
-- ============================================================================
create table users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text unique not null,
  email text,
  role text not null default 'customer'
    check (role in ('platform_admin', 'merchant_owner', 'merchant_manager', 'employee', 'customer')),
  created_at timestamptz not null default now()
);

alter table users enable row level security;

-- سياسة قراءة الذات فقط — ⚠️ معطَّلة عملياً اليوم (auth.uid() لا يُطابِق شيئاً لأنه لا Supabase
-- Auth حقيقية في المشروع بعد؛ الدخول بالكامل عبر جدول sessions المخصَّص أدناه، لا JWT حقيقي).
-- غير خطيرة (فشل آمن يمنع القراءة بدل السماح بها خطأً) — ستُفعَّل تلقائياً عند بناء Auth حقيقية
-- لاحقاً. راجع docs/DATABASE.md §6، docs/SECURITY.md §2/§4.
create policy "Users can read own data" on users for select using (auth.uid() = id);

-- سياسات Insert/Update/Delete لا تزال OPEN_QUESTION (docs/SECURITY.md قائمة الأسئلة، بند 2) —
-- الكتابة اليوم تمر حصرياً عبر service_role (khalilRepository)، لا سياسة RLS مقصودة بعد.


-- ============================================================================
-- merchants — اليوم 4 (بوابة التاجر)، أُعيد بناء RLS في اليوم 10 (ADR-012)
-- إعادة بناء تعريف SQL هنا استنتاجية جزئياً (INFERRED من فحص الأعمدة الفعلية، نفس تحفُّظ
-- docs/DATABASE.md §3 — لا نص SQL أصلي محفوظ في المستودع لهذا الجدول تحديداً)
-- ============================================================================
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
-- بلا أي policy — قفل كامل، وصول حصري عبر service_role (merchant.repository.ts). كانت قراءة
-- عامة إلى اليوم 9 (phone/owner_id مكشوفان لـanon)، حُذفت في اليوم 10 بعد تأكيد عدم وجود مستهلك
-- فعلي. راجع ADR-012.


-- ============================================================================
-- categories — اليوم 3 (محرك المنتج)
-- ============================================================================
create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  parent_id uuid references categories(id),
  display_order int not null default 0,
  is_active boolean not null default true
);

alter table categories enable row level security;

-- ⚠️ إعادة بناء (INFERRED): docs/DATABASE.md §3 لا يعرض نص السياسة الأصلي حرفياً لهذا الجدول،
-- فقط يوثّق سلوكها (§6: "قراءة عامة للأقسام النشطة" IMPLEMENTED). أُعيد بناؤها هنا لتطابق هذا
-- السلوك الموثَّق. سياسات الكتابة (Insert/Update/Delete) لا تزال OPEN_QUESTION — لا كود كتابة
-- عليها إطلاقاً حتى اليوم 12 (مراجعة ADR-014 المؤكَّدة حياً)، فلا policy كتابة هنا.
create policy "Public read active categories" on categories for select using (is_active = true);


-- ============================================================================
-- products — اليوم 3 (محرك المنتج)، tenant_id أُضيف اليوم 4 (Multi-Tenancy)
-- options jsonb بدل أعمدة ثابتة/EAV — قرار تصميم متعمَّد (ADR-004)
-- ============================================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  tenant_id uuid references merchants(id), -- nullable — منتجات لم تُربَط بتاجر بعد تبقى null
  name text not null,
  description text,
  base_price numeric(10, 2) not null check (base_price >= 0),
  unit text not null default 'piece',
  image_url text,
  options jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table products enable row level security;

-- ⚠️ إعادة بناء (INFERRED) — نفس تحفُّظ categories أعلاه بالضبط. راجع docs/DATABASE.md §6.
create policy "Public read active products" on products for select using (is_active = true);


-- ============================================================================
-- inventory — اليوم 3 (محرك المنتج)، يُستهلَك للفحص فقط منذ اليوم 7 (لا حجز)
-- ============================================================================
create table inventory (
  product_id uuid primary key references products(id),
  quantity_available int not null default 0 check (quantity_available >= 0),
  updated_at timestamptz not null default now()
);

alter table inventory enable row level security;

-- ⚠️ إعادة بناء (INFERRED) — "قراءة عامة" بلا قيد "نشط" (لا عمود is_active في هذا الجدول أصلاً).
create policy "Public read inventory" on inventory for select using (true);


-- ============================================================================
-- carts, cart_items — اليوم 7 (السلة، ADR-008)
-- بلا عمود سعر إطلاقاً — يُحسَب حياً عبر catalogService.calculatePrice دائماً (docs/SECURITY.md قاعدة 2)
-- ============================================================================
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
-- بلا أي policy — قفل كامل. سلة الزائر تُكتَب بلا مصادقة حقيقية (session_token عشوائي)،
-- فـRLS مسموح لـanon لا يوفّر حماية فعلية أصلاً هنا (docs/SECURITY.md قاعدة 3/5، ADR-008).

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
-- بلا أي policy — نفس نمط carts تماماً.


-- ============================================================================
-- orders, order_items, order_status_history
-- orders/order_items: اليوم 8 (Checkout، ADR-009) — دورة الحياة الكاملة + order_status_history: اليوم 9 (ADR-010)
-- ============================================================================
create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  tenant_id uuid not null references merchants(id),
  status text not null default 'pending',
  payment_method text not null default 'cash_on_delivery',
  delivery_address jsonb not null,
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check
    check (status in ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'))
);

alter table orders enable row level security;
-- بلا أي policy — قفل كامل، وصول حصري عبر service_role. عزل المستأجرين (تاجر لا يرى/يُغيّر طلب
-- تاجر آخر) مُطبَّق بالكامل في طبقة التطبيق (orders.service.ts → transitionStatus)، لا RLS —
-- راجع docs/SECURITY.md §3 وADR-012.

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  selection jsonb not null default '{}'::jsonb,
  unit_price_snapshot numeric(10, 2) not null check (unit_price_snapshot >= 0), -- يُجمَّد للأبد عند الإنشاء، عكس cart_items تماماً
  created_at timestamptz not null default now()
);

alter table order_items enable row level security;

create table order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_role text not null,
  actor_id uuid references users(id), -- nullable — null عند actor_role = 'system'
  note text,
  created_at timestamptz not null default now(),
  constraint order_status_history_to_status_check
    check (to_status in ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  constraint order_status_history_from_status_check
    check (from_status is null or from_status in ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled')),
  constraint order_status_history_actor_role_check
    check (actor_role in ('platform_admin', 'merchant_owner', 'merchant_manager', 'employee', 'customer', 'system'))
);

alter table order_status_history enable row level security;
create index order_status_history_order_id_idx on order_status_history (order_id);


-- ============================================================================
-- sessions — اليوم 10 (دخول التاجر بالهاتف، ADR-012)، تُستخدَم أيضاً لجلسات الإدارة منذ اليوم 11
-- ============================================================================
create table sessions (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  tenant_id uuid references merchants(id), -- null لجلسات customer/platform_admin (لا تنتمي لتاجر واحد)
  role text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint sessions_role_check
    check (role in ('platform_admin', 'merchant_owner', 'merchant_manager', 'employee', 'customer'))
);

alter table sessions enable row level security;
create index sessions_user_id_idx on sessions (user_id);
-- بلا أي policy — قفل كامل، وصول حصري عبر khalil.repository.ts. بلا كلمة مرور عمداً (الهاتف وحده
-- يكفي — راجع ADR-012 للتبرير الكامل والقيد الموثَّق).


-- ============================================================================
-- audit_log — اليوم 12 (يوم الأمان الكامل، ADR-014)
-- سجل تدقيق عام خارج نطاق طلب واحد — عكس order_status_history (خاص بدورة حياة الطلب فقط)
-- ============================================================================
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references users(id),
  actor_role text not null
    check (actor_role in ('platform_admin', 'merchant_owner', 'merchant_manager', 'employee', 'customer', 'system', 'anonymous')),
  action text not null,
  entity_type text not null,
  entity_id text, -- لا uuid references — الجدول متعدد الأشكال (تاجر، مستخدم...)، نفس فلسفة products.options (ADR-004)
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table audit_log enable row level security;
-- بلا أي policy — نفس نمط merchants/orders/sessions، وصول حصري عبر service_role (audit.repository.ts)
create index audit_log_entity_idx on audit_log (entity_type, entity_id);
create index audit_log_created_at_idx on audit_log (created_at desc);

-- ============================================================================
-- نهاية المخطط — 12 جدولاً، مطابق لعدد الجداول الحية الموثَّق في docs/DATABASE.md
-- ============================================================================
