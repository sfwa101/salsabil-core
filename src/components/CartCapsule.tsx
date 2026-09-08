'use client';
// src/components/CartCapsule.tsx
// كبسولة السلة — عنصر عائم مستقل (ReefLayout في src/app/(reef)/layout.tsx، لا داخل Header.tsx
// كما كانت) لأن نبضة الإضافة تحتاج حالة عميل (مقارنة القيمة الحالية بالسابقة عبر useRef). `total`
// يصل كـ prop (getCartTotalAction → cartService.getSummary().total — لا تغيير في مصدر البيانات).
//
// FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 1أ/1ب) + FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-
// VISUALS (بند 5):
//  - إجمالي السلة بالجنيه ("148ج" لا "148" عدد قطع) — "ج" لا "ج.م" (اختصار أقصر يلائم مساحة الكبسولة
//    الصغيرة)، بخط أكبر (text-sm بدل text-xs) لوضوح أعلى.
//  - إصلاح اتجاه النبضة: بلا `transform-origin` صريح، `scale-110` كانت تتمدد بالتساوي في الاتجاهين —
//    نصفها الأيمن (نحو منتصف الهيدر/العنوان) يتداخل بصرياً مع محتوى مجاور. الكبسولة تقع في أقصى
//    يسار الشاشة — حافتها اليمنى تواجه المحتوى، حافتها اليسرى تواجه حافة الشاشة الفارغة. `origin-right`
//    (فيزيائي، لا منطقي — dir="rtl" ثابت دائماً، لا وضع LTR) يُثبِّت الحافة اليمنى كنقطة الارتكاز،
//    فيتمدد كل النمو نحو اليسار فقط.
//  - **أصبحت عنصراً عائماً ثابتاً (`position: fixed` من المستدعي، layout.tsx)** — لا تختفي مع
//    الهيدر عند التمرير للأسفل بعد الآن (كانت جزءاً من صف الهيدر الذي يختفي/يظهر، ScrollHideBar)؛
//    تبقى ظاهرة دائماً بصرف النظر عن اتجاه التمرير أو حالة الهيدر.
//
// آلية النبضة: CSS transition بحت (scale + ring مؤقتان عبر className مشروط)، بلا Framer Motion —
// قيد صريح. تعمل فقط لأن addToCartAction (cart/actions.ts) يستدعي أيضاً revalidatePath('/') —
// بدونها الغلاف (طبقة مشتركة عبر layout.tsx) لا يُعاد جلبه بعد الإضافة، والإجمالي يبقى قديماً حتى
// تنقّل فعلي لاحق.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';

const PULSE_DURATION_MS = 500;

export function CartCapsule({ total }: { total: number }) {
  const [pulsing, setPulsing] = useState(false);
  const prevTotal = useRef(total);

  useEffect(() => {
    if (total > prevTotal.current) {
      setPulsing(true);
      const timeout = setTimeout(() => setPulsing(false), PULSE_DURATION_MS);
      prevTotal.current = total;
      return () => clearTimeout(timeout);
    }
    prevTotal.current = total;
  }, [total]);

  return (
    <Link
      href="/cart"
      aria-label="السلة"
      className={`relative flex shrink-0 origin-right items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 shadow-sm transition-transform duration-300 ease-out hover:bg-muted ${
        pulsing ? 'scale-110 ring-2 ring-primary' : 'scale-100'
      }`}
    >
      <ShoppingCart size={22} className="text-foreground" />
      {total > 0 && (
        <span className="flex h-6 items-center justify-center whitespace-nowrap rounded-full bg-primary px-2.5 text-sm font-semibold text-primary-foreground">
          {total}ج
        </span>
      )}
    </Link>
  );
}
