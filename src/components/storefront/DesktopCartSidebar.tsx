'use client';
// src/components/storefront/DesktopCartSidebar.tsx
// FULL-VISUAL-IMPORT-REMAINING-SURFACES (2026-09-22) — كان يحمل منطقه الخاص المبسَّط (CartItem[]
// مُسطَّح، useOptimisticCartLine لكل صف عبر DesktopCartLineRow المحلي، إجمالي مُعاد حسابه يدوياً من
// حالة كمية محلية). الآن غلاف زجاجي جديد حول نفس المنطق الحقيقي المُثبَت فعلاً في /cart
// (CartLineItem.tsx — نفس useOptimisticCartLine بالضبط، بلا نسخة موازية) — لا تجميع بالتاجر
// (VendorCartGroupStem) هنا عمداً: CartStemView.tsx (المُستخدَم في /cart) يحدِّث إجماليه محلياً
// بمعزل عن CartTotalProvider (بلا استدعاء applyOptimisticDelta)، وهذا الشريط يظهر بجانب الهيدر طوال
// الوقت على الرئيسية — استخدامه هنا كان سيُنتج شارة سلة الهيدر مُتجمِّدة بعد أي تعديل كمية من هنا حتى
// أول تنقّل. التجميع الكامل بالتاجر يبقى حصرياً على /cart (راجع تقرير المهمة — قرار مؤسس صريح).
//
// الإجمالي يُقرَأ من useCartTotal() (نفس مصدر شارة الهيدر التفاؤلي) لا prop مُعاد حسابه محلياً — أي
// تعديل كمية من هذا الشريط يُحدِّث كليهما معاً فوراً بنفس القيمة، بلا احتمال تعارض بين مصدرين.

import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useCartTotal } from '@/components/CartTotalProvider';
import { awaitPendingCartMutations } from '@/components/cartMutationGate';
import { VendorCartGroupStem } from '@/components/ui/VendorCartGroupStem';
import { CartBreakdownStem } from '@/components/ui/CartBreakdownStem';
import type { CartLineSummary } from '@/core/modules/cart/types';
import { groupByTenant } from '@/app/(reef)/cart/cart-grouping';

interface DesktopCartSidebarProps {
  lines: CartLineSummary[];
}

export function DesktopCartSidebar({ lines }: DesktopCartSidebarProps) {
  const router = useRouter();
  const { total, itemCount } = useCartTotal();
  const hasItems = itemCount > 0;

  // FIX-LIVE-BUG-SILENT-ADD-TO-CART-FAILURE — نفس ضمان CartCapsule.tsx→handleNavigateToCart القائم
  // أصلاً: ينتظر أي كتابة سلة معلَّقة قبل التنقّل، وإلا قد تصل /cart قبل وصول تلك الكتابة فعلياً.
  function handleCheckoutClick() {
    awaitPendingCartMutations().then(() => router.push('/cart'));
  }

  return (
    <aside className="hidden lg:flex sticky top-20 h-[calc(100vh-6.5rem)] w-[380px] shrink-0 flex-col bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-lg)] rounded-[var(--sb-radius-3xl)] shadow-[var(--sb-shadow-apple-soft)] border border-border/40 overflow-hidden">
      <div className="p-4 shrink-0 border-b border-border/40">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <ShoppingBag size={20} className="text-primary" />
          سلتك
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 py-4 scrollbar-thin">
        {!hasItems ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-4 py-10 h-full">
            <ShoppingBag size={48} className="opacity-20" />
            <p className="font-medium text-sm">السلة فارغة حالياً</p>
          </div>
        ) : (
          <>
            {groupByTenant(lines, new Map()).map((group) => (
              <VendorCartGroupStem
                key={group.key}
                vendorId={group.key}
                vendorName={group.merchantName}
                lines={group.lines}
              />
            ))}

            <div className="text-center text-[11px] text-muted-foreground py-1 mt-2">
              اسحب المنتج لليسار للحذف السريع
            </div>

            <div className="mt-4">
              <CartBreakdownStem
                subtotal={total}
                tipAmount={0}
                walletAmount={0}
                finalTotal={total}
              />
            </div>
          </>
        )}
      </div>
      {hasItems && (
        <div className="p-4 shrink-0 border-t border-border/40 bg-[var(--sb-bg-glass)] backdrop-blur-sm">
          <button onClick={handleCheckoutClick} className="w-full h-12 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold flex items-center justify-between px-4 shadow-md transition-all active:scale-[0.98]">
            <span>إتمام الطلب</span>
            <span>{total} ج.م</span>
          </button>
        </div>
      )}
    </aside>
  );
}
