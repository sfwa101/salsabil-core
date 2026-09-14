-- scripts/catalog-import-schema.sql
-- سير عمل الكتالوج المبسَّط للإطلاق (CATALOG-IMPORT-WORKFLOW) — راجع docs/DECISIONS.md → ADR-031
-- للتفصيل الكامل (السبب، الجداول المتأثرة، التوافق العكسي، التراجع، تأثير الفهارس/RLS — docs/DATABASE.md §9).
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع — يُلصَق هذا الملف يدوياً في
-- Supabase Dashboard → SQL Editor → Run، على بيئة dev المحلية أولاً.
--
-- ترتيب صارم حسب Foreign Keys: categories (موجود) → catalog_master_items → merchants (موجود) →
--   catalog_review_queue، ثم ALTER على products/inventory (موجودان).

-- ============================================================================
-- catalog_master_items — الكتالوج الأساسي بإدارة platform_admin حصراً (اسم + سعر بيع + تصنيف)
-- ============================================================================
create table catalog_master_items (
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
-- النمط 2 (قفل كامل) — مرجع داخلي للمالك فقط، ليس كتالوجاً يتصفحه العميل مباشرة (العميل يرى صفوف
-- products الخاصة بكل تاجر، لا هذا الجدول). وصول حصري عبر service_role، نفس نمط merchants/sessions.
create index catalog_master_items_category_id_idx on catalog_master_items (category_id);


-- ============================================================================
-- catalog_review_queue — صفوف استيراد تاجر لم تُطابِق أي عنصر في الكتالوج الأساسي، بانتظار قرار المالك
-- ============================================================================
create table catalog_review_queue (
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
-- النمط 2 (قفل كامل) — يحمل تكلفة شراء تاجر (بيانات مالية حساسة عبر تجار مختلفين)، وصول حصري
-- عبر service_role من لوحة إدارة المراجعة فقط (platform_admin).
create index catalog_review_queue_status_idx on catalog_review_queue (status, created_at);
create index catalog_review_queue_tenant_id_idx on catalog_review_queue (tenant_id);


-- ============================================================================
-- products.master_item_id — يربط صف منتج تاجر بعنصر الكتالوج الأساسي الذي استُنسِخ منه
-- ============================================================================
-- ALTER TABLE ADD COLUMN nullable — توافق عكسي كامل (نفس نمط ADR-018/ADR-019)، كل صفوف products
-- الحالية تبقى بلا تغيير (master_item_id = null، أي "لم يُستورَد عبر هذا السير").
alter table products add column master_item_id uuid references catalog_master_items(id);

-- يمنع إنشاء أكثر من صف منتج واحد لنفس (تاجر، عنصر كتالوج أساسي) — شرط سباق/إعادة استيراد
-- عرضية، دفاع مستقل عن منطق التطبيق (نفس فلسفة INV-INV-002: قيد DB كطبقة ثانية لا تعتمد على
-- صحة الكود وحدها). جزئي (where) لأن معظم صفوف products القديمة/التجريبية master_item_id فيها null.
create unique index products_tenant_master_item_uidx on products (tenant_id, master_item_id) where master_item_id is not null;


-- ============================================================================
-- inventory.cost_price — تكلفة شراء التاجر الخاصة به لهذا المنتج (مختلفة عن base_price/سعر البيع)
-- ============================================================================
-- nullable — توافق عكسي كامل، صفوف inventory الحالية (منتجات لم تُستورَد عبر هذا السير) تبقى بلا تكلفة مسجَّلة.
alter table inventory add column cost_price numeric(10,2) check (cost_price is null or cost_price >= 0);

-- ============================================================================
-- نهاية DDL — بعد تشغيله، أبلغ Claude Code للمتابعة بالتحقق الحي.
-- ============================================================================
