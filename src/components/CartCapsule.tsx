'use client';
// src/components/CartCapsule.tsx
// كبسولة السلة في Header.tsx — استُخرجت من الزر الذي كان مدموجاً مباشرة داخل Header.tsx
// (Server Component) لأن نبضة الإضافة تحتاج حالة عميل (مقارنة القيمة الحالية بالسابقة عبر useRef).
// `total` يصل كـ prop من Header.tsx (getCartTotalAction → cartService.getSummary().total — لا
// تغيير في مصدر البيانات، فقط مكان العرض).
//
// FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 1أ/1ب):
//  - تعرض الآن إجمالي السلة بالجنيه ("148 ج.م") لا عدد القطع — القيمة الأدق لقرار شرائي سريع.
//  - إصلاح اتجاه النبضة: بلا `transform-origin` صريح، `scale-110` كانت تتمدد بالتساوي في الاتجاهين —
//    نصفها الأيمن (نحو منتصف الهيدر/العنوان) يتداخل بصرياً مع محتوى مجاور. الكبسولة تقع في أقصى
//    يسار الهيدر (آخر عنصر بترتيب RTL) — حافتها اليمنى تلامس كتلة العنوان، حافتها اليسرى تواجه حافة
//    الشاشة الفارغة. `origin-right` (فيزيائي، لا منطقي — نفس نمط الاستخدام الفيزيائي القائم في بقية
//    المشروع لأن dir="rtl" ثابت دائماً، لا وضع LTR) يُثبِّت الحافة اليمنى كنقطة الارتكاز، فيتمدد كل
//    النمو نحو اليسار فقط.
//
// آلية النبضة: CSS transition بحت (scale + ring مؤقتان عبر className مشروط)، بلا Framer Motion —
// قيد صريح. تعمل فقط لأن addToCartAction (cart/actions.ts) يستدعي أيضاً revalidatePath('/') —
// بدونها Header (طبقة مشتركة عبر layout.tsx) لا يُعاد جلبه بعد الإضافة، والإجمالي يبقى قديماً حتى
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
      <ShoppingCart size={20} className="text-foreground" />
      {total > 0 && (
        <span className="flex h-5 items-center justify-center whitespace-nowrap rounded-full bg-primary px-2 text-xs font-medium text-primary-foreground">
          {total} ج.م
        </span>
      )}
    </Link>
  );
}
