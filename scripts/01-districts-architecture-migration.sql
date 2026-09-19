-- ============================================================================
-- Districts Architecture — Migration (نسخة 3 مستويات: حي -> قسم رئيسي -> قسم فرعي)
--
-- تصحيحات على المسودة الأصلية (راجعها كلود كود، TASK-17):
--   1) اسم جدول المنتجات الفعلي products (مؤكَّد من هيكل Supabase الفعلي).
--   2) جدول `categories` اسم مُتعارِض فعلياً: يوجد جدول `categories` حي بالفعل
--      بشكل مختلف تماماً، لذا أُعيدت تسمية الجداول الجديدة إلى 
--      catalog_districts / catalog_categories / catalog_subcategories.
--   3) أعمدة إضافية اكتُشفت في بيانات الاستيراد: sku, barcode, title_en, currency, usa_id.
--
-- التنفيذ: يدوي على dev أولاً (salsabil-core) ثم staging، بنفس أسلوب TASK-12.
-- ============================================================================

-- 1) جدول الأحياء — قابل للتوسع، أي حي جديد = صف جديد بلا Migration
CREATE TABLE IF NOT EXISTS catalog_districts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text UNIQUE NOT NULL,
    name_ar     text NOT NULL,
    sort_order  int  NOT NULL DEFAULT 0,
    is_active   boolean NOT NULL DEFAULT true,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- 2) الأقسام الرئيسية داخل كل حي
CREATE TABLE IF NOT EXISTS catalog_categories (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    district_id  uuid NOT NULL REFERENCES catalog_districts(id) ON DELETE CASCADE,
    slug         text NOT NULL,
    name_ar      text NOT NULL,
    sort_order   int  NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (district_id, slug)
);

-- 3) الأقسام الفرعية داخل كل قسم رئيسي
CREATE TABLE IF NOT EXISTS catalog_subcategories (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  uuid NOT NULL REFERENCES catalog_categories(id) ON DELETE CASCADE,
    slug         text NOT NULL,
    name_ar      text NOT NULL,
    sort_order   int  NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (category_id, slug)
);

-- 4) أعمدة جديدة على جدول products — كلها nullable لتجنب كسر الصفوف القائمة
ALTER TABLE products
    ALTER COLUMN category_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS source              text,
    ADD COLUMN IF NOT EXISTS unique_key          text,
    ADD COLUMN IF NOT EXISTS sku                 text,
    ADD COLUMN IF NOT EXISTS barcode             text,
    ADD COLUMN IF NOT EXISTS alternative_skus    text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS title_en            text,
    ADD COLUMN IF NOT EXISTS currency            text,
    ADD COLUMN IF NOT EXISTS usa_id              text,
    ADD COLUMN IF NOT EXISTS district_id         uuid REFERENCES catalog_districts(id),
    ADD COLUMN IF NOT EXISTS catalog_category_id uuid REFERENCES catalog_categories(id),
    ADD COLUMN IF NOT EXISTS catalog_subcategory_id uuid REFERENCES catalog_subcategories(id),
    ADD COLUMN IF NOT EXISTS gallery_images      text[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS specs               jsonb  DEFAULT '{}'::jsonb;

-- 5) منع التكرار مستقبلاً
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_unique_key
    ON products (unique_key)
    WHERE unique_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_products_taxonomy
    ON products (district_id, catalog_category_id, catalog_subcategory_id);

-- ============================================================================
-- 6) تهيئة الأحياء (19) + الأقسام الرئيسية (52) + الأقسام الفرعية (20)
-- ============================================================================

-- الأحياء (19 حي)
INSERT INTO catalog_districts (slug, name_ar, sort_order) VALUES
    ('hy-alrjl', 'حي الرجل', 1),
    ('hy-almraa', 'حي المرأة', 2),
    ('hy-altfl', 'حي الطفل', 3),
    ('hy-almlabs', 'حي الملابس', 4),
    ('hy-allhwm-waldwajn-walasmak', 'حي اللحوم والدواجن والأسماك', 5),
    ('hy-alkhdrawat-walfwakh', 'حي الخضراوات والفواكه', 6),
    ('hy-alalban-walajban', 'حي الألبان والأجبان', 7),
    ('hy-almtbkh-walmwn', 'حي المطبخ والمؤن', 8),
    ('hy-almfrhat', 'حي المفرحات', 9),
    ('hy-almshrwbat', 'حي المشروبات', 10),
    ('hy-alslal', 'حي السلال', 11),
    ('hy-alwsfat', 'حي الوصفات', 12),
    ('hy-altaam', 'حي الطعام', 13),
    ('hy-alsha-waldwa', 'حي الصحة والدواء', 14),
    ('hy-aldrasa-waltalym', 'حي الدراسة والتعليم', 15),
    ('hy-mstlzmat-almnzl', 'حي مستلزمات المنزل', 16),
    ('hy-almnzfat', 'حي المنظفات', 17),
    ('hy-alalktrwnyat', 'حي الإلكترونيات', 18),
    ('hy-alhdaya-waltghlyf', 'حي الهدايا والتغليف', 19)
ON CONFLICT (slug) DO NOTHING;

-- الأقسام الرئيسية
WITH d AS (SELECT id, slug FROM catalog_districts)
INSERT INTO catalog_categories (district_id, slug, name_ar, sort_order)
SELECT d.id, v.slug, v.name_ar, v.sort_order FROM (VALUES
    ('hy-alrjl', 'anaya-whlaqa', 'عناية وحلاقة', 1),
    ('hy-almraa', 'anaya-balbshra-walshar', 'عناية بالبشرة والشعر', 1),
    ('hy-almraa', 'anaya-anthwya-wmkyaj', 'عناية أنثوية ومكياج', 2),
    ('hy-altfl', 'hfadat-wmstlzmat-alanaya', 'حفاضات ومستلزمات العناية', 1),
    ('hy-altfl', 'ghza-wanaya-balrda', 'غذاء وعناية بالرضع', 2),
    ('hy-almlabs', 'mlabs-rjaly', 'ملابس رجالي', 1),
    ('hy-almlabs', 'mlabs-hrymy', 'ملابس حريمي', 2),
    ('hy-almlabs', 'mlabs-atfal', 'ملابس أطفال', 3),
    ('hy-allhwm-waldwajn-walasmak', 'aldwajn', 'الدواجن', 1),
    ('hy-allhwm-waldwajn-walasmak', 'allhwm', 'اللحوم', 2),
    ('hy-allhwm-waldwajn-walasmak', 'alasmak-wmakwlat-bhrya', 'الأسماك ومأكولات بحرية', 3),
    ('hy-allhwm-waldwajn-walasmak', 'lhwm-msn-aa', 'لحوم مصنّعة', 4),
    ('hy-alkhdrawat-walfwakh', 'khdrawat', 'خضراوات', 1),
    ('hy-alkhdrawat-walfwakh', 'fwakh', 'فواكه', 2),
    ('hy-alalban-walajban', 'alban-wmshtqatha', 'ألبان ومشتقاتها', 1),
    ('hy-alalban-walajban', 'ajban', 'أجبان', 2),
    ('hy-almtbkh-walmwn', 'bqala-whbwb', 'بقالة وحبوب', 1),
    ('hy-almtbkh-walmwn', 'zywt-wtwabl-wswsat', 'زيوت وتوابل وصوصات', 2),
    ('hy-almtbkh-walmwn', 'mwad-thlya-wmkhbwzat', 'مواد تحلية ومخبوزات', 3),
    ('hy-almfrhat', 'shybs-wmqrmshat', 'شيبس ومقرمشات', 1),
    ('hy-almfrhat', 'shwkwlata-whlwyat', 'شوكولاتة وحلويات', 2),
    ('hy-almfrhat', 'bskwyt-wwyfr', 'بسكويت وويفر', 3),
    ('hy-almshrwbat', 'mshrwbat-sakhna', 'مشروبات ساخنة', 1),
    ('hy-almshrwbat', 'asayr-wmshrwbat-ghazya', 'عصائر ومشروبات غازية', 2),
    ('hy-alslal', 'slal-asbwaya', 'سلال أسبوعية', 1),
    ('hy-alslal', 'slal-shhrya', 'سلال شهرية', 2),
    ('hy-alslal', 'ashtrakat', 'اشتراكات', 3),
    ('hy-alslal', 'slal-mtnwaa', 'سلال متنوعة', 4),
    ('hy-alslal', 'slal-kamla', 'سلال كاملة', 5),
    ('hy-alslal', 'slal-lhwm-wdwajn', 'سلال لحوم ودواجن', 6),
    ('hy-alslal', 'slal-khdar-wfwakh', 'سلال خضار وفواكه', 7),
    ('hy-alslal', 'slal-aftar', 'سلال إفطار', 8),
    ('hy-alwsfat', 'aftar', 'إفطار', 1),
    ('hy-alwsfat', 'ghda', 'غداء', 2),
    ('hy-alwsfat', 'asha', 'عشاء', 3),
    ('hy-altaam', 'mtaam', 'مطاعم', 1),
    ('hy-altaam', 'taam-mnzly', 'طعام منزلي', 2),
    ('hy-alsha-waldwa', 'anaya-shkhsya-aama', 'عناية شخصية عامة', 1),
    ('hy-alsha-waldwa', 'adwya-wfytamynat', 'أدوية وفيتامينات', 2),
    ('hy-aldrasa-waltalym', 'ktb-wmtbwaat', 'كتب ومطبوعات', 1),
    ('hy-aldrasa-waltalym', 'qrtasya', 'قرطاسية', 2),
    ('hy-mstlzmat-almnzl', 'adwat-mtbkh', 'أدوات مطبخ', 1),
    ('hy-mstlzmat-almnzl', 'tkhzyn-wtnzym', 'تخزين وتنظيم', 2),
    ('hy-mstlzmat-almnzl', 'athath-wmfrwshat-sghyra', 'أثاث ومفروشات صغيرة', 3),
    ('hy-almnzfat', 'mnzfat-wmthrat', 'منظفات ومطهرات', 1),
    ('hy-almnzfat', 'mnadyl-wakyas', 'مناديل وأكياس', 2),
    ('hy-alalktrwnyat', 'hwatf-waksswarat', 'هواتف وإكسسوارات', 1),
    ('hy-alalktrwnyat', 'labtwbat-wkmbywtr', 'لابتوبات وكمبيوتر', 2),
    ('hy-alalktrwnyat', 'ajhza-mnzlya-sghyra', 'أجهزة منزلية صغيرة', 3),
    ('hy-alhdaya-waltghlyf', 'hdaya-jahza', 'هدايا جاهزة', 1),
    ('hy-alhdaya-waltghlyf', 'tghlyf-wtnsyq', 'تغليف وتنسيق', 2),
    ('hy-alhdaya-waltghlyf', 'btaqat-wmnasbat', 'بطاقات ومناسبات', 3)
) AS v(district_slug, slug, name_ar, sort_order)
JOIN d ON d.slug = v.district_slug
ON CONFLICT (district_id, slug) DO NOTHING;

-- الأقسام الفرعية
WITH c AS (SELECT cat.id, cat.slug AS cat_slug, d.slug AS district_slug
           FROM catalog_categories cat JOIN catalog_districts d ON d.id = cat.district_id)
INSERT INTO catalog_subcategories (category_id, slug, name_ar, sort_order)
SELECT c.id, v.slug, v.name_ar, v.sort_order FROM (VALUES
    ('hy-alrjl', 'anaya-whlaqa', 'shfrat-wmakynat-hlaqa', 'شفرات وماكينات حلاقة', 1),
    ('hy-alrjl', 'anaya-whlaqa', 'anaya-ballhya', 'عناية باللحية', 2),
    ('hy-almraa', 'anaya-anthwya-wmkyaj', 'fwt-shya', 'فوط صحية', 1),
    ('hy-almraa', 'anaya-anthwya-wmkyaj', 'mkyaj', 'مكياج', 2),
    ('hy-almlabs', 'mlabs-rjaly', 'mlabs-dakhlya', 'ملابس داخلية', 1),
    ('hy-allhwm-waldwajn-walasmak', 'aldwajn', 'tazj', 'طازج', 1),
    ('hy-allhwm-waldwajn-walasmak', 'aldwajn', 'mjmd', 'مجمد', 2),
    ('hy-allhwm-waldwajn-walasmak', 'lhwm-msn-aa', 'slamy-wlanshwn', 'سلامي ولانشون', 1),
    ('hy-allhwm-waldwajn-walasmak', 'lhwm-msn-aa', 'mqanq-wsjq', 'مقانق وسجق', 2),
    ('hy-almshrwbat', 'mshrwbat-sakhna', 'shay', 'شاي', 1),
    ('hy-almshrwbat', 'mshrwbat-sakhna', 'qhwa-wnskafyh', 'قهوة ونسكافيه', 2),
    ('hy-altaam', 'mtaam', 'aalmy', 'عالمي', 1),
    ('hy-altaam', 'mtaam', 'msry', 'مصري', 2),
    ('hy-altaam', 'taam-mnzly', 'bywt-akl', 'بيوت أكل', 1),
    ('hy-altaam', 'taam-mnzly', 'shyfat-mnzlyyn', 'شيفات منزليين', 2),
    ('hy-alsha-waldwa', 'anaya-shkhsya-aama', 'anaya-balshar-walbshra', 'عناية بالشعر والبشرة', 1),
    ('hy-alsha-waldwa', 'anaya-shkhsya-aama', 'anaya-balfm-walasnan', 'عناية بالفم والأسنان', 2),
    ('hy-almnzfat', 'mnzfat-wmthrat', 'msahyq-ghsyl', 'مساحيق غسيل', 1),
    ('hy-almnzfat', 'mnadyl-wakyas', 'akyas-qmama', 'أكياس قمامة', 1),
    ('hy-almnzfat', 'mnadyl-wakyas', 'mnadyl-wrqya', 'مناديل ورقية', 2)
) AS v(district_slug, cat_slug, slug, name_ar, sort_order)
JOIN c ON c.district_slug = v.district_slug AND c.cat_slug = v.cat_slug
ON CONFLICT (category_id, slug) DO NOTHING;