'use server';
// src/app/admin/change-password/actions.ts — URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH
// نفس نمط src/app/merchant/change-password/actions.ts حرفياً — راجع
// specs/identity/PASSWORD_AUTH_SPEC.md §5. tenantId دائماً null (الإدارة لا تنتمي لتاجر).

import { khalilService } from '@/core/kernel/khalil/service';
import { auditService } from '@/core/modules/audit/audit.service';
import { passwordSchema } from '@/core/kernel/validation/schemas';
import { getAdminSession, clearAdminSessionCookie, setAdminSessionCookie } from '@/core/modules/admin/admin-session';
import { ADMIN_SESSION_TTL_SECONDS } from '@/core/modules/admin/admin.service';

type Result = { success: true } | { error: string };

export async function changeAdminPasswordAction(newPassword: string, confirmPassword: string): Promise<Result> {
  const session = await getAdminSession();
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

  await clearAdminSessionCookie();
  const result = await khalilService.createSession({
    userId: session.userId,
    tenantId: null,
    role: session.role,
    ttlSeconds: ADMIN_SESSION_TTL_SECONDS,
    mustChangePassword: false,
  });
  await setAdminSessionCookie(result.token);

  return { success: true };
}
