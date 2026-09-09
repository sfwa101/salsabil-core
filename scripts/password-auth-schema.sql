-- scripts/password-auth-schema.sql
-- URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — يُغلق DD-001/INV-AUTHN-001 (docs/SECURITY.md §1 BLOCKER)
-- راجع specs/identity/PASSWORD_AUTH_SPEC.md §4 للتبرير الكامل.
--
-- تنفيذ يدوي عبر Supabase SQL Editor (dev أولاً، ثم staging/الإنتاج لاحقاً بنفس النص) — لا نظام
-- Migrations رسمي بعد في هذا المشروع (docs/SECURITY.md OPEN_QUESTIONS بند 8، غير محسوم هنا).
--
-- ⚠️ بعد تشغيل هذا الملف مباشرة، شغّل: npx tsx scripts/backfill-existing-owner-passwords.ts
-- وإلا يُقفَل على حسابَي التاجر التجريبي (01000000000) والإدارة التجريبي (01000000001) فوراً
-- (password_hash يبقى null لهما = رفض دخول دائم، Fail Closed).

alter table users add column password_hash text;
alter table users add column must_change_password boolean not null default false;

alter table sessions add column must_change_password boolean not null default false;
