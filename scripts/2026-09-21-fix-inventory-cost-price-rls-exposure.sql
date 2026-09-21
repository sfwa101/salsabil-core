-- scripts/2026-09-21-fix-inventory-cost-price-rls-exposure.sql
-- SEC-P1-1 — إصلاح تكتيكي عاجل ومحدود النطاق: inventory.cost_price كان قابلاً للقراءة العامة عبر
-- مفتاح anon (سياسة "Public read inventory" using(true)، schema-setup.sql:126 — تسبق إضافة العمود
-- نفسها بـFIX-COST-PRICE-01 (2026-09-19) ولم تُعدَّل وقتها رغم تحذير صريح مكتوب في نفس ملف الإصلاح
-- آنذاك: 2026-09-19-fix-inventory-cost-price.sql:38-44، ولم يُحوَّل إلى Decision Debt وقتها).
--
-- ⚠️ مُثبَت حياً لا نظرياً (2026-09-21): طلب Data API حقيقي بمفتاح anon على staging أعاد صفاً بقيمة
-- cost_price=12.00 فعلية. راجع SEC-P1-1 (SALSABIL_BACKEND_ARCHITECTURE_FORENSIC_AUDIT) وDD-022
-- (docs/DECISIONS.md) للتفصيل الكامل والتفويض.
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع (نفس القيد الموثَّق مسبقاً في
-- 2026-09-19-fix-inventory-cost-price.sql:24) — هذا الملف نص SQL فقط، بانتظار تنفيذ يدوي عبر
-- Supabase SQL Editor من المؤسس، على dev أولاً، ثم staging، بهذا الترتيب بالضبط.
--
-- النطاق (مُصرَّح به استثناءً من المؤسس مباشرة، 2026-09-21 — "الخيار 1" من خيارات المعالجة المعروضة):
--   - لا تغيير في بنية الجدول (لا ALTER، لا عمود جديد، لا جدول جديد، لا تعديل RLS policy نفسها).
--   - فقط: منع anon/authenticated من قراءة عمود cost_price تحديداً عبر column-level REVOKE، مع بقاء
--     كل الأعمدة الأخرى (product_id, quantity_available, updated_at) مقروءة بالضبط كما هي اليوم.
--   - الفصل الأوسع (جدول/عرض service_role منفصل بالكامل لـcost_price) مؤجَّل عمداً — راجع DD-022،
--     بند "Broader Fix Deferred"، MIGRATION_REQUIRED في خطة الـTriage القادمة، لا إسقاطاً بلا قرار.
--
-- ⚠️ تبعية تنفيذ إلزامية: طبِّق هذا السكربت فقط بعد نشر تعديل الكود المرافق
-- (src/core/modules/inventory/inventory.repository.ts — findByProductIds انتقل من عميل anon إلى
-- service_role، findByProductId لم يعد يطلب cost_price إطلاقاً) — وإلا ستكسر صفحة "عروضي" للتاجر
-- (app/merchant/offers/page.tsx) فوراً، لأنها كانت تقرأ cost_price عبر anon + select('*') قبل ذلك
-- التعديل. الكود مُطبَّق فعلاً في هذه الدفعة (2026-09-21) — تحقَّق أنه منشور على البيئة المستهدَفة
-- قبل تشغيل REVOKE أدناه على تلك البيئة تحديداً.
--
-- Idempotent: REVOKE على صلاحية غير ممنوحة أصلاً لا يفشل في Postgres (تشغيله مرتين آمن).
--
-- Rollback (إن احتجت التراجع لاحقاً):
--   GRANT SELECT (cost_price) ON public.inventory TO anon, authenticated;

REVOKE SELECT (cost_price) ON public.inventory FROM anon, authenticated;

-- ============================================================================
-- تحقق فوري بعد التنفيذ اليدوي أعلاه — الاستعلام الأول يجب أن يُعيد FALSE لكليهما (cost_price لم
-- يعد مقروءاً)، والثاني يجب أن يُعيد TRUE لكليهما (باقي الأعمدة لم تتأثر):

select
  has_column_privilege('anon', 'public.inventory', 'cost_price', 'SELECT') as anon_can_read_cost_price,
  has_column_privilege('authenticated', 'public.inventory', 'cost_price', 'SELECT') as authenticated_can_read_cost_price;

select
  has_column_privilege('anon', 'public.inventory', 'quantity_available', 'SELECT') as anon_can_read_quantity,
  has_column_privilege('anon', 'public.inventory', 'product_id', 'SELECT') as anon_can_read_product_id,
  has_column_privilege('anon', 'public.inventory', 'updated_at', 'SELECT') as anon_can_read_updated_at;
