-- scripts/2026-09-14-add-missing-indexes.sql
-- TASK-07 (REEF V1) — فهارس ناقصة على أعمدة FK مُستهلَكة فعلياً في استعلامات ساخنة.
-- راجع docs/audits/2026-09-14-reef-v1-engineering-audit.md §13/§22 (TASK-07) و
-- docs/DATABASE.md §10 (Known Indexing Gaps، 2026-09-06) — نفس الخمسة أعمدة، مُعاد التحقق منها هنا
-- مباشرة عبر فحص كل DDL موجود فعلياً في scripts/*.sql (schema-setup.sql, day19/22/23-*.sql,
-- catalog-import-schema.sql, otp-schema.sql, password-auth-schema.sql) — لا CREATE INDEX واحد على
-- أي من الأعمدة الستة أدناه في أي منها، ولا Postgres يُنشئ فهرساً تلقائياً على عمود FK عادي (بخلاف
-- PRIMARY KEY/UNIQUE). راجع Task Report لهذه الدفعة (TASK-07) لتفصيل منهجية التحقق الكامل.
--
-- ⚠️ لم يُنفَّذ هذا السكربت تلقائيًا. يجب مراجعته وتشغيله يدويًا
-- عبر Supabase SQL Editor من قبل المؤسس، على بيئة التطوير أولًا
-- ثم staging، حسب الممارسة الحالية للمشروع (DD-005 مفتوحة).
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع (نفس قيد day19/day22/day23) — لا DDL
-- نُفِّذ ولا حاول أي اتصال بقاعدة بيانات حية أثناء إعداد هذا الملف. هذا الملف نص SQL فقط، بانتظار
-- تنفيذ يدوي.
--
-- ضمانات هذا الملف (راجعها بنفسك قبل التشغيل، لا تُصدِّقها فقط):
--   - كل CREATE INDEX أدناه يستخدم IF NOT EXISTS — تشغيله مرتين لا يسبب خطأ ولا يكرر فهرساً.
--   - لا DROP لأي شيء. لا ALTER TABLE. لا UPDATE/DELETE/INSERT — فهارس فقط.
--   - بلا CONCURRENTLY عمداً (راجع الملاحظة أسفل كل فهرس) — حجم البيانات في كل الجداول الستة تجريبي
--     صغير اليوم (docs/DATABASE.md §10)، فقفل الجدول أثناء البناء لحظي وغير ملحوظ عملياً الآن. إن
--     كانت البيانات على البيئة المستهدفة أكبر مما تتوقع وقت التشغيل، شغِّل كل عبارة CREATE INDEX على
--     حدة (لا كلها في لصقة واحدة) بإضافة CONCURRENTLY يدوياً — لا يعمل داخل معاملة واحدة تضم عبارات
--     أخرى، وSupabase SQL Editor ينفّذ اللصقة كاملة كمعاملة ضمنية واحدة.

-- ============================================================================
-- 1) products.tenant_id
-- يُستهلَك في: src/core/modules/catalog/catalog.repository.ts:158-159
--   (CatalogRepository.findProductsByTenant) — كل تحميل بوابة تاجر لمنتجاته.
create index if not exists products_tenant_id_idx on products (tenant_id);

-- ============================================================================
-- 2) products.category_id
-- ⚠️ إضافة على القائمة الأصلية (ليست من الخمسة المذكورة في تقرير التدقيق/DATABASE.md §10) —
-- دليل كود حقيقي جديد وُجد أثناء هذه الدفعة، لا افتراضاً: نفس نمط الفهرسة الناقصة (عمود FK بلا
-- فهرس، docs/DATABASE.md §3.1 يسرد `products` بـ"PK(id) فقط"). يُستهلَك في:
--   src/core/modules/catalog/catalog.repository.ts:133-134 (findProductsByCategory)
--   ← catalog.service.ts:28-29 (listProductsByCategory)
--   ← src/app/(reef)/[category]/page.tsx:33 — استعلام كل زيارة صفحة حي/تصنيف في واجهة ريف العامة
--   (Infinite Scroll، SALSABIL_CONSTITUTION.md §7.1) — على الأرجح أعلى تردداً من الخمسة الأصلية
--   لأنه بلا مصادقة، يُطلَق من كل زائر.
create index if not exists products_category_id_idx on products (category_id);

-- ============================================================================
-- 3) orders.tenant_id
-- يُستهلَك في: src/core/modules/orders/orders.repository.ts:148-153
--   (OrdersRepository.findOrdersByTenantId) ← orders.service.ts:248 (getOrdersForTenant)
--   ← src/app/merchant/orders/page.tsx:20 — أهم استعلام في بوابة التاجر (قائمة طلباته).
create index if not exists orders_tenant_id_idx on orders (tenant_id);

-- ============================================================================
-- 4) orders.user_id
-- لا مستهلك مباشر اليوم (لا صفحة "طلباتي" للعميل بعد — تحقَّقت عبر grep كامل لـ
-- orders.repository.ts، لا استعلام .eq('user_id', ...) على orders حالياً). عمود FK حقيقي
-- (orders.user_id references users(id) not null) قائم فعلاً، وdocs/DATABASE.md §10 يعتبره
-- "مرشَّحاً واضحاً لأول ميزة كهذه — إضافته الآن أرخص من إضافته بعد نمو بيانات حقيقي". يُضاف هنا
-- بلا خطر حالي (فهرس على عمود بلا استعلام اليوم لا يكلف شيئاً غير مساحة تخزين صغيرة)، لا لأنه
-- يحل مشكلة أداء قائمة فعلياً الآن.
create index if not exists orders_user_id_idx on orders (user_id);

-- ============================================================================
-- 5) cart_items.cart_id
-- يُستهلَك في: src/core/modules/cart/cart.repository.ts:117-118 (findItems) و
--   118/128 (findItemsWithProducts، الأكثر استخداماً فعلياً) ← cart.service.ts:89 (getSummary)
--   — يُستدعى في كل عرض سلة تقريباً (CartCapsule/DesktopCartSidebar/checkout) — أعلى تردد
--   استعلام واحد في المشروع بأكمله (docs/DATABASE.md §10، الأولوية الأعلى من الخمسة).
create index if not exists cart_items_cart_id_idx on cart_items (cart_id);

-- ============================================================================
-- 6) order_items.order_id
-- يُستهلَك في: src/core/modules/orders/orders.repository.ts:142-143 (findOrderItems)
--   ← orders.service.ts:195 (getOrderWithItems) و :210 (getOrderForCustomerView) — كل عرض
--   تفاصيل طلب (بوابة تاجر، لوحة إدارة، وصفحة تتبّع العميل الضيف
--   src/app/(reef)/order/[id]/page.tsx:26).
create index if not exists order_items_order_id_idx on order_items (order_id);

-- ============================================================================
-- نهاية الفهارس. بعد التشغيل، تحقَّق يدوياً أن الستة ظهرت فعلاً:
--   select indexname, tablename from pg_indexes
--   where indexname in (
--     'products_tenant_id_idx', 'products_category_id_idx', 'orders_tenant_id_idx',
--     'orders_user_id_idx', 'cart_items_cart_id_idx', 'order_items_order_id_idx'
--   );

-- ============================================================================
-- EXPLAIN ANALYZE جاهزة للتشغيل المباشر (SQL عادي، لا تعليق) — انسخها وشغّلها بعد إنشاء
-- الفهارس أعلاه للتحقق من استخدامها الفعلي (ابحث عن "Index Scan" بدل "Seq Scan" في الناتج).
-- استبدل القيم بين <> بمعرّفات حقيقية موجودة فعلاً في بيئتك قبل التشغيل.

-- استعلام السلة الأكثر تردداً (cart_items.cart_id):
explain analyze
select * from cart_items where cart_id = '<REPLACE-WITH-REAL-CART-ID>'::uuid;

-- طلبات تاجر معيّن، الأحدث أولاً (orders.tenant_id):
explain analyze
select * from orders where tenant_id = '<REPLACE-WITH-REAL-TENANT-ID>'::uuid
order by created_at desc;

-- بنود طلب معيّن (order_items.order_id):
explain analyze
select * from order_items where order_id = '<REPLACE-WITH-REAL-ORDER-ID>'::uuid;

-- منتجات حي/تصنيف معيّن (products.category_id):
explain analyze
select * from products where category_id = '<REPLACE-WITH-REAL-CATEGORY-ID>'::uuid;

-- منتجات تاجر معيّن (products.tenant_id):
explain analyze
select * from products where tenant_id = '<REPLACE-WITH-REAL-TENANT-ID>'::uuid;
