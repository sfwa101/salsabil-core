// src/core/modules/cart/cart-session.ts
// هوية سلة الزائر عبر cookie httpOnly — لا يُقرأ أي معرّف من قيمة يرسلها العميل مباشرة
// (ADR-008 في docs/DECISIONS.md). يُستخدَم من (reef)/cart/actions.ts و(reef)/checkout/actions.ts.

import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import type { CartIdentity } from './types';

const CART_COOKIE = 'sb_cart_session';

export async function getCartIdentity(): Promise<CartIdentity> {
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
