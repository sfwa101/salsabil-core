'use server';
// السلة تُعرَّف عبر session_token في cookie httpOnly — لا يُقرأ أي معرّف من قيمة يرسلها العميل
// مباشرة (ADR-008 في docs/DECISIONS.md). كل الوصول لبيانات السلة يمر عبر cartService.

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import { cartService } from '@/core/modules/cart/cart.service';
import type { AddItemInput, CartSummary } from '@/core/modules/cart/types';

const CART_COOKIE = 'sb_cart_session';

async function getCartIdentity() {
  const cookieStore = await cookies();
  let token = cookieStore.get(CART_COOKIE)?.value;
  if (!token) {
    token = randomUUID();
    cookieStore.set(CART_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return { sessionToken: token };
}

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
