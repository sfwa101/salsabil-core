'use server';
// §31 بند 9 — تسجيل دخول سائق أساسي (مطلوب صراحة في §31 بند 9: "مسار دخول سائق أساسي"). V1 بلا
// حقل "مكتب" إضافي — يبحث عن أول عضوية drivers نشطة لهذا الهاتف (قرار معلَّق مبسَّط، راجع
// delivery.repository.ts.findDriverByUserId للتبرير الكامل).

import { khalilService } from '@/core/kernel/khalil/service';
import { deliveryService } from '@/core/modules/delivery/delivery.service';
import { setDeliverySessionCookie, DELIVERY_SESSION_TTL_SECONDS } from '@/core/modules/delivery/delivery-session';
import { egyptianPhoneSchema, passwordSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/core/kernel/security/rate-limit';

type LoginResult = { success: true; mustChangePassword: boolean } | { error: string };
const GENERIC_ERROR = 'رقم الهاتف أو كلمة المرور غير صحيحة';

export async function loginDriverAction(phone: string, password: string): Promise<LoginResult> {
  const parsedPhone = egyptianPhoneSchema.safeParse(phone);
  if (!parsedPhone.success) return { error: parsedPhone.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) return { error: parsedPassword.error.issues[0]?.message ?? 'كلمة مرور غير صحيحة' };

  const rateLimitKey = `delivery-driver:${parsedPhone.data}`;
  if (isRateLimited(rateLimitKey)) return { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' };

  const auth = await khalilService.verifyPasswordForPhone(parsedPhone.data, parsedPassword.data);
  const driver = auth.ok ? await deliveryService.getDriverByUserId(auth.user.id) : null;

  if (!auth.ok || !driver) {
    recordFailedAttempt(rateLimitKey);
    return { error: GENERIC_ERROR };
  }

  clearAttempts(rateLimitKey);
  const { token, session } = await khalilService.createSession({
    userId: auth.user.id,
    tenantId: null,
    role: 'customer', // راجع delivery-session.ts — قرار معلَّق بند 9
    ttlSeconds: DELIVERY_SESSION_TTL_SECONDS,
    mustChangePassword: auth.mustChangePassword,
  });
  await setDeliverySessionCookie(token);
  return { success: true, mustChangePassword: session.mustChangePassword };
}
