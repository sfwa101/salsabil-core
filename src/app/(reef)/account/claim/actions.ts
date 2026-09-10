'use server';
// ادّعاء حساب عميل ضيف موجود مسبقاً — تحقق OTP حقيقي (WhatsApp/SMS Misr، ADR-030) قبل السماح بضبط
// كلمة مرور جديدة على حساب لا يملك واحدة بعد.

import { z } from 'zod';
import { customerService } from '@/core/modules/customer/customer.service';
import { setCustomerSessionCookie } from '@/core/modules/customer/customer-session';
import { cartService } from '@/core/modules/cart/cart.service';
import { getExistingCartSessionToken } from '@/core/modules/cart/cart-session';
import { egyptianPhoneSchema, passwordSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, OTP_SEND_RATE_LIMIT } from '@/core/kernel/security/rate-limit';

type StartClaimResult = { success: true; channel: 'whatsapp' | 'sms' } | { error: string };

export async function startClaimAction(phone: string): Promise<StartClaimResult> {
  const parsedPhone = egyptianPhoneSchema.safeParse(phone);
  if (!parsedPhone.success) {
    return { error: parsedPhone.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  }

  // OTP_SEND_RATE_LIMIT أضيق من LOGIN_RATE_LIMIT عمداً — كل إرسال ناجح تكلفة حقيقية بالمال
  const rateLimitKey = `otp:claim:${parsedPhone.data}`;
  if (isRateLimited(rateLimitKey, OTP_SEND_RATE_LIMIT)) {
    return { error: 'طلبات كثيرة لهذا الرقم — حاول مرة أخرى بعد قليل' };
  }

  const result = await customerService.startClaim(parsedPhone.data);
  if ('error' in result) {
    recordFailedAttempt(rateLimitKey, OTP_SEND_RATE_LIMIT);
    return { error: result.error };
  }

  return { success: true, channel: result.channel };
}

const confirmSchema = z.object({
  phone: egyptianPhoneSchema,
  code: z.string().regex(/^\d{6}$/, 'رمز التحقق يجب أن يكون 6 أرقام'),
  newPassword: passwordSchema,
});
type ConfirmClaimInput = z.input<typeof confirmSchema>;
type ConfirmClaimResult = { success: true } | { error: string };

export async function confirmClaimAction(input: ConfirmClaimInput): Promise<ConfirmClaimResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' };
  }

  const result = await customerService.confirmClaim(parsed.data.phone, parsed.data.code, parsed.data.newPassword);
  if ('error' in result) {
    return { error: 'رمز التحقق غير صحيح أو منتهي الصلاحية' };
  }

  // نفس منطق register/login — دمج سلة الضيف الحالية (إن وُجدت) قبل تفعيل جلسة العميل
  const guestSessionToken = await getExistingCartSessionToken();
  if (guestSessionToken) {
    await cartService.mergeGuestCartIntoUser(guestSessionToken, result.session.userId);
  }

  await setCustomerSessionCookie(result.token);
  return { success: true };
}
