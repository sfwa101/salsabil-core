'use server';
// §31 بند 9 — نفس نمط merchant/change-password/actions.ts حرفياً (دوران الجلسة، لا تعديلها) — الفرق
// الوحيد: لا يتطلب tenantId (مفهوم غير موجود لجلسات مكتب/سائق التوصيل، tenantId دائماً null هنا).

import { khalilService } from '@/core/kernel/khalil/service';
import { auditService } from '@/core/modules/audit/audit.service';
import { passwordSchema } from '@/core/kernel/validation/schemas';
import { getDeliverySession, clearDeliverySessionCookie, setDeliverySessionCookie, DELIVERY_SESSION_TTL_SECONDS } from '@/core/modules/delivery/delivery-session';

type Result = { success: true } | { error: string };

export async function changeDeliveryPasswordAction(newPassword: string, confirmPassword: string): Promise<Result> {
  const session = await getDeliverySession();
  if (!session) {
    return { error: 'الجلسة غير صالحة — سجّل الدخول من جديد' };
  }
  if (newPassword !== confirmPassword) {
    return { error: 'كلمتا المرور غير متطابقتين' };
  }
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'كلمة مرور غير صالحة' };
  }

  await khalilService.setNewPassword(session.userId, parsed.data);
  await auditService.log({
    actorId: session.userId,
    actorRole: session.role,
    action: 'auth.password_changed',
    entityType: 'user',
    entityId: session.userId,
  });

  await clearDeliverySessionCookie();
  const result = await khalilService.createSession({
    userId: session.userId,
    tenantId: null,
    role: session.role,
    ttlSeconds: DELIVERY_SESSION_TTL_SECONDS,
    mustChangePassword: false,
  });
  await setDeliverySessionCookie(result.token);

  return { success: true };
}
