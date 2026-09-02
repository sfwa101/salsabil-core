'use server';
// تسجيل دخول الإدارة بالهاتف بلا كلمة مرور (اليوم 11) — docs/DECISIONS.md ADR-013/ADR-014

import { adminService } from '@/core/modules/admin/admin.service';
import { setAdminSessionCookie } from '@/core/modules/admin/admin-session';
import { egyptianPhoneSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/core/kernel/security/rate-limit';

type LoginResult = { success: true } | { error: string };

export async function loginAdminAction(phone: string): Promise<LoginResult> {
  const parsed = egyptianPhoneSchema.safeParse(phone);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  }

  const rateLimitKey = `admin:${parsed.data}`;
  if (isRateLimited(rateLimitKey)) {
    return { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' };
  }

  const result = await adminService.loginByPhone(parsed.data);
  if (!result) {
    recordFailedAttempt(rateLimitKey);
    return { error: 'رقم الهاتف غير مسجَّل كمدير منصة، أو الحساب غير مفعَّل' };
  }

  clearAttempts(rateLimitKey);
  await setAdminSessionCookie(result.token);
  return { success: true };
}
