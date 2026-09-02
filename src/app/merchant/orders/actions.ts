'use server';
// تغيير حالة طلب من لوحة التاجر — يفرض عزل المستأجرين عبر tenantId من الجلسة، لا من نموذج العميل
// (SALSABIL_CONSTITUTION.md §4 بند 3). راجع docs/DECISIONS.md ADR-012/ADR-014.

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getMerchantSession, clearMerchantSessionCookie } from '@/core/modules/merchant/merchant-session';
import { ordersService } from '@/core/modules/orders/orders.service';
import { ORDER_STATUSES, type OrderStatus } from '@/core/modules/orders/types';
import { uuidSchema } from '@/core/kernel/validation/schemas';

type TransitionResult = { success: true } | { error: string };

const transitionInputSchema = z.object({
  orderId: uuidSchema,
  toStatus: z.enum(ORDER_STATUSES),
});

// أدوار التاجر المخوَّلة لهذا المسار — تأكيد صريح إضافي (اليوم 12، Defense-in-depth) بدل الاعتماد
// الضمني وحده على "فقط أدوار التاجر تملك tenantId غير null"
const MERCHANT_ACTOR_ROLES = ['merchant_owner', 'merchant_manager', 'employee'] as const;

export async function transitionOrderAction(orderId: string, toStatus: OrderStatus): Promise<TransitionResult> {
  const session = await getMerchantSession();
  if (!session || !session.tenantId || !MERCHANT_ACTOR_ROLES.includes(session.role as (typeof MERCHANT_ACTOR_ROLES)[number])) {
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
