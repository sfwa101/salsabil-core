'use server';
// تسجيل دخول الإدارة بالهاتف بلا كلمة مرور (اليوم 11) — docs/DECISIONS.md ADR-013

import { adminService } from '@/core/modules/admin/admin.service';
import { setAdminSessionCookie } from '@/core/modules/admin/admin-session';

type LoginResult = { success: true } | { error: string };

export async function loginAdminAction(phone: string): Promise<LoginResult> {
  const result = await adminService.loginByPhone(phone);
  if (!result) {
    return { error: 'رقم الهاتف غير مسجَّل كمدير منصة، أو الحساب غير مفعَّل' };
  }
  await setAdminSessionCookie(result.token);
  return { success: true };
}
