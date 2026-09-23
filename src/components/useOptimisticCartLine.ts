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
import { addToCartAction, getCartSummaryAction, updateCartItemAction } from '@/app/(reef)/cart/actions';
import { useCartTotal } from '@/components/CartTotalProvider';
import { trackCartMutation } from '@/components/cartMutationGate';
import type { ProductSelection } from '@/core/modules/catalog/types';

type ConfirmedLineListener = (quantity: number, itemId: string | undefined) => void;
const confirmedLineListeners = new Map<string, Set<ConfirmedLineListener>>();

function getLineKey(productId: string, selection: ProductSelection | undefined) {
  return JSON.stringify({
    productId,
    sizeId: selection?.sizeId,
    addonIds: [...(selection?.addonIds ?? [])].sort(),
  });
}

function publishConfirmedLine(lineKey: string, quantity: number, itemId: string | undefined) {
  confirmedLineListeners.get(lineKey)?.forEach((listener) => listener(quantity, itemId));
}

export function useOptimisticCartLine(
  productId: string,
  unitPrice: number,
  cartLine: { itemId: string; quantity: number; selection?: ProductSelection } | undefined,
  onError: (message: string) => void
) {
  const baseQuantity = cartLine?.quantity ?? 0;
  const [quantity, setQuantityState] = useState(baseQuantity);
  const { applyOptimisticDelta, confirmOptimisticDelta, rollbackOptimisticDelta } = useCartTotal();
  const itemIdRef = useRef(cartLine?.itemId);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const confirmedQuantityRef = useRef(baseQuantity);
  const latestRequestRef = useRef(0);
  const pendingRequestCountRef = useRef(0);
  const lineKey = getLineKey(productId, cartLine?.selection);
  
  // Sync state if external cartLine changes
  useEffect(() => {
    const nextQuantity = cartLine?.quantity ?? 0;
    confirmedQuantityRef.current = nextQuantity;
    if (pendingRequestCountRef.current === 0) setQuantityState(nextQuantity);
  }, [cartLine?.quantity]);

  useEffect(() => {
    const listener: ConfirmedLineListener = (confirmedQuantity, confirmedItemId) => {
      confirmedQuantityRef.current = confirmedQuantity;
      itemIdRef.current = confirmedItemId;
      if (pendingRequestCountRef.current === 0) setQuantityState(confirmedQuantity);
    };
    const listeners = confirmedLineListeners.get(lineKey) ?? new Set<ConfirmedLineListener>();
    listeners.add(listener);
    confirmedLineListeners.set(lineKey, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) confirmedLineListeners.delete(lineKey);
    };
  }, [lineKey]);

  if (cartLine?.itemId) itemIdRef.current = cartLine.itemId;

  function setQuantity(next: number) {
    const requestId = ++latestRequestRef.current;
    pendingRequestCountRef.current += 1;
    const priceDelta = unitPrice * (next - quantity);
    const countDelta = next - quantity;
    
    // Update local state immediately
    setQuantityState(next);
    const optimisticDeltaId = applyOptimisticDelta(priceDelta, countDelta);
    
    // Queue server actions safely — وتُسجَّل أيضاً في القفل المشترك (cartMutationGate) حتى لا تسبقها
    // قراءة سلة (فتح الكبسولة أو التنقل لـ/cart) قبل اكتمالها فعلياً (FIX-LIVE-BUG-SILENT-ADD-TO-CART-
    // FAILURE). previousInQueue تُلتقَط قبل إعادة تعيين queueRef.current — لا تُقرَأ من داخل نفسها.
    const previousInQueue = queueRef.current;
    const task = trackCartMutation(() =>
      previousInQueue.then(async () => {
        try {
          // Rebase the relative user intent on the latest server quantity while holding the
          // shared mutation gate. Independent mounted surfaces can otherwise both send the
          // same stale absolute quantity and silently lose one click.
          const currentSummary = await getCartSummaryAction();
          const expectedAddonIds = [...(cartLine?.selection?.addonIds ?? [])].sort();
          const matchesExpectedLine = (line: (typeof currentSummary.lines)[number]) => {
            const lineAddonIds = [...(line.item.selection.addonIds ?? [])].sort();
            return line.product.id === productId
              && line.item.selection.sizeId === cartLine?.selection?.sizeId
              && lineAddonIds.length === expectedAddonIds.length
              && lineAddonIds.every((id, index) => id === expectedAddonIds[index]);
          };
          const currentLine = currentSummary.lines.find((line) => line.item.id === itemIdRef.current)
            ?? currentSummary.lines.find(matchesExpectedLine);
          const serverQuantity = currentLine?.item.quantity ?? 0;
          const rebasedQuantity = Math.max(0, serverQuantity + countDelta);
          itemIdRef.current = currentLine?.item.id;

          const result = rebasedQuantity === serverQuantity
            ? { summary: currentSummary }
            : itemIdRef.current
              ? await updateCartItemAction(itemIdRef.current, rebasedQuantity)
              : await addToCartAction({
                productId,
                quantity: rebasedQuantity,
                ...(cartLine?.selection ? { selection: cartLine.selection } : {}),
              });
          if ('error' in result) {
            onError(result.error);
            rollbackOptimisticDelta(optimisticDeltaId);
            if (requestId === latestRequestRef.current) {
              setQuantityState(confirmedQuantityRef.current);
            }
            return;
          }
          const confirmedLine = itemIdRef.current
            ? result.summary.lines.find((line) => line.item.id === itemIdRef.current)
            : result.summary.lines.find(matchesExpectedLine);
          const confirmedQuantity = confirmedLine?.item.quantity ?? 0;
          confirmedQuantityRef.current = confirmedQuantity;
          if (confirmedLine) itemIdRef.current = confirmedLine.item.id;
          publishConfirmedLine(lineKey, confirmedQuantity, confirmedLine?.item.id);
          confirmOptimisticDelta(
            optimisticDeltaId,
            result.summary.total,
            result.summary.lines.reduce((sum, line) => sum + line.item.quantity, 0)
          );
          if (requestId === latestRequestRef.current) {
            setQuantityState(confirmedQuantity);
          }
        } catch (error) {
          onError(error instanceof Error ? error.message : 'تعذّر تحديث السلة، حاول مرة أخرى');
          rollbackOptimisticDelta(optimisticDeltaId);
          if (requestId === latestRequestRef.current) {
            setQuantityState(confirmedQuantityRef.current);
          }
        } finally {
          pendingRequestCountRef.current -= 1;
        }
      })
    );
    queueRef.current = task.catch(console.error);
  }

  return { quantity, setQuantity };
}
