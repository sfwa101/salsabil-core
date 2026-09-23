'use client';
// src/app/(reef)/ReefHeader.tsx
// VERTICAL-SLICE-1-HEADER-BOTTOMNAV-INTEGRATION (2026-09-22) — Adapter عرض فقط، يُركِّب
// DesktopHeaderStem + MobileHeaderStem (كلاهما دائماً، فرع الظهور CSS-only بالضبط كـHeader.tsx
// القديم — hidden lg:flex / flex lg:hidden داخل كل Stem) ويربطهما ببيانات/تنقّل حقيقيين. راجع
// docs/salsabil-frontend-integration-pattern.md وADR-035 (docs/DECISIONS.md) — لا منطق أعمال هنا،
// فقط تحويل بيانات حقيقية موجودة فعلاً (مسار الصفحة، عدد/إجمالي السلة الحقيقيان) إلى الشكل الذي
// يتوقعه كل Stem، بلا تعديل عقد الـProps الخاص بأي منهما.
//
// cartItemCount يصل كـ prop من (reef)/layout.tsx (Server Component، getCartItemCountAction — نفس
// القدرة الموجودة فعلاً، بُنيت أصلاً "للـHeader" حسب تعليقها في actions.ts، لم تكن مستخدَمة هنا من
// قبل). totalPrice يُقرَأ من useCartTotal() (نفس مصدر الحقيقة التفاؤلي الذي يستخدمه CartCapsule.tsx
// في كل صفحات (reef) الأخرى — لا مصدر منفصل).
//
// ⚠️ تغيير سلوك مُعلَن صراحة (لا صامت): MobileHeaderStem يعرض زر سلة مدمَجاً خاصاً به (شارة عدد+سعر)
// وينتقل مباشرة لصفحة /cart بالكامل عند النقر — لا يفتح نافذة السلة السفلية المصغَّرة
// (CartCapsule.tsx) كما كان يحدث سابقاً داخل Header.tsx. CartCapsule.tsx نفسه لم يُعدَّل ولم يُحذَف
// (يبقى بالكامل في الكود، غير مُستدعى من أي مكان حالياً) — قرار عرض منتج (تبسيط تفاعل السلة في
// الهيدر مقابل نافذة معاينة سريعة)، لا قيداً تقنياً. راجع تقرير هذه المهمة للتفصيل الكامل.
//
// لا نطاق عناوين أو بحث حقيقي بعد. لذلك يعرض العنوان حالة "غير محدد" غير تفاعلية، والبحث يعلن
// صراحة أنه قريباً؛ لا تُحقن بيانات عنوان وهمية في مسار الإنتاج.

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DesktopHeaderStem } from '@/components/ui/DesktopHeaderStem';
import { MobileHeaderStem } from '@/components/ui/MobileHeaderStem';
import { useCartTotal } from '@/components/CartTotalProvider';
import { useCartToast } from '@/components/useCartToast';
import { awaitPendingCartMutations } from '@/components/cartMutationGate';
import { getCartSummaryAction } from '@/app/(reef)/cart/actions';
import { useScrollDirection } from '@/hooks/useScrollDirection';
import { MobileCartSheetStem } from '@/components/ui/MobileCartSheetStem';
import type { CartLineSummary } from '@/core/modules/cart/types';

const FEED_TAB_HREF: Record<string, string> = {
  all: '/?tab=all',
  products: '/?tab=products',
  posts: '/?tab=posts',
};

const SEARCH_TOAST_MS = 2000;

export function ReefHeader({ lines }: { lines: CartLineSummary[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { total, itemCount, synchronizeFromServer } = useCartTotal();
  const { showToast, toastNode } = useCartToast();

  const showBars = useScrollDirection();

  const [searchToast, setSearchToast] = useState(false);
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [cartSheetLines, setCartSheetLines] = useState(lines);

  const activeFeedTab = searchParams.get('tab') ?? 'all';

  useEffect(() => setCartSheetLines(lines), [lines]);

  function handleSearch() {
    setSearchToast(true);
    window.setTimeout(() => setSearchToast(false), SEARCH_TOAST_MS);
  }

  function handleFeedTabChange(tabId: string) {
    const href = FEED_TAB_HREF[tabId];
    if (href) router.push(href);
  }

  async function handleOpenCart() {
    try {
      await awaitPendingCartMutations();
      const summary = await getCartSummaryAction();
      const confirmedItemCount = summary.lines.reduce((sum, line) => sum + line.item.quantity, 0);
      synchronizeFromServer(summary.total, confirmedItemCount);
      setCartSheetLines(summary.lines);
      setCartSheetOpen(true);
    } catch {
      showToast('تعذّر تحميل السلة، حاول مرة أخرى');
    }
  }

  return (
    <>
      <DesktopHeaderStem storeName="ريف المدينة" onSearch={handleSearch} />
      <MobileHeaderStem
        storeName="ريف المدينة"
        currentAddress="العنوان غير محدد"
        onToggleWorlds={() => router.push('/')}
        onOpenCart={() => void handleOpenCart()}
        onSearch={handleSearch}
        activeFeedTab={activeFeedTab}
        onFeedTabChange={handleFeedTabChange}
        totalItems={itemCount}
        totalPrice={total}
        showBars={showBars}
      />

      <MobileCartSheetStem
        isOpen={cartSheetOpen}
        onClose={() => setCartSheetOpen(false)}
        lines={cartSheetLines}
        totalItems={itemCount}
        totalPrice={total}
      />

      {searchToast && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-[110] flex justify-center px-4">
          <span className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg">
            البحث قريباً
          </span>
        </div>
      )}

      {toastNode}
    </>
  );
}
