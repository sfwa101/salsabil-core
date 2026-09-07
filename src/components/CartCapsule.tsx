'use client';
// src/components/CartCapsule.tsx
// كبسولة السلة في Header.tsx — CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 2).
// استُخرجت من الزر الذي كان مدموجاً مباشرة داخل Header.tsx (Server Component) لأن نبضة الإضافة
// تحتاج حالة عميل (مقارنة itemCount الحالي بالسابق عبر useRef). itemCount يصل كـ prop من Header.tsx
// (يبقى يجلبه عبر getCartItemCountAction كما هو — لا تغيير في مصدر البيانات، فقط مكان العرض).
//
// آلية النبضة: CSS transition بحت (scale + ring مؤقتان عبر className مشروط)، بلا Framer Motion —
// قيد صريح في موجّه المهمة. تعمل فقط لأن addToCartAction (cart/actions.ts) أصبح يستدعي أيضاً
// revalidatePath('/') (إضافة هذه المهمة) — بدونها Header (طبقة مشتركة عبر layout.tsx) لا يُعاد
// جلبه بعد الإضافة، وitemCount يبقى قديماً حتى تنقّل فعلي لاحق.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';

const PULSE_DURATION_MS = 500;

export function CartCapsule({ itemCount }: { itemCount: number }) {
  const [pulsing, setPulsing] = useState(false);
  const prevCount = useRef(itemCount);

  useEffect(() => {
    if (itemCount > prevCount.current) {
      setPulsing(true);
      const timeout = setTimeout(() => setPulsing(false), PULSE_DURATION_MS);
      prevCount.current = itemCount;
      return () => clearTimeout(timeout);
    }
    prevCount.current = itemCount;
  }, [itemCount]);

  return (
    <Link
      href="/cart"
      aria-label="السلة"
      className={`relative flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 shadow-sm transition-transform duration-300 ease-out hover:bg-muted ${
        pulsing ? 'scale-110 ring-2 ring-primary' : 'scale-100'
      }`}
    >
      <ShoppingCart size={20} className="text-foreground" />
      {itemCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
          {itemCount}
        </span>
      )}
    </Link>
  );
}
