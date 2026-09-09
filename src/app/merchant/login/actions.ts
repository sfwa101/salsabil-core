'use server';
// تسجيل دخول التاجر بالهاتف + كلمة مرور (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — يُغلق
// DD-001/INV-AUTHN-001، docs/DECISIONS.md ADR-012/ADR-014)

import { merchantService } from '@/core/modules/merchant/merchant.service';
import { setMerchantSessionCookie } from '@/core/modules/merchant/merchant-session';
import { egyptianPhoneSchema, passwordSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/core/kernel/security/rate-limit';

type LoginResult = { success: true; mustChangePassword: boolean } | { error: string };

export async function loginMerchantAction(phone: string, password: string): Promise<LoginResult> {
  const parsedPhone = egyptianPhoneSchema.safeParse(phone);
  if (!parsedPhone.success) {
    return { error: parsedPhone.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  }
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? 'كلمة مرور غير صحيحة' };
  }

  const rateLimitKey = `merchant:${parsedPhone.data}`;
  if (isRateLimited(rateLimitKey)) {
    return { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' };
  }

  const result = await merchantService.loginOwnerByPhone(parsedPhone.data, parsedPassword.data);
  if (!result) {
    recordFailedAttempt(rateLimitKey);
    // رسالة موحَّدة عمداً (لا تمييز "هاتف غير مسجَّل" عن "كلمة مرور خاطئة") — يمنع تعداد أرقام
    // هواتف تجار حقيقيين (Enumeration Attack)، راجع specs/identity/PASSWORD_AUTH_SPEC.md §5.
    return { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' };
  }

  clearAttempts(rateLimitKey);
  await setMerchantSessionCookie(result.token);
  return { success: true, mustChangePassword: result.session.mustChangePassword };
}
