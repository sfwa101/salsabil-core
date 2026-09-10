-- scripts/otp-schema.sql
-- CUSTOMER-IDENTITY-CLAIM-FLOW (ADR-030) — جدول otp_challenges جديد، يخزّن تحديات رمز التحقق
-- (Authentication OTP) المُرسَلة عبر WhatsApp (أساسي)/SMS Misr (احتياطي) لمسار "ادّعاء حساب عميل
-- ضيف موجود". تنفيذ يدوي عبر Supabase SQL Editor على dev أولاً (لا نظام Migrations رسمي بعد، نفس
-- نمط كل جدول سابق في هذا المشروع — راجع ADR-017/ADR-018/ADR-026).
--
-- الرمز نفسه لا يُخزَّن نصاً صريحاً أبداً — code_hash فقط (scrypt، نفس دالة تجزئة كلمة المرور،
-- src/core/kernel/security/password.ts hashPassword/verifyPassword، لا تبعية جديدة).
--
-- بعد تشغيل هذا الملف: NOTIFY pgrst, 'reload schema'؛ لإعادة تحميل ذاكرة PostgREST المؤقتة (نفس
-- الخطوة التي لزمت فعلياً في ADR-026 — أول محاولة قراءة/كتابة بعد ALTER/CREATE قد تفشل بخطأ
-- "column/table does not exist" بدونها رغم نجاح الأمر نفسه).

create table otp_challenges (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose text not null check (purpose in ('claim_account')), -- قيمة واحدة اليوم فقط — يُوسَّع عند حاجة فعلية (مثال: password_reset مستقبلاً)، لا استباقاً
  code_hash text not null,
  channel text not null check (channel in ('whatsapp', 'sms')),
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz, -- null = لم يُستهلَك بعد؛ محاولة تحقق ناجحة تضبطه فوراً (لا إعادة استخدام لنفس الرمز)
  created_at timestamptz not null default now()
);

alter table otp_challenges enable row level security;
-- بلا أي policy — قفل كامل، نفس نمط sessions/carts/audit_log (بيانات حساسة، Authentication DEEP،
-- AGENTS.md §17). وصول حصري عبر service_role (src/core/kernel/otp/otp.repository.ts).

create index otp_challenges_phone_purpose_idx on otp_challenges (phone, purpose);

NOTIFY pgrst, 'reload schema';
