-- ============================================================================
-- Founder Taxonomy Foundation — Migration (additive only, no destructive change)
--
-- STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24). Closes the one real schema gap
-- blocking Admin "hide" at category/subcategory level (catalog_districts already has is_active,
-- see scripts/01-districts-architecture-migration.sql) and adds the generic node-membership tables
-- that let خير البلد/السلال/الميزان/الوصفات list existing canonical products/posts without ever
-- duplicating a Product record (founder direction, this session — see DD entry in docs/DECISIONS.md).
--
-- Applied directly against staging via a one-off Node script using SUPABASE_SERVICE_ROLE_KEY
-- (.env.staging.local) — same direct-service-role method prior sessions used to seed/verify staging
-- data, NOT the manual SQL Editor paste docs/DATABASE.md §8 describes as the default process. This
-- file is kept for the repo's own record-keeping convention (same reason 01-districts-architecture-
-- migration.sql exists as a file even though it too was applied by hand originally).
--
-- Live product-dependency check before writing this (read-only, via service_role, staging):
--   catalog_districts=19, catalog_categories=52, catalog_subcategories=20
--   products: 7555 total, 5527 (73%) have district_id/catalog_category_id set, only 12 have
--   catalog_subcategory_id, only 49 use the old flat `categories` table.
-- This is why the old 19-district tree is HIDDEN (is_active=false), not replaced/deleted — deleting
-- or renaming it would orphan the FK on most of the live catalog. See the import script
-- (scripts/2026-09-23-import-founder-taxonomy.ts) for the new 27-world tree, added as new rows in
-- these same tables, never a parallel taxonomy architecture.
-- ============================================================================

ALTER TABLE catalog_categories
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE catalog_subcategories
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- يحفظ السطر التعريفي تحت كل حي في الملف المصدر (مثال: "خضراوات وفواكه" تحت "الجناين") بلا خلطه مع
-- name_ar (يجب أن يبقى الاسم النظيف فقط، حرفياً كما في الملف).
ALTER TABLE catalog_districts
    ADD COLUMN IF NOT EXISTS tagline text;

-- عضوية عامة لمنتج داخل أي قسم فرعي — تُستخدَم من الأحياء التجميعية/الهجينة/الوصفية (السلال، خير
-- البلد، الميزان) لعرض منتجات كنسية موجودة فعلياً بلا تكرار صفها. القسم الفرعي الأصلي المملوك حقاً
-- للمنتج يبقى products.catalog_subcategory_id كما هو — هذا جدول عضوية إضافية فقط، لا ملكية.
CREATE TABLE IF NOT EXISTS catalog_node_product_links (
    catalog_subcategory_id uuid NOT NULL REFERENCES catalog_subcategories(id) ON DELETE CASCADE,
    product_id             uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sort_order              int  NOT NULL DEFAULT 0,
    created_at              timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (catalog_subcategory_id, product_id)
);

-- نفس المبدأ لمنشورات بيان (وصفات = محتوى + روابط منتجات، مقالة موجودة فعلياً بنمط بيان الحالي —
-- راجع DD-024 — لا حاجة لجدول recipes جديد).
CREATE TABLE IF NOT EXISTS catalog_node_post_links (
    catalog_subcategory_id uuid NOT NULL REFERENCES catalog_subcategories(id) ON DELETE CASCADE,
    post_id                 uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    sort_order              int  NOT NULL DEFAULT 0,
    created_at              timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (catalog_subcategory_id, post_id)
);

ALTER TABLE catalog_node_product_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_node_post_links ENABLE ROW LEVEL SECURITY;

-- نفس نمط القراءة العامة المطبَّق فعلياً على catalog_districts/categories/subcategories
-- (scripts/03-catalog-taxonomy-rls.sql) — الكتابة عبر service_role حصراً (لا سياسة INSERT/UPDATE/
-- DELETE هنا عمداً).
CREATE POLICY catalog_node_product_links_public_read ON catalog_node_product_links
    FOR SELECT USING (true);

CREATE POLICY catalog_node_post_links_public_read ON catalog_node_post_links
    FOR SELECT USING (true);
