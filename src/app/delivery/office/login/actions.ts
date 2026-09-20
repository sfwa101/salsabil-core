'use server';
// §31 بند 9 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §7) — تسجيل دخول مالك مكتب توصيل. نفس نمط
// merchant/login/actions.ts حرفياً (verifyPasswordForPhone + rate-limit + رسالة رفض موحَّدة).

import { khalilService } from '@/core/kernel/khalil/service';
import { deliveryService } from '@/core/modules/delivery/delivery.service';
import { setDeliverySessionCookie, DELIVERY_SESSION_TTL_SECONDS } from '@/core/modules/delivery/delivery-session';
import { egyptianPhoneSchema, passwordSchema } from '@/core/kernel/validation/schemas';
import { isRateLimited, recordFailedAttempt, clearAttempts } from '@/core/kernel/security/rate-limit';

type LoginResult = { success: true; mustChangePassword: boolean } | { error: string };
const GENERIC_ERROR = 'رقم الهاتف أو كلمة المرور غير صحيحة';

export async function loginOfficeAction(phone: string, password: string): Promise<LoginResult> {
  const parsedPhone = egyptianPhoneSchema.safeParse(phone);
  if (!parsedPhone.success) return { error: parsedPhone.error.issues[0]?.message ?? 'رقم هاتف غير صحيح' };
  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) return { error: parsedPassword.error.issues[0]?.message ?? 'كلمة مرور غير صحيحة' };

  const rateLimitKey = `delivery-office:${parsedPhone.data}`;
  if (isRateLimited(rateLimitKey)) return { error: 'محاولات دخول كثيرة — حاول مرة أخرى بعد قليل' };

  const auth = await khalilService.verifyPasswordForPhone(parsedPhone.data, parsedPassword.data);
  const office = auth.ok ? await deliveryService.getOfficeByOwnerId(auth.user.id) : null;

  if (!auth.ok || !office || !office.isActive) {
    recordFailedAttempt(rateLimitKey);
    return { error: GENERIC_ERROR };
  }

  clearAttempts(rateLimitKey);
  // راجع delivery-session.ts للتبرير الكامل لـrole:'customer' المؤقت (قرار معلَّق بند 9 —
  // sessions_role_check لم يُحدَّث بعد ليشمل قيمة مخصَّصة لمكتب التوصيل).
  const { token, session } = await khalilService.createSession({
    userId: auth.user.id,
    tenantId: null,
    role: 'customer',
    ttlSeconds: DELIVERY_SESSION_TTL_SECONDS,
    mustChangePassword: auth.mustChangePassword,
  });
  await setDeliverySessionCookie(token);
  return { success: true, mustChangePassword: session.mustChangePassword };
}
