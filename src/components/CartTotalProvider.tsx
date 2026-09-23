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

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

interface PendingCartDelta {
  id: number;
  priceDelta: number;
  countDelta: number;
}

interface CartTotalState {
  confirmedTotal: number;
  confirmedItemCount: number;
  pending: PendingCartDelta[];
}

interface CartTotalContextValue {
  total: number;
  itemCount: number;
  applyOptimisticDelta: (priceDelta: number, countDelta: number) => number;
  confirmOptimisticDelta: (id: number, total: number, itemCount: number) => void;
  rollbackOptimisticDelta: (id: number) => void;
  synchronizeFromServer: (total: number, itemCount: number) => void;
}

const CartTotalContext = createContext<CartTotalContextValue | null>(null);

export function CartTotalProvider({ total, itemCount, children }: { total: number; itemCount: number; children: ReactNode }) {
  const nextDeltaId = useRef(0);
  const [state, setState] = useState<CartTotalState>({
    confirmedTotal: total,
    confirmedItemCount: itemCount,
    pending: [],
  });

  useEffect(() => {
    setState((current) =>
      current.pending.length === 0
        ? { confirmedTotal: total, confirmedItemCount: itemCount, pending: [] }
        : current
    );
  }, [total, itemCount]);

  const applyOptimisticDelta = useCallback((priceDelta: number, countDelta: number) => {
    const id = ++nextDeltaId.current;
    setState((current) => ({
      ...current,
      pending: [...current.pending, { id, priceDelta, countDelta }],
    }));
    return id;
  }, []);

  const confirmOptimisticDelta = useCallback((id: number, confirmedTotal: number, confirmedItemCount: number) => {
    setState((current) => ({
      confirmedTotal,
      confirmedItemCount,
      pending: current.pending.filter((delta) => delta.id !== id),
    }));
  }, []);

  const rollbackOptimisticDelta = useCallback((id: number) => {
    setState((current) => ({
      ...current,
      pending: current.pending.filter((delta) => delta.id !== id),
    }));
  }, []);

  const synchronizeFromServer = useCallback((confirmedTotal: number, confirmedItemCount: number) => {
    setState((current) => ({ ...current, confirmedTotal, confirmedItemCount }));
  }, []);

  const contextValue = useMemo<CartTotalContextValue>(() => {
    const optimisticTotal = state.pending.reduce((sum, delta) => sum + delta.priceDelta, state.confirmedTotal);
    const optimisticItemCount = state.pending.reduce((sum, delta) => sum + delta.countDelta, state.confirmedItemCount);
    return {
      total: Math.max(0, optimisticTotal),
      itemCount: Math.max(0, optimisticItemCount),
      applyOptimisticDelta,
      confirmOptimisticDelta,
      rollbackOptimisticDelta,
      synchronizeFromServer,
    };
  }, [applyOptimisticDelta, confirmOptimisticDelta, rollbackOptimisticDelta, state, synchronizeFromServer]);

  return (
    <CartTotalContext.Provider value={contextValue}>
      {children}
    </CartTotalContext.Provider>
  );
}

export function useCartTotal() {
  const ctx = useContext(CartTotalContext);
  if (!ctx) throw new Error('useCartTotal يجب أن يُستخدَم داخل CartTotalProvider (مُركَّب في src/app/(reef)/layout.tsx)');
  return ctx;
}
