-- ============================================================================
-- سياسة RLS قراءة عامة لجداول شجرة التصنيف الجديدة (TASK-18، تحقّق حي على dev)
--
-- اكتُشف أثناء التحقق الحي لـTASK-18: 01-districts-architecture-migration.sql (TASK-17) أنشأ
-- catalog_districts/catalog_categories/catalog_subcategories بلا أي سياسة RLS قراءة — لا
-- `ENABLE ROW LEVEL SECURITY` ولا `CREATE POLICY` فيه إطلاقاً. النتيجة المؤكَّدة حياً: مفتاح anon
-- (نفس العميل الذي تستخدمه كل قراءات catalog.repository.ts) يرى صفر صف في الجداول الثلاثة رغم
-- وجود 19/52/20 صفاً فعلياً عبر service_role. بلا هذا السكربت، أي كود واجهة صحيح تقنياً سيعرض
-- قوائم فارغة في متصفح حقيقي.
--
-- نفس "النمط 1" (قراءة عامة) المطبَّق فعلياً على categories/products/post_media/post_products
-- (docs/DATABASE.md §6) — RLS مفعَّل + سياسة SELECT وحيدة USING (true)، بلا سياسة كتابة anon (الكتابة
-- تبقى غير موجودة أصلاً لهذه الجداول، تماماً كـ categories/products اليوم).
--
-- التنفيذ: يدوي على dev أولاً (salsabil-core)، تحقّق حي كامل، ثم staging — بنفس أسلوب كل سكربت سابق
-- (01-districts-architecture-migration.sql، TASK-12). لا تُنفَّذ من جلسة Claude Code.
-- ============================================================================

ALTER TABLE catalog_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_subcategories ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY لا يدعم IF NOT EXISTS في PostgreSQL — DROP POLICY IF EXISTS أولاً يجعل السكربت آمناً
-- لإعادة التشغيل (idempotent)، بنفس روح ON CONFLICT DO NOTHING في 01-districts-architecture-migration.sql.
DROP POLICY IF EXISTS catalog_districts_public_read ON catalog_districts;
CREATE POLICY catalog_districts_public_read
    ON catalog_districts FOR SELECT
    USING (true);

DROP POLICY IF EXISTS catalog_categories_public_read ON catalog_categories;
CREATE POLICY catalog_categories_public_read
    ON catalog_categories FOR SELECT
    USING (true);

DROP POLICY IF EXISTS catalog_subcategories_public_read ON catalog_subcategories;
CREATE POLICY catalog_subcategories_public_read
    ON catalog_subcategories FOR SELECT
    USING (true);
