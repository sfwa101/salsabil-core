'use server';
// تسجيل دخول التاجر بالهاتف بلا كلمة مرور (اليوم 10) — docs/DECISIONS.md ADR-012/ADR-014

import { merchantService } from '@/core/modules/merchant/merchant.service';
import { setMerchantSessionCookie } from '@/core/modules/merchant/merchant-session';
import { egyptianPhoneSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/core/kernel/security/rate-limit';

type LoginResult = { success: true } | { error: string };

export async function loginMerchantAction(phone: string): Promise<LoginResult> {
  const parsed = egyptianPhoneSchema.safeParse(phone);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  }

  const rateLimitKey = `merchant:${parsed.data}`;
  if (isRateLimited(rateLimitKey)) {
    return { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' };
  }

  const result = await merchantService.loginOwnerByPhone(parsed.data);
  if (!result) {
    recordFailedAttempt(rateLimitKey);
    return { error: 'رقم الهاتف غير مسجَّل كتاجر، أو الحساب غير مفعَّل' };
  }

  clearAttempts(rateLimitKey);
  await setMerchantSessionCookie(result.token);
  return { success: true };
}
