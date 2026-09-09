'use client';
// src/components/CartTotalProvider.tsx
// FIX-CART-CAPSULE-SYNC-AND-NAVIGATION-LAG-CRITICAL (الجزء 1) — CartCapsule.tsx (إجمالي السلة في
// الهيدر) كان يقرأ `total` كـ prop من (reef)/layout.tsx (Server Component، getCartTotalAction) فقط
// — لا يتحرّك إلا بعد اكتمال الجولة الحقيقية للسيرفر، فيتناقض بصرياً مع التحديث الفوري (ADR-027) في
// CartLineItem/ProductCard/ProductOptions. هذا الـContext يرفع نفس آلية useOptimistic لمستوى مشترك
// يغلّف (reef)/layout.tsx بالكامل: القاعدة الحقيقية (`total`) تبقى نفس prop السيرفر كما هي (تُحدَّث
// تلقائياً بعد أي Server Action، كالسابق)، وapplyOptimisticDelta يُستدعى من useOptimisticCartLine.ts/
// ProductOptions.tsx **داخل نفس transition** الذي يُحدِّث الحالة المحلية للبند نفسه — فكلاهما يظهر
// فوراً ويتراجعان معاً تلقائياً عند فشل نادر، لا مصدرا حقيقة منفصلان يمكن أن يتعارضا.

import { createContext, useContext, useOptimistic, type ReactNode } from 'react';

interface CartTotalContextValue {
  total: number;
  applyOptimisticDelta: (delta: number) => void;
}

const CartTotalContext = createContext<CartTotalContextValue | null>(null);

export function CartTotalProvider({ total, children }: { total: number; children: ReactNode }) {
  const [optimisticTotal, applyOptimisticDelta] = useOptimistic(total, (state: number, delta: number) => state + delta);

  return (
    <CartTotalContext.Provider value={{ total: optimisticTotal, applyOptimisticDelta }}>
      {children}
    </CartTotalContext.Provider>
  );
}

export function useCartTotal() {
  const ctx = useContext(CartTotalContext);
  if (!ctx) throw new Error('useCartTotal يجب أن يُستخدَم داخل CartTotalProvider (مُركَّب في src/app/(reef)/layout.tsx)');
  return ctx;
}
