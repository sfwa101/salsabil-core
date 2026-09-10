// src/core/modules/customer/customer-session.ts
// هوية جلسة العميل عبر cookie httpOnly يحمل token عشوائي فقط — نفس نمط merchant-session.ts/
// admin-session.ts حرفياً (SALSABIL_CONSTITUTION.md §4 بند 3). لا إنشاء تلقائي — عدم وجود جلسة
// صالحة يعني "عميل ضيف" (Guest Mode يبقى الافتراضي دائماً، لا هوية جديدة تُفرَض).
//
// فحص role === 'customer' صريح هنا (لا الاكتفاء بفحص tenantId=null) — نفس سبب admin-session.ts
// بالضبط: tenantId فارغ (null) مشترك بين جلسات customer وplatform_admin معاً، فلا يكفي مميّزاً
// وحده. بدون هذا الفحص، رمز جلسة تاجر/إدارة حقيقي (لو وُضع خطأً أو عمداً في كوكي العميل) كان
// سيُقرأ هنا كجلسة عميل صالحة — خلط صلاحيات حقيقي (Guardian Matrix: Authorization/RBAC = DEEP).

import { cookies } from 'next/headers';
import { khalilService } from '../../kernel/khalil/service';
import type { Session } from '../../kernel/khalil/types';

const CUSTOMER_SESSION_COOKIE = 'sb_customer_session';

export async function getCustomerSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await khalilService.validateSessionToken(token);
  if (!session || session.role !== 'customer') return null;
  return session;
}

export async function setCustomerSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCustomerSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (token) {
    await khalilService.destroySession(token);
  }
  cookieStore.delete(CUSTOMER_SESSION_COOKIE);
}
