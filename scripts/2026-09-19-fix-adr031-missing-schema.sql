-- scripts/2026-09-19-fix-adr031-missing-schema.sql
-- FIX-ADR031-SCHEMA-01 — يضيف الثلاثة عناصر الوحيدة من ADR-031 (docs/DECISIONS.md) التي اتضح حياً
-- أنها لم تُنفَّذ فعلياً على dev قط، رغم أن التوثيق يصفها كـ"حية منذ 2026-09-13 (commit 1c62fd9)":
--   1) catalog_master_items (جدول)
--   2) catalog_review_queue (جدول)
--   3) products.master_item_id (عمود + فهرسه الفريد الجزئي)
--
-- ⚠️ اكتُشف أثناء التحقق الحي المطلوب بعد FIX-COST-PRICE-01 (scripts/2026-09-19-fix-inventory-
-- cost-price.sql، مُنفَّذ بالفعل ومُتحقَّق منه — لا تكراره هنا). تسلسل التحقق الكامل (project ref
-- مطابق حرفياً لـliolnkdmjfkvawnkwhje، استمرارية بيانات كاملة بلا فجوة عبر 01/06/13/18/19 سبتمبر —
-- 7,556 منتج، تاجرو PILOT-SEED-01 العشرة بطوابعهم الزمنية اليوم، إلخ) استبعد أي احتمال تصفير
-- للمشروع. الخلاصة: فجوة تنفيذ توثيقية صرفة — لا تصفير، لا مشروع خاطئ.
--
-- هذا الملف **مصدره الحرفي** هو نفس ثلاث كتل DDL من scripts/catalog-import-schema.sql (الأسطر
-- 14-67 من ذلك الملف) — بلا أي تغيير في التصميم/الأعمدة/القيود، فقط أُعيدت كتابتها هنا بشكل
-- idempotent مستقل (ذلك الملف الأصلي غير آمن لإعادة التشغيل ككل لاحتوائه CREATE TABLE بلا
-- IF NOT EXISTS لجداول قد تكون أُنشئت جزئياً، ولأنه يتضمن أيضاً الـALTER الخاص بـ
-- inventory.cost_price المنفَّذ بالفعل عبر سكربت منفصل — لا داعي لإعادته ولا مجال لتكراره هنا).
--
-- ⚠️ لم يُنفَّذ هذا السكربت تلقائيًا. يجب مراجعته وتشغيله يدويًا عبر Supabase SQL Editor من قبل
-- المؤسس، على بيئة dev أولاً، ثم staging، حسب الممارسة الحالية للمشروع (DD-005 مفتوحة).
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع — لا DDL نُفِّذ ولا حاول أي اتصال بقاعدة
-- بيانات حية أثناء إعداد هذا الملف. هذا الملف نص SQL فقط، بانتظار تنفيذ يدوي.
--
-- ضمانات هذا الملف:
--   - كل CREATE TABLE أدناه IF NOT EXISTS — تشغيله مرتين لا يسبب خطأ ولا يُعيد إنشاء شيء.
--   - ALTER TABLE ADD COLUMN مطوي في DO $$ ... $$ يتحقق أولاً عبر information_schema قبل أي ALTER
--     (نفس نمط ADR-018/019 وscripts/2026-09-15-phase-2-multi-merchant-schema.sql لعمود
--     merchants.default_settlement_model) — idempotent، تشغيله مرتين آمن.
--   - كل CREATE INDEX أدناه IF NOT EXISTS.
--   - لا DROP لأي شيء. لا UPDATE/DELETE/INSERT. لا لمس لأي جدول/عمود غير الثلاثة المذكورة أعلاه —
--     تحديداً لا لمس لـinventory.cost_price (مُنفَّذ بالفعل، سكربت منفصل) ولا لأي جزء آخر من
--     catalog-import-schema.sql الأصلي.
--
-- Rollback (إن احتجت التراجع لاحقاً — بالترتيب العكسي بسبب FK):
--   drop index if exists products_tenant_master_item_uidx;
--   alter table products drop column if exists master_item_id;
--   drop table if exists catalog_review_queue;
--   drop table if exists catalog_master_items;

-- ============================================================================
-- 1) catalog_master_items — الكتالوج الأساسي بإدارة platform_admin حصراً (اسم + سعر بيع + تصنيف)
-- نفس التعريف الحرفي من scripts/catalog-import-schema.sql:14-30
-- ============================================================================
create table if not exists catalog_master_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references categories(id),
  name text not null,
  description text,
  base_price numeric(10,2) not null check (base_price >= 0),
  unit text not null default 'piece',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table catalog_master_items enable row level security;
-- بلا أي policy — قفل كامل، مرجع داخلي للمالك فقط، وصول حصري عبر service_role (نفس نمط merchants/sessions).
create index if not exists catalog_master_items_category_id_idx on catalog_master_items (category_id);


-- ============================================================================
-- 2) catalog_review_queue — صفوف استيراد تاجر لم تُطابِق أي عنصر في catalog_master_items
-- نفس التعريف الحرفي من scripts/catalog-import-schema.sql:33-54
-- ============================================================================
create table if not exists catalog_review_queue (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references merchants(id),
  raw_name text not null,
  quantity int not null check (quantity >= 0),
  cost_price numeric(10,2) not null check (cost_price >= 0),
  status text not null default 'pending' check (status in ('pending', 'approved_new', 'merged')),
  resolved_master_item_id uuid references catalog_master_items(id),
  resolved_product_id uuid references products(id),
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table catalog_review_queue enable row level security;
-- بلا أي policy — قفل كامل، يحمل تكلفة شراء تاجر (بيانات مالية حساسة)، وصول حصري عبر service_role.
create index if not exists catalog_review_queue_status_idx on catalog_review_queue (status, created_at);
create index if not exists catalog_review_queue_tenant_id_idx on catalog_review_queue (tenant_id);


-- ============================================================================
-- 3) products.master_item_id — يربط صف منتج تاجر بعنصر الكتالوج الأساسي الذي استُنسِخ منه
-- نفس التعريف الحرفي من scripts/catalog-import-schema.sql:57-67، مطوي هنا في DO $$ للـidempotency
-- (الملف الأصلي لم يكن آمناً لإعادة التشغيل على هذا الجزء تحديداً).
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'master_item_id'
  ) then
    alter table products add column master_item_id uuid references catalog_master_items(id);
  end if;
end $$;

-- يمنع إنشاء أكثر من صف منتج واحد لنفس (تاجر، عنصر كتالوج أساسي) — جزئي (where) لأن معظم صفوف
-- products القديمة/التجريبية master_item_id فيها null.
create unique index if not exists products_tenant_master_item_uidx
  on products (tenant_id, master_item_id) where master_item_id is not null;

-- ============================================================================
-- تحقق نهائي — شغّل هذا بعد التنفيذ اليدوي أعلاه للتأكد من نجاح الإضافة الثلاثية:
select tablename from pg_tables
where schemaname = 'public' and tablename in ('catalog_master_items', 'catalog_review_queue')
order by tablename;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'products' and column_name = 'master_item_id';

select indexname from pg_indexes
where schemaname = 'public'
  and indexname in (
    'catalog_master_items_category_id_idx', 'catalog_review_queue_status_idx',
    'catalog_review_queue_tenant_id_idx', 'products_tenant_master_item_uidx'
  )
order by indexname;
