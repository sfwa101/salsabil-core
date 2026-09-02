// src/core/modules/admin/admin-session.ts
// هوية جلسة الإدارة عبر cookie httpOnly مستقل عن sb_merchant_session — يحمل token عشوائي فقط
// (نفس نمط merchant-session.ts، ADR-012). فحص إضافي هنا لا يوجد في merchant-session.ts: يتحقق
// صراحة أن role الجلسة platform_admin — ضروري تحديداً لأن جلسات الإدارة tenantId فيها null
// دائماً بتصميم، فلا يوجد فحص "tenantId موجود؟" الذي يحمي merchant-session.ts ضمنياً من جلسة
// دور آخر تُنسَخ يدوياً لكوكي مختلف (راجع ADR-013).

import { cookies } from 'next/headers';
import { khalilService } from '../../kernel/khalil/service';
import type { Session } from '../../kernel/khalil/types';

const ADMIN_SESSION_COOKIE = 'sb_admin_session';

export async function getAdminSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await khalilService.validateSessionToken(token);
  if (!session || session.role !== 'platform_admin') return null;
  return session;
}

export async function setAdminSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (token) {
    await khalilService.destroySession(token);
  }
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
