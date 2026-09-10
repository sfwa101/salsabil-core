// src/core/modules/cart/cart-session.ts
// هوية سلة الزائر عبر cookie httpOnly — لا يُقرأ أي معرّف من قيمة يرسلها العميل مباشرة
// (ADR-008 في docs/DECISIONS.md). يُستخدَم من (reef)/cart/actions.ts و(reef)/checkout/actions.ts.
//
// CUSTOMER-IDENTITY-PHASE-1 — كلتا الدالتين تفحصان جلسة عميل مسجَّل أولاً (getCustomerSession) قبل
// كوكي الضيف: عميل سجَّل دخوله سلته بـuserId لا sessionToken (carts_identity_xor، ADR-008) — بلا
// هذا الفحص يبقى Guest Mode مفروضاً فعلياً حتى بعد الدخول (عدّاد الهيدر/الإضافة للسلة كلاهما كانا
// سيستمران بالتعامل مع سلة الزائر القديمة، لا سلة العميل الحقيقية).

import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { getCustomerSession } from '../customer/customer-session';
import type { CartIdentity } from './types';

// مُصدَّرة لاستخدامها أيضاً من src/middleware.ts (اليوم 14) — مصدر حقيقة واحد لاسم/خيارات
// الكوكي بدل ازدواجها بين ملفين.
export const CART_COOKIE = 'sb_cart_session';
export const CART_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 180,
};

export async function getCartIdentity(): Promise<CartIdentity> {
  const customerSession = await getCustomerSession();
  if (customerSession) {
    return { userId: customerSession.userId };
  }

  const cookieStore = await cookies();
  let token = cookieStore.get(CART_COOKIE)?.value;
  if (!token) {
    token = randomUUID();
    cookieStore.set(CART_COOKIE, token, CART_COOKIE_OPTIONS);
  }
  return { sessionToken: token };
}

// قراءة بلا إنشاء إطلاقاً — للاستخدام من مسارات عرض فقط (عدّاد الـHeader، اليوم 14) حيث لا
// يجوز كتابة كوكي أثناء عرض RSC، ولا داعي فعلياً لإنشاء سلة لزائر لم يلمسها بعد.
export async function getExistingCartSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CART_COOKIE)?.value ?? null;
}

// نفس فحص getCartIdentity أعلاه (عميل مسجَّل أولاً)، لكن بلا إنشاء كوكي إطلاقاً — لمسارات العرض
// فقط (عدّاد/إجمالي الهيدر، ملخّص صفحة الحي)، نفس قيد getExistingCartSessionToken تماماً.
export async function getExistingCartIdentity(): Promise<CartIdentity | null> {
  const customerSession = await getCustomerSession();
  if (customerSession) {
    return { userId: customerSession.userId };
  }

  const token = await getExistingCartSessionToken();
  return token ? { sessionToken: token } : null;
}
