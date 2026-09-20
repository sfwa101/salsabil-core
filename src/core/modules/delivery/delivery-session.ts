// src/core/modules/delivery/delivery-session.ts
// هوية جلسة مشتركة بين مالك مكتب التوصيل والسائق (نفس نمط merchant-session.ts المشترك بين
// owner/staff) — كوكي httpOnly يحمل token عشوائي فقط، يُتحقَّق منه حياً عبر khalilService في كل قراءة.
//
// ⚠️ قرار معلَّق موثَّق (راجع سجل البناء الليلي 2026-09-20 → بند 9): sessions.role يحمل قيد CHECK
// (scripts/schema-setup.sql) لم يُحدَّث ليشمل 'driver' (على عكس users.role الذي تم توسيعه فعلاً في
// TASK-12) — محاولة إنشاء جلسة بـrole:'driver' سترفضها قاعدة البيانات فوراً. بانتظار تنفيذ يدوي
// لـscripts/2026-09-20-add-driver-role-to-sessions-check.sql من المؤسس، الجلسات هنا (لكل من مالك
// المكتب والسائق) تُخزَّن مؤقتاً بـrole:'customer' (أدنى صلاحية في النظام، بلا أي امتياز إضافي في
// أي مكان آخر بالتطبيق) — التخويل الحقيقي الوحيد يأتي من فحص عضوية delivery_offices/drivers صراحة
// في كل Server Action مستهلك (deliveryService)، لا من قيمة role نفسها إطلاقاً.

import { cookies } from 'next/headers';
import { khalilService } from '../../kernel/khalil/service';
import type { Session } from '../../kernel/khalil/types';

const DELIVERY_SESSION_COOKIE = 'sb_delivery_session';
export const DELIVERY_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 أيام، نفس مدة جلسة التاجر

export async function getDeliverySession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DELIVERY_SESSION_COOKIE)?.value;
  if (!token) return null;
  return khalilService.validateSessionToken(token);
}

export async function setDeliverySessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DELIVERY_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DELIVERY_SESSION_TTL_SECONDS,
  });
}

export async function clearDeliverySessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DELIVERY_SESSION_COOKIE)?.value;
  if (token) {
    await khalilService.destroySession(token);
  }
  cookieStore.delete(DELIVERY_SESSION_COOKIE);
}
