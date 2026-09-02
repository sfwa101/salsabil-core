'use server';
// عمليات لوحة الإدارة — كل دالة تتحقق أولاً أن الجلسة platform_admin فعلياً (عبر getAdminSession،
// الذي يرفض أي جلسة بدور آخر حتى لو وصل رمزها لهذا الكوكي بطريقة ما). راجع docs/DECISIONS.md ADR-013.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminSession, clearAdminSessionCookie } from '@/core/modules/admin/admin-session';
import { adminService } from '@/core/modules/admin/admin.service';
import { ordersService } from '@/core/modules/orders/orders.service';
import type { OrderStatus } from '@/core/modules/orders/types';

type ActionResult = { success: true } | { error: string };

export async function setMerchantActiveStatusAction(merchantId: string, isActive: boolean): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };
  }

  try {
    await adminService.setMerchantActiveStatus(merchantId, isActive);
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function transitionOrderAdminAction(orderId: string, toStatus: OrderStatus): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };
  }

  try {
    await ordersService.transitionStatus({
      orderId,
      toStatus,
      actorRole: session.role,
      actorId: session.userId,
      // بلا tenantId عمداً — platform_admin غير مقيَّد بمستأجر واحد (ORDER_TRANSITION_ACTORS/
      // TENANT_SCOPED_ACTOR_ROLES في orders/types.ts وorders.service.ts)
    });
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function logoutAdminAction(): Promise<void> {
  await clearAdminSessionCookie();
  redirect('/admin/login');
}
