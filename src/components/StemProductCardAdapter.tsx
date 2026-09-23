'use client';
// src/components/StemProductCardAdapter.tsx
// HOMEPAGE-SHELL-VISUAL-PARITY-PASS (2026-09-22) — يوصل StemProductCard (المُثبَت فعلياً على رف
// "منتجات ريف" عبر RealCatalogShelfSDUI) إلى بقية بطاقات المنتج المبعثرة خارج ذلك الرف (خلاصة بيان في
// MobileStorefront.tsx وPostCard.tsx) — كانت تُعرَض عبر MobileSmallProductCard/MobileHeroProductCard/
// ProductCard القديمة (توكنز ظل مختلفة، بلا --sb-bg-glass/--sb-radius-2xl/--sb-shadow-apple-soft).
//
// إعادة استخدام كاملة لـuseOptimisticCartLine (نفس الخطاف الحقيقي المُستخدَم في ProductCard.tsx/
// MobileSmallProductCard.tsx/PostCard.tsx — لا مسار سلة موازٍ) — خلافاً لـRealCatalogShelfSDUI الذي
// يعيد جلب getCartSummaryAction() بعد كل نقرة (نمط POC الأقدم)، هذا المحوّل يطابق النمط التفاؤلي
// الأحدث والمُثبَت في بقية الكود.
//
// BATCH B: جميع المنتجات تُعرَض عبر Stem. وجود size أو addon يجعل البطاقة presentation-only
// للتهيئة: لا ADD_TO_CART مباشر، ويُعاد استخدام Product Sheet أو صفحة المنتج الحالية حيث يبقى
// ProductOptions والمسار الخادمي مصدر اختيار الخيارات والتحقق من السعر.
//
// onOpenSheet اختياري (يطابق عقد ProductCard.tsx الحالي حرفياً): عند تمريره (PostCard.tsx، رف
// "منتجات هذا المنشور") يفتح BottomSheet المنتج الموجود أصلاً بدل أي معاينة جديدة؛ بلا تمريره
// (MobileStorefront.tsx) ينتقل لصفحة المنتج الكاملة — نفس ازدواجية السلوك القديمة تماماً، بلا إضافة
// نافذة ProductQuickViewStem هنا عمداً (خارج نطاق تبديل بصري بحت لهذه الدفعة).

import { useRouter } from 'next/navigation';
import type { Product } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import { StemProductCard } from '@/components/ui/StemProductCard';
import type { UIAction } from '@/sdui/actions/action-contracts';
import { useOptimisticCartLine } from '@/components/useOptimisticCartLine';
import { useCartToast } from '@/components/useCartToast';
import { productRequiresConfiguration, toProductCardPresentation } from '@/components/product-presentation';

export function StemProductCardAdapter({
  product,
  cartLine,
  onOpenSheet,
}: {
  product: Product;
  cartLine?: CartLineSummary;
  onOpenSheet?: (productId: string) => void;
}) {
  const router = useRouter();
  const requiresConfiguration = productRequiresConfiguration(product);
  const { showToast, toastNode } = useCartToast();
  const { quantity, setQuantity } = useOptimisticCartLine(
    product.id,
    cartLine?.unitPrice ?? product.basePrice,
    cartLine ? { itemId: cartLine.item.id, quantity: cartLine.item.quantity, selection: cartLine.item.selection } : undefined,
    showToast
  );

  function openConfiguration() {
    if (onOpenSheet) onOpenSheet(product.id);
    else router.push(`/product/${product.id}`);
  }

  function handleAction(action: UIAction) {
    if (action.type === 'OPEN_CONFIGURATION') {
      openConfiguration();
      return;
    }
    if (action.type === 'ADD_TO_CART') {
      if (requiresConfiguration) {
        openConfiguration();
        return;
      }
      if (action.payload.action === 'decrement') setQuantity(Math.max(0, quantity - 1));
      else setQuantity(quantity + 1);
      return;
    }
    if (action.type === 'OPEN_QUICK_VIEW') {
      if (onOpenSheet) onOpenSheet(product.id);
      else router.push(`/product/${product.id}`);
    }
  }

  return (
    <>
      <StemProductCard {...toProductCardPresentation(product, quantity)} onAction={handleAction} />
      {toastNode}
    </>
  );
}
