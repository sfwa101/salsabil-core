-- scripts/day22-user-personas-fk-policy.sql
-- اليوم 22 — قرار صريح لسياسة الحذف على user_personas.user_id (ADR-020)، متابعة لاكتشاف اليوم 21
-- (ADR-019): الإصلاح السابق (ترتيب الحذف في ملفات الاختبار) صحيح لكنه لا يعالج الجذر — القيد نفسه
-- في قاعدة البيانات كان بلا ON DELETE صريح (افتراضي NO ACTION، سلوكه مطابق عملياً لـRESTRICT هنا
-- لأنه غير Deferrable). هذا الملف يجعل النية صريحة، لا يغيّر السلوك الفعلي — راجع ADR-020 للتبرير
-- الكامل لاختيار RESTRICT (لا CASCADE).
--
-- ⚠️ لا اتصال Postgres مباشر لـClaude Code في هذا المشروع (نفس قيد اليوم 19) — يُلصَق هذا الملف
-- يدوياً في Supabase Dashboard → SQL Editor → Run، على نفس بيئة dev المحلية.
--
-- تحقق اختياري قبل التشغيل (اطمئنان لا ضرورة): للتأكد من اسم القيد الفعلي قبل حذفه —
--   select conname from pg_constraint where conrelid = 'user_personas'::regclass and contype = 'f';
-- الاسم المتوقَّع (تسمية Postgres التلقائية لِـ"references" ضمن CREATE TABLE بلا تسمية صريحة،
-- كما كُتب في scripts/day19-context-engine-schema.sql): user_personas_user_id_fkey.
-- إن اختلف الاسم فعلياً، بدِّله في سطر DROP أدناه قبل التشغيل.

alter table user_personas
  drop constraint if exists user_personas_user_id_fkey;

alter table user_personas
  add constraint user_personas_user_id_fkey
  foreign key (user_id) references users(id) on delete restrict;

-- نهاية — بعد التشغيل، أبلغ Claude Code للتحقق الحي (محاولة حذف مستخدم تجريبي له شخصية، رفض متوقَّع
-- بكود 23503)، ثم توثيق النتيجة في ADR-020.
