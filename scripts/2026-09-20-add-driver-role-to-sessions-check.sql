-- scripts/2026-09-20-add-driver-role-to-sessions-check.sql
--
-- §31 بند 9 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §8) — اكتُشف حياً أثناء بناء مسار دخول
-- السائق/مكتب التوصيل: عمود sessions.role يحمل قيد CHECK (scripts/schema-setup.sql:230-231) لم
-- يُحدَّث أبداً عند توسيع users.role_check ليشمل 'driver' (scripts/2026-09-15-phase-2-multi-
-- merchant-schema.sql، البند 11) — القيدان أصبحا غير متطابقين. محاولة إنشاء جلسة حقيقية بـ
-- role:'driver' سترفضها قاعدة البيانات فوراً بخطأ CHECK violation، رغم أن users.role يسمح بها.
--
-- ⚠️ بانتظار تنفيذ يدوي من المؤسس — لم أنفّذ أي DDL مباشرة على أي قاعدة بيانات حية (قاعدة صارمة
-- غير قابلة للكسر في هذه المهمة). الكود المبني الليلة **لا يعتمد** على هذا التعديل (يستخدم مؤقتاً
-- role:'customer' في الجلسة + تحقق فعلي منفصل من جدولي delivery_offices/drivers، راجع سجل البناء
-- الليلي 2026-09-20 → بند 9 للتفاصيل والمبرر الأمني الكامل) — لكن تطبيق هذا السكربت مطلوب لاحقاً
-- لتصحيح القيد ليعكس الواقع الفعلي بدقة، وإن رغب المؤسس لاحقاً في تخزين role:'driver' الحقيقي بدل
-- الحل المؤقت الحالي.
--
-- idempotent: يتحقق أولاً هل 'driver' مذكورة فعلاً ضمن تعريف القيد الحالي قبل أي DROP/ADD.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sessions_role_check'
      and conrelid = 'sessions'::regclass
      and pg_get_constraintdef(oid) ilike '%driver%'
  ) then
    alter table sessions drop constraint if exists sessions_role_check;
    alter table sessions add constraint sessions_role_check
      check (role in ('platform_admin', 'merchant_owner', 'merchant_manager', 'employee', 'customer', 'driver'));
  end if;
end $$;
