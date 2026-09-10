'use server';
// خروج عميل — نفس نمط clearCustomerSessionCookie (تدمير الجلسة الحقيقية + حذف الكوكي)

import { clearCustomerSessionCookie } from '@/core/modules/customer/customer-session';

export async function logoutCustomerAction(): Promise<void> {
  await clearCustomerSessionCookie();
}
