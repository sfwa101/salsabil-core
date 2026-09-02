// src/core/modules/merchant/merchant-session.ts
// هوية جلسة التاجر عبر cookie httpOnly يحمل token عشوائي فقط — أبداً tenantId/role مباشرة
// (SALSABIL_CONSTITUTION.md §4 بند 3). يُتحقَّق من الرمز حياً عبر khalilService في كل قراءة —
// لا ثقة بأي بيانات مخزَّنة في العميل نفسه. عكس cart-session.ts: لا إنشاء تلقائي — عدم وجود
// جلسة صالحة يعني "غير مسجَّل دخول"، لا هوية زائر جديدة.

import { cookies } from 'next/headers';
import { khalilService } from '../../kernel/khalil/service';
import type { Session } from '../../kernel/khalil/types';

const MERCHANT_SESSION_COOKIE = 'sb_merchant_session';

export async function getMerchantSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MERCHANT_SESSION_COOKIE)?.value;
  if (!token) return null;
  return khalilService.validateSessionToken(token);
}

export async function setMerchantSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(MERCHANT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearMerchantSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(MERCHANT_SESSION_COOKIE)?.value;
  if (token) {
    await khalilService.destroySession(token);
  }
  cookieStore.delete(MERCHANT_SESSION_COOKIE);
}
