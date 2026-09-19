-- scripts/2026-09-15-phase-2-multi-merchant-schema.sql
-- TASK-12 (REEF V1) — تنفيذ الجداول العشرة المعتمَدة في Phase 2 (الطلب متعدد التجار،
-- موظفو التاجر، مكتب الدليفري المبسَّط)، حرفياً وفق specs/orders/PHASE_2_DOMAIN_DESIGN.md
-- (status: APPROVED — اعتمده المؤسس نهائياً بتاريخ 2026-09-15).
-- راجع AGENTS.md §17 (Guardian Matrix — DB Schema DEEP لجداول بيانات مالية/هوية) و
-- docs/audits/2026-09-14-reef-v1-engineering-audit.md §13/§22 (DD-005 — لا نظام Migrations رسمي بعد).
--
-- ⚠️ لم يُنفَّذ هذا السكربت تلقائيًا. يجب مراجعته وتشغيله يدويًا
-- عبر Supabase SQL Editor من قبل المؤسس، على بيئة salsabil-core (dev)
-- أولاً ثم salsabil-staging، حسب الممارسة الحالية للمشروع (DD-005 مفتوحة).
-- هذا السكربت Schema فقط — لا يُفعِّل أي مسار Checkout جديد؛ الكود
-- التطبيقي الذي يستهلك هذه الجداول مهمة منفصلة لاحقة (TASK-13).
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع (نفس قيد TASK-07) — لا DDL نُفِّذ
-- ولا حاول أي اتصال بقاعدة بيانات حية أثناء إعداد هذا الملف. هذا الملف نص SQL فقط، بانتظار
-- تنفيذ يدوي.
--
-- ضمانات هذا الملف (راجعها بنفسك قبل التشغيل، لا تُصدِّقها فقط):
--   - كل CREATE TABLE أدناه IF NOT EXISTS — تشغيله مرتين لا يسبب خطأ ولا يُعيد إنشاء شيء.
--   - قيود CHECK المتعددة الأعمدة (status/actor_role/from_status/to_status) التي وردت في نثر
--     التصميم كـ ALTER TABLE ADD CONSTRAINT منفصلة بعد CREATE TABLE، طُويت هنا داخل تعريف
--     العمود نفسه ضمن CREATE TABLE IF NOT EXISTS — نفس الأسماء، نفس القيم، حرفياً؛ فرق تنظيمي
--     بحت (لضمان قابلية إعادة التشغيل بأمان، لأن ALTER TABLE ADD CONSTRAINT منفصلة تفشل على
--     التشغيلة الثانية بـ"constraint already exists" إن أُبقيت خارج CREATE TABLE IF NOT EXISTS).
--   - كل CREATE INDEX أدناه IF NOT EXISTS.
--   - لا DROP لأي شيء. لا UPDATE/DELETE/INSERT إطلاقاً. الاستثناءان الوحيدان على جداول حية
--     (§8 بند 1 من الوثيقة) هما التعديلان الآمنان في نهاية الملف (users.role،
--     merchants.default_settlement_model)، كلاهما مطويان في DO $$ ... $$ ليكونا آمنين لإعادة
--     التشغيل (PostgreSQL لا يدعم ADD CONSTRAINT IF NOT EXISTS مباشرة لقيود CHECK).
--   - كل جدول جديد أدناه: enable row level security بلا أي policy (النمط 2 — قفل كامل، وصول
--     حصري عبر service_role)، مطابقاً حرفياً لما ورد بجانب كل تعريف في
--     specs/orders/PHASE_2_DOMAIN_DESIGN.md.

-- ============================================================================
-- 1) customer_orders — راجع §2.3 من PHASE_2_DOMAIN_DESIGN.md
-- ============================================================================
create table if not exists customer_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  delivery_address jsonb not null,          -- نفس شكل orders.delivery_address ({line1, city, notes?})
  payment_method text not null default 'cash_on_delivery',
  subtotal_snapshot numeric(10,2) not null check (subtotal_snapshot >= 0),
  delivery_fee_snapshot numeric(10,2),      -- من delivery_quotes عند Checkout — راجع §5
  total_snapshot numeric(10,2) not null check (total_snapshot >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table customer_orders enable row level security;
-- بلا أي policy — النمط 2 (FINANCIAL/TENANT_PRIVATE)، نفس نمط orders، وصول حصري عبر service_role
-- لا عمود overall_status — مُشتَق دوماً حياً (§3 من الوثيقة)، غير مخزَّن.
-- subtotal_snapshot/total_snapshot مُجمَّدان لحظة الإنشاء، لا يُعاد حسابهما لاحقاً حتى عند إلغاء جزئي.

-- ============================================================================
-- 2) merchant_suborders — راجع §2.4 من PHASE_2_DOMAIN_DESIGN.md
-- status يعيد استخدام ORDER_TRANSITIONS/ORDER_TRANSITION_ACTORS من
-- src/core/modules/orders/types.ts حرفياً بلا أي تعديل.
-- ⚠️ نفس القائمة السبعة حرفياً من ORDER_STATUSES — لا حالة جديدة، لا حالة محذوفة. أي تعديل
-- مستقبلي على هذه القائمة يبدأ من types.ts أولاً (نفس قاعدة specs/orders/README.md).
-- ============================================================================
create table if not exists merchant_suborders (
  id uuid primary key default gen_random_uuid(),
  customer_order_id uuid not null references customer_orders(id),
  user_id uuid not null references users(id),
  tenant_id uuid not null references merchants(id),
  status text not null default 'pending'
    constraint merchant_suborders_status_check
    check (status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  settlement_model text not null   -- مُجمَّد من merchants.default_settlement_model وقت الإنشاء — راجع §7.3
    check (settlement_model in ('driver_fronted','reef_collected')),
  payment_method text not null default 'cash_on_delivery',
  total numeric(10,2) not null check (total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table merchant_suborders enable row level security;
-- بلا أي policy — نفس نمط orders (ADR-009)، وصول حصري عبر service_role
create index if not exists merchant_suborders_customer_order_id_idx on merchant_suborders (customer_order_id);
create index if not exists merchant_suborders_tenant_id_idx on merchant_suborders (tenant_id);

-- ============================================================================
-- 3) merchant_suborder_items (مرآة order_items) — راجع §2.5 من PHASE_2_DOMAIN_DESIGN.md
-- نسخة طبق الأصل من order_items — order_id استُبدل بـmerchant_suborder_id فقط.
-- ============================================================================
create table if not exists merchant_suborder_items (
  id uuid primary key default gen_random_uuid(),
  merchant_suborder_id uuid not null references merchant_suborders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null check (quantity > 0),
  selection jsonb not null default '{}'::jsonb,
  unit_price_snapshot numeric(10,2) not null check (unit_price_snapshot >= 0),
  created_at timestamptz not null default now()
);
alter table merchant_suborder_items enable row level security;
create index if not exists merchant_suborder_items_suborder_id_idx on merchant_suborder_items (merchant_suborder_id);

-- ============================================================================
-- 4) merchant_suborder_status_history (مرآة order_status_history) — راجع §2.6 من
-- PHASE_2_DOMAIN_DESIGN.md
-- ⚠️ قيد جديد لم يكن موجوداً على order_status_history: note is not null عند to_status='cancelled'
-- — قرار معتمَد صراحة من المؤسس (§10.1 بند 5). لا يُطبَّق بأثر رجعي على order_status_history
-- القديم — ذلك الجدول يبقى بلا هذا القيد، بلا تغيير.
-- ============================================================================
create table if not exists merchant_suborder_status_history (
  id uuid primary key default gen_random_uuid(),
  merchant_suborder_id uuid not null references merchant_suborders(id) on delete cascade,
  from_status text
    constraint merchant_suborder_status_history_from_status_check
    check (from_status is null or from_status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  to_status text not null
    constraint merchant_suborder_status_history_to_status_check
    check (to_status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  actor_role text not null
    constraint merchant_suborder_status_history_actor_role_check
    check (actor_role in ('platform_admin','merchant_owner','merchant_manager','employee','customer','system')),
  actor_id uuid references users(id),
  note text,
  created_at timestamptz not null default now(),
  constraint merchant_suborder_status_history_cancel_note_check
    check (to_status <> 'cancelled' or note is not null)
);
alter table merchant_suborder_status_history enable row level security;
create index if not exists merchant_suborder_status_history_suborder_id_idx on merchant_suborder_status_history (merchant_suborder_id);

-- ============================================================================
-- 5) delivery_quotes — راجع §5 من PHASE_2_DOMAIN_DESIGN.md
-- لا خوارزمية حساب هنا — fee قيمة نهائية مُدخَلة يدوياً أو بقاعدة V1 بسيطة غير مُصمَّمة هنا.
-- علاقة 1:1 مع customer_order (UNIQUE) — عرض واحد نهائي فقط لكل طلب في V1.
-- ============================================================================
create table if not exists delivery_quotes (
  id uuid primary key default gen_random_uuid(),
  customer_order_id uuid not null unique references customer_orders(id),
  fee numeric(10,2) not null check (fee >= 0),
  pickup_point_count int not null check (pickup_point_count >= 1),
  consolidated boolean not null default false,
  computed_by text not null check (computed_by in ('manual','simple_rule')),
  created_at timestamptz not null default now()
);
alter table delivery_quotes enable row level security;
-- بلا أي policy — FINANCIAL، نفس النمط 2

-- ============================================================================
-- 6) merchant_staff — راجع §6 من PHASE_2_DOMAIN_DESIGN.md
-- قرار معتمَد (§10.1 بند 1): لا صف owner إطلاقاً — merchants.owner_id/users.role='merchant_owner'
-- يبقيان المصدر الرسمي الوحيد لصلاحية owner. role مقصور بنيوياً على 'staff' فقط في V1 (بعد
-- التبسيط المعتمَد من ('owner','staff') إلى ('staff') فقط). الفهرس الجزئي
-- merchant_staff_one_owner_per_tenant_uidx المقترَح سابقاً أُلغي بالكامل (كان سيبقى قيداً ميتاً
-- لا يُفعَّل أبداً بما أن لا صف owner يُنشأ أصلاً).
-- ============================================================================
create table if not exists merchant_staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references merchants(id),
  user_id uuid not null references users(id),  -- نفس جدول users الموحَّد — لا هوية منفصلة
  role text not null check (role in ('staff')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint merchant_staff_tenant_user_unique unique (tenant_id, user_id)
);
alter table merchant_staff enable row level security;
create index if not exists merchant_staff_tenant_id_idx on merchant_staff (tenant_id);
-- بلا أي policy — AUTH_SECRET/TENANT_PRIVATE، النمط 2

-- ============================================================================
-- 7) delivery_offices — راجع §7.1 من PHASE_2_DOMAIN_DESIGN.md
-- نفس شكل merchants.owner_id/users.role حرفياً — سلسبيل تتعاقد مع الشركة ككيان واحد (owner_id)،
-- لا مع كل سائق فردياً.
-- ============================================================================
create table if not exists delivery_offices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id),
  name text not null,
  phone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table delivery_offices enable row level security;
-- بلا أي policy — النمط 2 (نفس merchants)

-- ============================================================================
-- 8) drivers — راجع §7.1 من PHASE_2_DOMAIN_DESIGN.md
-- is_active = عضوية نشطة، لا "متاح الآن" لحظياً (لا Real-time Presence في V1، راجع §9).
-- ============================================================================
create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references delivery_offices(id),
  user_id uuid not null references users(id),  -- نفس جدول users الموحَّد
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint drivers_office_user_unique unique (office_id, user_id)
);
alter table drivers enable row level security;
create index if not exists drivers_office_id_idx on drivers (office_id);

-- ============================================================================
-- 9) delivery_jobs — راجع §7.2 من PHASE_2_DOMAIN_DESIGN.md
-- customer_order_id: نطاق واحد لكل عميل، لا تجميع رحلات عبر عملاء مختلفين — قرار معتمَد (§10.1 بند 4).
-- office_id/driver_id: nullable حتى الإسناد اليدوي — لا خوارزمية ترشيح/توزيع (راجع §9 "ما لا نبنيه الآن").
-- ⚠️ تحذير تسمية صريح من الوثيقة: القيمتان 'out_for_delivery'/'delivered' هنا تتطابقان لفظياً مع
-- قيمتين في merchant_suborders.status لكنهما عمودان/جدولان منفصلان تماماً بلا أي FK مباشر بينهما
-- على مستوى القيمة نفسها — delivery_jobs.status يتتبّع رحلة التوصيل الفعلية،
-- merchant_suborders.status يتتبّع دورة تجهيز التاجر. العلاقة بين الاثنين OPEN_QUESTION صريح
-- (§10.2 بند 1) — غير محسومة، غير مبنية هنا.
-- ============================================================================
create table if not exists delivery_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_order_id uuid not null references customer_orders(id),
  office_id uuid references delivery_offices(id),
  driver_id uuid references drivers(id),
  status text not null default 'ready_for_pickup'
    constraint delivery_jobs_status_check
    check (status in ('ready_for_pickup','driver_assigned','picking_up','out_for_delivery','delivered','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table delivery_jobs enable row level security;
create index if not exists delivery_jobs_customer_order_id_idx on delivery_jobs (customer_order_id);

-- ============================================================================
-- 10) delivery_job_suborders — راجع §7.2 من PHASE_2_DOMAIN_DESIGN.md
-- علاقة Many-to-Many حقيقية (نفس نمط post_products، ADR-021) — تسمح بنياً بتقسيم يدوي مستقبلي
-- لرحلة توصيل واحدة عبر أكثر من merchant_suborder، بلا إعادة تصميم — التقسيم نفسه غير مبني هنا.
-- ============================================================================
create table if not exists delivery_job_suborders (
  id uuid primary key default gen_random_uuid(),
  delivery_job_id uuid not null references delivery_jobs(id) on delete cascade,
  merchant_suborder_id uuid not null references merchant_suborders(id),
  constraint delivery_job_suborders_unique unique (delivery_job_id, merchant_suborder_id)
);
alter table delivery_job_suborders enable row level security;
create index if not exists delivery_job_suborders_merchant_suborder_id_idx on delivery_job_suborders (merchant_suborder_id);

-- ============================================================================
-- الاستثناءان الآمنان على جداول قائمة — راجع §8 بند 1 من PHASE_2_DOMAIN_DESIGN.md
-- ============================================================================

-- 11) توسيع قيد users.role ليشمل 'driver' (إضافي، لا يكسر أي صف قائم)
-- القيد الأصلي (scripts/schema-setup.sql:30-31) بلا اسم صريح في تعريفه — الاسم الافتراضي الذي
-- يولّده PostgreSQL لقيد CHECK غير مسمّى على عمود واحد هو users_role_check (نمط
-- <table>_<column>_check). الكتلة أدناه idempotent: تتحقق أولاً هل 'driver' مذكورة فعلاً ضمن
-- تعريف القيد الحالي قبل أي DROP/ADD — تشغيلها مرتين آمن.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_role_check'
      and conrelid = 'users'::regclass
      and pg_get_constraintdef(oid) ilike '%driver%'
  ) then
    alter table users drop constraint if exists users_role_check;
    alter table users add constraint users_role_check
      check (role in ('platform_admin','merchant_owner','merchant_manager','employee','customer','driver'));
  end if;
end $$;

-- 12) إضافة merchants.default_settlement_model (nullable) — راجع §7.3 من PHASE_2_DOMAIN_DESIGN.md
-- ⚠️ ملاحظة تفسير صريحة (راجع القسم 4 من تقرير المهمة): الوثيقة تُسمّي هذا العمود وتصف استهلاكه
-- بدقة (يُحدَّد لكل تاجر عند تفعيله، ثم يُنسَخ حرفياً إلى merchant_suborders.settlement_model وقت
-- إنشاء كل suborder) لكن لا تكتب DDL كاملاً له صراحة (نوع العمود/قيد CHECK). بما أن الوثيقة تصفه
-- كمصدر يُنسَخ حرفياً لعمود settlement_model الذي يحمل CHECK محدد بقيمتين فقط، اختير هنا نفس
-- النوع (text) ونفس قيد CHECK لضمان عدم إمكانية تجميد قيمة غير صالحة لاحقاً — لا قيمة منطقية
-- لهذا العمود خارج تلك المجموعة أصلاً. هذا استنتاج مباشر من الاستخدام الموصوف، لا اختراع حقل/قاعدة
-- عمل جديدة.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'merchants' and column_name = 'default_settlement_model'
  ) then
    alter table merchants add column default_settlement_model text
      check (default_settlement_model in ('driver_fronted','reef_collected'));
  end if;
end $$;

-- ============================================================================
-- تحقق نهائي — شغّل هذا الاستعلام بعد التنفيذ اليدوي أعلاه للتأكد من نجاح إنشاء الجداول العشرة
-- بلمسة واحدة (يجب أن يعيد عشرة أسطر بالضبط):
select tablename from pg_tables
where schemaname = 'public'
  and tablename in (
    'customer_orders', 'merchant_suborders', 'merchant_suborder_items',
    'merchant_suborder_status_history', 'delivery_quotes', 'merchant_staff',
    'delivery_offices', 'drivers', 'delivery_jobs', 'delivery_job_suborders'
  )
order by tablename;

-- تحقق إضافي — التعديلان الآمنان على الجداول القائمة:
select conname, pg_get_constraintdef(oid) from pg_constraint
where conname = 'users_role_check' and conrelid = 'users'::regclass;

select column_name, data_type, is_nullable from information_schema.columns
where table_schema = 'public' and table_name = 'merchants' and column_name = 'default_settlement_model';
