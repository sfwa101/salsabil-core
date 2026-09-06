// src/lib/last-order.ts
// "آخر طلب محفوظ على هذا الجهاز" — يخدم تبويب "طلباتي" في BottomNav.tsx (BAYAN-CLOSEOUT-UI-GAPS).
// localStorage فقط — لا حساب/تسجيل دخول للعميل الضيف، نفس فلسفة src/lib/personal-theme.ts (اليوم 30).

export const LAST_ORDER_STORAGE_KEY = 'sb_last_order_id';

export function saveLastOrderId(orderId: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_ORDER_STORAGE_KEY, orderId);
}

export function readLastOrderId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_ORDER_STORAGE_KEY);
}
