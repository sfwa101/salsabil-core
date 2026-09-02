'use server';
// تحويل السلة الحالية (نفس هوية cookie الجلسة) إلى طلب PENDING — docs/DECISIONS.md ADR-009

import { revalidatePath } from 'next/cache';
import { ordersService } from '@/core/modules/orders/orders.service';
import { getCartIdentity } from '@/core/modules/cart/cart-session';
import type { DeliveryAddress, Order } from '@/core/modules/orders/types';

type CheckoutFormInput = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: DeliveryAddress;
};

type CheckoutResult = { order: Order } | { error: string };

export async function submitCheckoutAction(input: CheckoutFormInput): Promise<CheckoutResult> {
  const identity = await getCartIdentity();
  try {
    const order = await ordersService.checkout({ identity, ...input });
    revalidatePath('/cart');
    return { order };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}
