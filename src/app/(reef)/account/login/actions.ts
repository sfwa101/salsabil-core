'use server';
// دخول عميل بالهاتف + كلمة مرور — نفس نمط src/app/merchant/login/actions.ts حرفياً

import { customerService } from '@/core/modules/customer/customer.service';
import { setCustomerSessionCookie } from '@/core/modules/customer/customer-session';
import { cartService } from '@/core/modules/cart/cart.service';
import { getExistingCartSessionToken } from '@/core/modules/cart/cart-session';
import { egyptianPhoneSchema, passwordSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/core/kernel/security/rate-limit';

type LoginResult = { success: true } | { error: string };

export async function loginCustomerAction(phone: string, password: string): Promise<LoginResult> {
  const parsedPhone = egyptianPhoneSchema.safeParse(phone);
  if (!parsedPhone.success) {
    return { error: parsedPhone.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  }
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    return { error: parsedPassword.error.issues[0]?.message ?? 'كلمة مرور غير صحيحة' };
  }

  const rateLimitKey = `customer:${parsedPhone.data}`;
  if (isRateLimited(rateLimitKey)) {
    return { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' };
  }

  const result = await customerService.login(parsedPhone.data, parsedPassword.data);
  if (!result) {
    recordFailedAttempt(rateLimitKey);
    // رسالة موحَّدة عمداً — نفس منطق دخول التاجر/الإدارة (يمنع Enumeration Attack)
    return { error: 'رقم الهاتف أو كلمة المرور غير صحيحة' };
  }

  clearAttempts(rateLimitKey);

  // CUSTOMER-IDENTITY-PHASE-1 — دمج سلة الضيف الحالية (إن وُجدت) داخل سلة العميل قبل تفعيل جلسته،
  // نفس ترتيب register أدناه. قراءة كوكي الضيف هنا آمنة (لا تتأثر بكوكي العميل الذي لم يُضبَط بعد).
  const guestSessionToken = await getExistingCartSessionToken();
  if (guestSessionToken) {
    await cartService.mergeGuestCartIntoUser(guestSessionToken, result.session.userId);
  }

  await setCustomerSessionCookie(result.token);
  return { success: true };
}
