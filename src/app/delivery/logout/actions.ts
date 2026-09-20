'use server';
// §31 بند 9 — تسجيل خروج مشترك لمكتب التوصيل/السائق معاً (نفس آلية الجلسة).

import { redirect } from 'next/navigation';
import { clearDeliverySessionCookie } from '@/core/modules/delivery/delivery-session';

export async function logoutDeliveryAction(): Promise<void> {
  await clearDeliverySessionCookie();
  redirect('/delivery/office/login');
}
