'use client';
// src/components/useOptimisticCartLine.ts
// IMPLEMENT-OPTIMISTIC-UI-CART-INTERACTIONS — يوحّد منطق "زيادة/إنقاص كمية بند سلة موجود، أو إضافة
// أول وحدة لمنتج غير موجود في السلة بعد" عبر useOptimistic — مُستهلَك من CartLineItem.tsx وProductCard.tsx
// (نفس الشكل حرفياً في كليهما). طابور تسلسلي (queueRef) يضمن وصول طلبات addToCartAction/
// updateCartItemAction للسيرفر بترتيب النقرات حتى مع نقر سريع متكرر — بلا هذا، نقرتان متتاليتان قد
// تصلا بترتيب معكوس شبكياً فتُطبَّق الكمية الأقدم آخراً. لا تعديل على منطق Server Actions نفسه —
// استدعاء مباشر لهما كما هما.
//
// FIX-CART-CAPSULE-SYNC-AND-NAVIGATION-LAG-CRITICAL (الجزء 1) — unitPrice جديد + applyOptimisticDelta
// (من CartTotalProvider.tsx) يُستدعى هنا **داخل نفس transition** الذي يُحدِّث الكمية المحلية —
// إجمالي كبسولة الهيدر يتحرّك بنفس اللحظة والفورية بالضبط، ويتراجعان معاً تلقائياً عند فشل نادر (كلا
// التحديثين التفاؤليين يعتمدان على نفس الـtransition، فيستقرّان معاً عند اكتمالها نجاحاً أو فشلاً).

import { useState, useRef, useEffect } from 'react';
import { addToCartAction, updateCartItemAction } from '@/app/(reef)/cart/actions';
import { useCartTotal } from '@/components/CartTotalProvider';

export function useOptimisticCartLine(
  productId: string,
  unitPrice: number,
  cartLine: { itemId: string; quantity: number } | undefined,
  onError: (message: string) => void
) {
  const baseQuantity = cartLine?.quantity ?? 0;
  const [quantity, setQuantityState] = useState(baseQuantity);
  const { applyOptimisticDelta } = useCartTotal();
  
  // Sync state if external cartLine changes
  useEffect(() => {
    setQuantityState(cartLine?.quantity ?? 0);
  }, [cartLine?.quantity]);

  const itemIdRef = useRef(cartLine?.itemId);
  if (cartLine?.itemId) itemIdRef.current = cartLine.itemId;
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());

  function setQuantity(next: number) {
    const delta = unitPrice * (next - quantity);
    
    // Update local state immediately
    setQuantityState(next);
    applyOptimisticDelta(delta);
    
    // Queue server actions safely
    queueRef.current = queueRef.current.then(async () => {
      const result = itemIdRef.current
        ? await updateCartItemAction(itemIdRef.current, next)
        : await addToCartAction({ productId, quantity: next });
      if ('error' in result) {
        onError(result.error);
        // Revert on failure
        setQuantityState(quantity);
        applyOptimisticDelta(-delta);
        return;
      }
      if (!itemIdRef.current) {
        const line = result.summary.lines.find((l) => l.product.id === productId);
        if (line) itemIdRef.current = line.item.id;
      }
    }).catch(console.error);
  }

  return { quantity, setQuantity };
}
