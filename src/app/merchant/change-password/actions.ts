'use server';
// src/app/merchant/change-password/actions.ts — URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH
// راجع specs/identity/PASSWORD_AUTH_SPEC.md §5 لتفصيل تدفق دوران الجلسة الكامل.

import { khalilService } from '@/core/kernel/khalil/service';
import { auditService } from '@/core/modules/audit/audit.service';
import { passwordSchema } from '@/core/kernel/validation/schemas';
import { getMerchantSession, clearMerchantSessionCookie, setMerchantSessionCookie } from '@/core/modules/merchant/merchant-session';
import { MERCHANT_SESSION_TTL_SECONDS } from '@/core/modules/merchant/merchant.service';

type Result = { success: true } | { error: string };

export async function changeMerchantPasswordAction(newPassword: string, confirmPassword: string): Promise<Result> {
  const session = await getMerchantSession();
  if (!session || !session.tenantId) {
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

  // دوران الجلسة (لا تعديل الجلسة القائمة) — جلسة جديدة نظيفة بـ mustChangePassword: false،
  // يعيد استخدام clearMerchantSessionCookie/createSession/setMerchantSessionCookie حرفياً.
  await clearMerchantSessionCookie();
  const result = await khalilService.createSession({
    userId: session.userId,
    tenantId: session.tenantId,
    role: session.role,
    ttlSeconds: MERCHANT_SESSION_TTL_SECONDS,
    mustChangePassword: false,
  });
  await setMerchantSessionCookie(result.token);

  return { success: true };
}
