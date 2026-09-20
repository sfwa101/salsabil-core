'use server';
// §31 بند 7 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §5/§29 بند 8) — مسار تسجيل دخول موظف
// التاجر، منفصل عن دخول المالك (merchant/login/actions.ts). Backend جاهز بالكامل (TASK-14،
// merchantStaffService) — هذا أول مستهلك واجهة/تسجيل دخول فعلي له، صفر Backend جديد باستثناء
// merchantService.findBySlug (تمريرة رقيقة). نفس نمط anti-enumeration/rate-limit في owner login.

import { merchantService, MERCHANT_SESSION_TTL_SECONDS } from '@/core/modules/merchant/merchant.service';
import { merchantStaffService } from '@/core/modules/merchantStaff/merchantStaff.service';
import { khalilService } from '@/core/kernel/khalil/service';
import { setMerchantSessionCookie } from '@/core/modules/merchant/merchant-session';
import { egyptianPhoneSchema, passwordSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/core/kernel/security/rate-limit';

type LoginResult = { success: true; mustChangePassword: boolean } | { error: string };

// رسالة رفض موحَّدة واحدة بصرف النظر عن السبب الحقيقي (معرّف متجر خاطئ/هاتف غير مسجَّل/كلمة مرور
// خاطئة/عضوية غير نشطة) — يمنع تعداد معرّفات متاجر أو أرقام هواتف موظفين حقيقيين، نفس فلسفة
// specs/identity/PASSWORD_AUTH_SPEC.md §5 المُطبَّقة أصلاً لدخول المالك.
const GENERIC_ERROR = 'بيانات الدخول غير صحيحة';

export async function loginStaffAction(merchantSlug: string, phone: string, password: string): Promise<LoginResult> {
  const parsedPhone = egyptianPhoneSchema.safeParse(phone);
  if (!parsedPhone.success) {
    return { error: parsedPhone.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  }
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? 'كلمة مرور غير صحيحة' };
  }
  const slug = merchantSlug.trim().toLowerCase();
  if (!slug) {
    return { error: 'أدخل معرّف المتجر' };
  }

  const rateLimitKey = `merchant-staff:${slug}:${parsedPhone.data}`;
  if (isRateLimited(rateLimitKey)) {
    return { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' };
  }

  // ترتيب متعمَّد: verifyPasswordForPhone يُنفَّذ دائماً أولاً (بصرف النظر عن صلاحية slug) — نفس
  // فلسفة FIX-TIMING-ATTACK-VULNERABILITY-AUTH (khalil.service.ts) لكلفة زمنية متقاربة، بدل تخطّي
  // فحص كلمة المرور كلياً لمعرّف متجر غير موجود (فرق زمني قابل للقياس يسمح بتعداد slugs صحيحة).
  const auth = await khalilService.verifyPasswordForPhone(parsedPhone.data, parsedPassword.data);
  const merchant = await merchantService.findBySlug(slug);

  let isActiveStaffMember = false;
  if (merchant && auth.ok) {
    try {
      await merchantStaffService.assertActiveStaff(merchant.id, auth.user.id);
      isActiveStaffMember = true;
    } catch {
      isActiveStaffMember = false;
    }
  }

  if (!merchant || !auth.ok || !isActiveStaffMember) {
    recordFailedAttempt(rateLimitKey);
    return { error: GENERIC_ERROR };
  }

  clearAttempts(rateLimitKey);
  const { token, session } = await khalilService.createSession({
    userId: auth.user.id,
    tenantId: merchant.id,
    role: 'employee',
    ttlSeconds: MERCHANT_SESSION_TTL_SECONDS,
    mustChangePassword: auth.mustChangePassword,
  });
  await setMerchantSessionCookie(token);
  return { success: true, mustChangePassword: session.mustChangePassword };
}
