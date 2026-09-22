'use client';
// لمحة نجاح الطلب — تُقرَأ من sessionStorage (order-success-flash.ts) مرة واحدة فقط في المتصفّح الذي
// أتمّ الطلب فعلاً للتو، ثم تُحذَف. أي زيارة أخرى لهذا الرابط (تحديث الصفحة، مشاركة الرابط، عودة
// لاحقة) لا ترى شيئاً — الصفحة تعرض حالتها الحقيقية المعتادة فقط (راجع page.tsx، لا تغيير هناك).

import { useEffect, useRef, useState } from 'react';
import { OrderSuccessModalStem, type OrderDetails } from '@/components/ui/OrderSuccessModalStem';
import { consumeOrderSuccessFlash } from '@/lib/order-success-flash';

export function OrderSuccessFlash({ orderId }: { orderId: string }) {
  const [details, setDetails] = useState<OrderDetails | null>(null);
  // consumeOrderSuccessFlash يحذف المفتاح فور قراءته (غير Idempotent عمداً — "لمحة" تُستهلَك مرة
  // واحدة). React reactStrictMode (مفعَّل افتراضياً في Next.js، next.config.ts لا يعطّله) يستدعي
  // useEffect مرتين في وضع التطوير فقط — بلا هذا الحارس، الاستدعاء الثاني يجد المفتاح محذوفاً بالفعل
  // من الاستدعاء الأول فيُعيد null فيمحو الحالة التي عُيِّنت للتو (مُتحقَّق منه حياً عبر Playwright).
  const consumed = useRef(false);

  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;
    setDetails(consumeOrderSuccessFlash(orderId));
  }, [orderId]);

  if (!details) return null;

  // إغلاق النافذة يكشف صفحة تتبّع الطلب الحقيقية المعروضة أصلاً تحتها (بيانات حقيقية مُحمَّلة سلفاً
  // من الخادم في page.tsx) — لا حاجة لإعادة تحميل/جلب، مجرد إخفاء اللمحة المحلية
  return <OrderSuccessModalStem isOpen onClose={() => setDetails(null)} orderDetails={details} />;
}
