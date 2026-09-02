'use server';
// تحويل السلة الحالية (نفس هوية cookie الجلسة) إلى طلب PENDING — docs/DECISIONS.md ADR-009/ADR-014

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ordersService } from '@/core/modules/orders/orders.service';
import { getCartIdentity } from '@/core/modules/cart/cart-session';
import { egyptianPhoneSchema } from '@/core/kernel/validation/schemas';
import type { Order } from '@/core/modules/orders/types';

const checkoutInputSchema = z.object({
  customerName: z.string().trim().min(1, 'الاسم مطلوب'),
  customerPhone: egyptianPhoneSchema,
  deliveryAddress: z.object({
    line1: z.string().trim().min(1, 'العنوان مطلوب'),
    city: z.string().trim().min(1, 'المدينة مطلوبة'),
    notes: z.string().trim().optional(),
  }),
});

type CheckoutFormInput = z.input<typeof checkoutInputSchema>;

type CheckoutResult = { order: Order } | { error: string };

export async function submitCheckoutAction(input: CheckoutFormInput): Promise<CheckoutResult> {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'بيانات الطلب غير صحيحة' };
  }

  const identity = await getCartIdentity();
  try {
    const order = await ordersService.checkout({ identity, ...parsed.data });
    revalidatePath('/cart');
    return { order };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
