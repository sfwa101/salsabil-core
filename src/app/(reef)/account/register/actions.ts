'use server';
// تسجيل حساب عميل جديد — لهاتف لم يُستخدَم إطلاقاً من قبل فقط. لهاتف له صف موجود مسبقاً (ضيف سابق
// مثلاً)، المسار هو /account/claim (ADR-030، تحقق OTP)، لا هذا الملف.

import { z } from 'zod';
import { customerService } from '@/core/modules/customer/customer.service';
import { setCustomerSessionCookie } from '@/core/modules/customer/customer-session';
import { cartService } from '@/core/modules/cart/cart.service';
import { getExistingCartSessionToken } from '@/core/modules/cart/cart-session';
import { egyptianPhoneSchema, passwordSchema } from '@/core/kernel/validation/schemas';

const registerInputSchema = z.object({
  fullName: z.string().trim().min(1, 'الاسم مطلوب'),
  phone: egyptianPhoneSchema,
  password: passwordSchema,
});

type RegisterFormInput = z.input<typeof registerInputSchema>;
type RegisterActionResult = { success: true } | { error: string; accountExists?: boolean };

export async function registerCustomerAction(input: RegisterFormInput): Promise<RegisterActionResult> {
  const parsed = registerInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'بيانات غير صحيحة' };
  }

  const result = await customerService.register(parsed.data);
  if ('error' in result) {
    // رسالة صريحة هنا (بعكس رسالة الدخول الموحَّدة) — العميل هو من يطلب التسجيل بهاتفه هو، فلا خطر
    // Enumeration حقيقي (هو أصلاً يعرف رقمه). accountExists: true يفعِّل رابط "استرجاع الحساب"
    // (/account/claim، ADR-030) في الواجهة بدل رسالة نصية فقط.
    return { error: 'رقم الهاتف مسجَّل بالفعل', accountExists: true };
  }

  // CUSTOMER-IDENTITY-PHASE-1 — دمج سلة الضيف الحالية (إن وُجدت) داخل سلة الحساب الجديد. عند تعارض
  // نفس المنتج/الاختيار: تُجمَع الكميات، لا استبدال (قرار مؤسس صريح، راجع cartService.
  // mergeGuestCartIntoUser).
  const guestSessionToken = await getExistingCartSessionToken();
  if (guestSessionToken) {
    await cartService.mergeGuestCartIntoUser(guestSessionToken, result.session.userId);
  }

  await setCustomerSessionCookie(result.token);
  return { success: true };
}
