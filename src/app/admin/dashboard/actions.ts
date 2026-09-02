'use server';
// عمليات لوحة الإدارة — كل دالة تتحقق أولاً أن الجلسة platform_admin فعلياً (عبر getAdminSession،
// الذي يرفض أي جلسة بدور آخر حتى لو وصل رمزها لهذا الكوكي بطريقة ما). راجع docs/DECISIONS.md ADR-013/ADR-014.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getAdminSession, clearAdminSessionCookie } from '@/core/modules/admin/admin-session';
import { adminService } from '@/core/modules/admin/admin.service';
import { ordersService } from '@/core/modules/orders/orders.service';
import { ORDER_STATUSES, type OrderStatus } from '@/core/modules/orders/types';
import { uuidSchema } from '@/core/kernel/validation/schemas';

type ActionResult = { success: true } | { error: string };

export async function setMerchantActiveStatusAction(merchantId: string, isActive: boolean): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };
  }

  const parsed = uuidSchema.safeParse(merchantId);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'معرّف تاجر غير صحيح' };
  }

  try {
    await adminService.setMerchantActiveStatus(parsed.data, isActive, { id: session.userId, role: session.role });
    revalidatePath('/admin/dashboard');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

const transitionInputSchema = z.object({
  orderId: uuidSchema,
  toStatus: z.enum(ORDER_STATUSES),
});

export async function transitionOrderAdminAction(orderId: string, toStatus: OrderStatus): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session) {
    return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };
  }

  const parsed = transitionInputSchema.safeParse({ orderId, toStatus });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'مدخلات غير صحيحة' };
  }

  try {
    await ordersService.transitionStatus({
      orderId: parsed.data.orderId,
      toStatus: parsed.data.toStatus,
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
