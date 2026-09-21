-- scripts/2026-09-19-fix-inventory-cost-price.sql
-- FIX-COST-PRICE-01 — إصلاح Migration ناقصة: inventory.cost_price غير موجود فعلياً لا على dev
-- ولا على staging، رغم أن الكود يفترض وجوده منذ ADR-031 (اكتُشف أثناء PILOT-SEED-01، 2026-09-19،
-- راجع docs/DECISIONS.md → "مراجَع ولم يُحوَّل إلى Decision Debt" → بند inventory.cost_price).
--
-- ⚠️ تشخيص حي مؤكَّد قبل كتابة هذا الملف (لا افتراضاً):
--   - العمود *معرَّف* بالفعل كـALTER TABLE في نهاية scripts/catalog-import-schema.sql:74 (ضمن
--     ADR-031)، لكن تلك الجملة تحديداً — على ما يبدو — لم تُنفَّذ فعلياً حين شُغِّل باقي ذلك
--     الملف على dev (باقي الملف حي ومُستهلَك فعلياً: catalog_master_items/catalog_review_queue/
--     products.master_item_id كلها موجودة وتُستخدَم في الكود منذ commit 1c62fd9، 2026-09-13).
--     فهذه *فجوة تطبيق* (Migration لم تكتمل)، لا فجوة تصميم — لا حاجة لقرار مؤسس جديد هنا.
--   - إعادة تشغيل كامل catalog-import-schema.sql غير آمنة الآن: يحتوي CREATE TABLE بلا
--     IF NOT EXISTS لجداول موجودة أصلاً (catalog_master_items/catalog_review_queue) — ستفشل
--     بـ"relation already exists". لذلك هذا ملف مستقل، لا يُعيد أي جزء آخر من ذلك الملف.
--   - العلاقة بـspecs/orders/SUPPLY_RESOLUTION_ENGINE_DESIGN.md: `inventory.cost_price` **هو نفسه**
--     "Supply Price" في جدول المصطلحات هناك (§2، السطر الخاص بـ"Supply Price") — تسمية مفاهيمية
--     جديدة لعمود قائم فعلاً، لا مفهوم مختلف من نظام أقدم. تصميم هامش ريف (§3 من تلك الوثيقة،
--     `هامش = base_price − cost_price`) يبني فوق هذا العمود بالضبط، وهو غير مُنفَّذ بعد (خارج نطاق
--     هذا الإصلاح — هذا الملف يضيف العمود فقط، لا أي منطق هامش).
--
-- ⚠️ لم يُنفَّذ هذا السكربت تلقائيًا. يجب مراجعته وتشغيله يدويًا عبر Supabase SQL Editor من قبل
-- المؤسس، على بيئة dev أولاً، ثم staging، حسب الممارسة الحالية للمشروع (DD-005 مفتوحة).
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع — لا DDL نُفِّذ ولا حاول أي اتصال بقاعدة
-- بيانات حية أثناء إعداد هذا الملف. هذا الملف نص SQL فقط، بانتظار تنفيذ يدوي.
--
-- ضمانات هذا الملف:
--   - ALTER TABLE ADD COLUMN إضافي فقط، nullable — لا يكسر أي صف inventory حالي (صفوف لم تُستورَد
--     عبر Excel بعد تبقى بلا تكلفة مسجَّلة، بالضبط كما وصفه catalog-import-schema.sql:73 أصلاً).
--   - مطوي في DO $$ ... $$ يتحقق أولاً عبر information_schema هل العمود موجود فعلاً قبل أي ALTER —
--     idempotent، تشغيله مرتين آمن (نفس نمط ADR-018/019، day22/phase-2-multi-merchant).
--   - لا DROP لأي شيء. لا UPDATE/DELETE/INSERT. لا لمس لأي جدول غير inventory.
--
-- Rollback (إن احتجت التراجع لاحقاً): العمود nullable بلا أي مستهلك آخر غير مسار الاستيراد، فالتراجع
-- آمن ومباشر:
--   alter table inventory drop column if exists cost_price;
--
-- ⚠️ ملاحظة أمنية مستقلة عن نطاق هذا الإصلاح (لم تُلمَس هنا بقرار، تحتاج قرار مؤسس منفصل):
-- inventory عليها اليوم policy عامة "Public read inventory" (`using (true)`، scripts/schema-setup.sql)
-- — أي طرف يقرأ عبر anon key يرى كل أعمدة الصف. إضافة cost_price هنا تعني أن "تكلفة شراء التاجر"
-- (بيانات مالية حساسة صراحة بنص SUPPLY_RESOLUTION_ENGINE_DESIGN.md §2) ستصبح قابلة للقراءة العامة
-- عبر نفس المسار فور تطبيق هذا الـALTER، ما لم يُعدَّل شكل القراءة العامة (مثلاً: view منفصلة بلا
-- cost_price للاستهلاك العام، أو تعديل الـpolicy). هذا خارج نطاق FIX-COST-PRICE-01 المحدَّد صراحة —
-- ذُكر هنا فقط ليكون مرئياً وقت التنفيذ، لا لأنه حُلَّ.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'inventory' and column_name = 'cost_price'
  ) then
    alter table inventory add column cost_price numeric(10,2) check (cost_price is null or cost_price >= 0);
  end if;
end $$;

-- ============================================================================
-- تحقق نهائي — شغّل هذا بعد التنفيذ اليدوي أعلاه للتأكد من إضافة العمود بنجاح:
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'inventory' and column_name = 'cost_price';
