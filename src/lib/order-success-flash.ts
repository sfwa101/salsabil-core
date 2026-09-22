// src/lib/order-success-flash.ts
// نقل بيانات نجاح الطلب من CheckoutForm إلى صفحة /order/[id] عبر التنقّل الحقيقي (router.push) —
// sessionStorage فقط (يُقرأ ويُحذَف مرة واحدة عند وصول نفس المتصفّح لصفحة الطلب)، لا query param قابل
// للتزوير: أي حامل رابط آخر لنفس الطلب (الصفحة رابط دائم قابل للمشاركة، راجع OrderPage) لن يملك أبداً
// نفس sessionStorage الخاص بالمتصفّح الذي أتمّ الطلب فعلاً، فلا يرى هذه اللمحة أبداً — العنوان هنا مصدره
// مدخلات العميل في نموذج Checkout نفسه، لا getOrderForCustomerView (التي تتعمَّد عدم إعادته لأي طرف).

import type { OrderDetails } from '@/components/ui/OrderSuccessModalStem';

const STORAGE_KEY = 'sb_order_success_flash_v1';

export function saveOrderSuccessFlash(details: OrderDetails): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(details));
}

// يُستهلَك مرة واحدة فقط — يُحذَف فور القراءة، فإعادة تحميل/زيارة لاحقة لنفس الصفحة لا تُعيد إظهاره
export function consumeOrderSuccessFlash(expectedOrderId: string): OrderDetails | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(STORAGE_KEY);
  try {
    const parsed = JSON.parse(raw) as OrderDetails;
    return parsed.orderId === expectedOrderId ? parsed : null;
  } catch {
    return null;
  }
}
