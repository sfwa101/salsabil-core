'use client';
// src/components/useCartToast.tsx
// IMPLEMENT-OPTIMISTIC-UI-CART-INTERACTIONS — نفس نمط توست "قريباً" الموجود حرفياً في
// WorldSwitcher.tsx (state + setTimeout + createPortal إلى document.body)، استُخرِج هنا لأنه مطلوب
// حرفياً في 3 مكوّنات الآن (CartLineItem/ProductCard/ProductOptions) لعرض سبب فشل تحديث تفاؤلي
// (نفاد مخزون، إلخ). createPortal ضروري لأن هذه المكوّنات قد تُستهلَك داخل BottomSheet/ScrollHideBar
// (نفس السبب المكتشف حياً في WorldSwitcher.tsx — transform ينشئ containing block جديداً لـ
// position:fixed لو بقي التوست في نفس الشجرة).

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const TOAST_DURATION_MS = 2500;

export function useCartToast() {
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function showToast(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(null), TOAST_DURATION_MS);
  }

  const toastNode =
    message && mounted
      ? createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
            <span className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
              {message}
            </span>
          </div>,
          document.body
        )
      : null;

  return { showToast, toastNode };
}
