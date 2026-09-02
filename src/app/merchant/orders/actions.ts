'use server';
// تغيير حالة طلب من لوحة التاجر — يفرض عزل المستأجرين عبر tenantId من الجلسة، لا من نموذج العميل
// (SALSABIL_CONSTITUTION.md §4 بند 3). راجع docs/DECISIONS.md ADR-012.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getMerchantSession, clearMerchantSessionCookie } from '@/core/modules/merchant/merchant-session';
import { ordersService } from '@/core/modules/orders/orders.service';
import type { OrderStatus } from '@/core/modules/orders/types';

type TransitionResult = { success: true } | { error: string };

export async function transitionOrderAction(orderId: string, toStatus: OrderStatus): Promise<TransitionResult> {
  const session = await getMerchantSession();
  if (!session || !session.tenantId) {
    return { error: 'الجلسة غير صالحة — سجّل الدخول مجدداً' };
  }

  try {
    await ordersService.transitionStatus({
      orderId,
      toStatus,
      actorRole: session.role,
      actorId: session.userId,
      tenantId: session.tenantId,
    });
    revalidatePath('/merchant/orders');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function logoutMerchantAction(): Promise<void> {
  await clearMerchantSessionCookie();
  redirect('/merchant/login');
}
