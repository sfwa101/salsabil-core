'use server';
// السلة تُعرَّف عبر session_token في cookie httpOnly — لا يُقرأ أي معرّف من قيمة يرسلها العميل
// مباشرة (ADR-008 في docs/DECISIONS.md). كل الوصول لبيانات السلة يمر عبر cartService.

import { revalidatePath } from 'next/cache';
import { cartService } from '@/core/modules/cart/cart.service';
import { getCartIdentity } from '@/core/modules/cart/cart-session';
import type { AddItemInput, CartSummary } from '@/core/modules/cart/types';

type ActionResult = { summary: CartSummary } | { error: string };

export async function getCartSummaryAction(): Promise<CartSummary> {
  const identity = await getCartIdentity();
  const cart = await cartService.getOrCreateCart(identity);
  return cartService.getSummary(cart.id);
}

export async function addToCartAction(input: AddItemInput): Promise<ActionResult> {
  const identity = await getCartIdentity();
  const cart = await cartService.getOrCreateCart(identity);
  try {
    const summary = await cartService.addItem(cart.id, input);
    revalidatePath('/cart');
    return { summary };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult> {
  const identity = await getCartIdentity();
  const cart = await cartService.getOrCreateCart(identity);
  try {
    const summary = await cartService.updateItemQuantity(cart.id, itemId, quantity);
    revalidatePath('/cart');
    return { summary };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const identity = await getCartIdentity();
  const cart = await cartService.getOrCreateCart(identity);
  const summary = await cartService.removeItem(cart.id, itemId);
  revalidatePath('/cart');
  return { summary };
}
