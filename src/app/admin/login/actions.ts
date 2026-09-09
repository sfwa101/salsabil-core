'use server';
// تسجيل دخول الإدارة بالهاتف + كلمة مرور (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — يُغلق
// DD-001/INV-AUTHN-001، docs/DECISIONS.md ADR-013/ADR-014)

import { adminService } from '@/core/modules/admin/admin.service';
import { setAdminSessionCookie } from '@/core/modules/admin/admin-session';
import { egyptianPhoneSchema, passwordSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/core/kernel/security/rate-limit';

type LoginResult = { success: true; mustChangePassword: boolean } | { error: string };

export async function loginAdminAction(phone: string, password: string): Promise<LoginResult> {
  const parsedPhone = egyptianPhoneSchema.safeParse(phone);
  if (!parsedPhone.success) {
    return { error: parsedPhone.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  }
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? 'كلمة مرور غير صحيحة' };
  }

  const rateLimitKey = `admin:${parsedPhone.data}`;
  if (isRateLimited(rateLimitKey)) {
    return { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' };
  }

  const result = await adminService.loginByPhone(parsedPhone.data, parsedPassword.data);
  if (!result) {
    recordFailedAttempt(rateLimitKey);
    // رسالة موحَّدة عمداً — راجع specs/identity/PASSWORD_AUTH_SPEC.md §5
    return { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' };
  }

  clearAttempts(rateLimitKey);
  await setAdminSessionCookie(result.token);
  return { success: true, mustChangePassword: result.session.mustChangePassword };
}
