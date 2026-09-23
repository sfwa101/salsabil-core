'use client';
// src/app/(reef)/RealCatalogShelfSDUI.tsx
// MIGRATE-HOME-REAL-SHELF-TO-SDUI (2026-09-21) — أول استهلاك إنتاجي حقيقي لخط أنابيب SDUI المُثبَت في
// docs/audits/2026-09-21-real-backend-sdui-integration-poc.md، بدل صفحة اختبار معزولة. يحل محل الرسم
// المباشر لـ<HorizontalShelf><ProductCard/></HorizontalShelf> في page.tsx لرف "منتجات ريف" فقط —
// راجع docs/salsabil-frontend-integration-pattern.md للقواعد الحاكمة (لا لمس PageEngine/DataResolver/
// ApplicationRuntime/ActionRouter/CapabilityRegistry، لا سعر من العميل).
//
// حدود متعمَّدة:
// - منتجات size/addon تبقى في الرف، لكن العرض يرسلها إلى مسار التهيئة فقط. الحاجز الدفاعي داخل
//   ADD_TO_CART يمنع وصولها إلى أي cart mutation حتى لو أرسل مستهلك action غير صحيح.
// - publisher.name ثابت "سلسبيل" (نفس حد POC §J.4) — Product الحقيقي لا يحمل اسم تاجر عرض جاهزاً.
// - تسجيل componentRegistry هنا **مشروط** بـ`.has()` (خلاف POC نفسه الذي سجّل بلا شرط عمداً لصفحة
//   اختبار معزولة) — إلزامي لأي استهلاك إنتاجي حسب القاعدة الصريحة رقم 4 في وثيقة النمط أعلاه.
//
// VERTICAL-SLICE-2-MOBILE-HOME-SHELF-INTEGRATION (2026-09-22) — هذا المكوّن يُستهلَك الآن مرتين: رف
// سطح المكتب (page.tsx، بلا تغيير) ورف المتنقل (MobileStorefront.tsx، جديد) — نفس المكوّن حرفياً بلا
// أي تعديل هنا، مُركَّب مرتين، الظهور CSS-only عبر hidden lg:flex/block lg:hidden في الحاويتين
// الأصليتين (نفس نمط DesktopHeaderStem/MobileHeaderStem في الشريحة الأولى). بيانات الكتالوج نفسها
// تصل إلى الفرعين، ويُحسم مسار الإجراء من presentation model المشترك.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageEngine } from '@/sdui/engine/PageEngine';
import { ApplicationRuntime } from '@/sdui/runtime/ApplicationRuntime';
import { componentRegistry } from '@/sdui/registry/component-registry';
import { SDUIComponent } from '@/sdui/contracts/component-contracts';
import type { SDUIPage } from '@/sdui/schema/page.schema';
import type { QuickViewProductSnapshot } from '@/sdui/actions/action-contracts';
import { StemProductCard } from '@/components/ui/StemProductCard';
import { HorizontalShelfStem } from '@/components/ui/HorizontalShelfStem';
import { ProductQuickViewStem } from '@/components/ui/ProductQuickViewStem';
import type { Product } from '@/core/modules/catalog/types';
import { trackCartMutation } from '@/components/cartMutationGate';
import { useCartToast } from '@/components/useCartToast';
import { productRequiresConfiguration, toProductCardPresentation } from '@/components/product-presentation';
import {
  addToCartAction,
  getCartSummaryAction,
  updateCartItemAction,
  removeCartItemAction,
} from '@/app/(reef)/cart/actions';

const RealCatalogShelf: SDUIComponent = ({ props, onAction }) => {
  const items = Array.isArray(props.items) ? (props.items as Array<Product & { quantity?: number }>) : [];
  const mapped = items.map((product) => (
    <StemProductCard key={product.id} {...toProductCardPresentation(product, product.quantity)} onAction={onAction} />
  ));
  return <HorizontalShelfStem title={props.title as string} items={mapped} />;
};

if (!componentRegistry.has('product_shelf')) {
  componentRegistry.register('product_shelf', RealCatalogShelf);
}

interface RealCatalogShelfSDUIProps {
  title: string;
  products: Product[];
  initialQuantities: Record<string, number>;
}

export function RealCatalogShelfSDUI({ title, products, initialQuantities }: RealCatalogShelfSDUIProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities);
  const router = useRouter();
  const { showToast, toastNode } = useCartToast();
  // VISUAL-PARITY-PASS (2026-09-22) — OPEN_QUICK_VIEW كان يُرسَل من StemProductCard.tsx منذ وصله
  // الأول (Slice 2) بلا أي capability مسجَّلة تستقبله — ActionRouter.dispatch يتجاهل أي action بلا
  // handler صامتاً (no-op حقيقي في الإنتاج، console.warn في التطوير فقط)، فكل ضغطة على بطاقة منتج على
  // الموقع الحي كانت (ولا تزال حتى هذا التعديل) بلا أثر ظاهر. هذا يصلح الخلل الموجود فعلاً، لا يضيف
  // ميزة جديدة – reuse كامل لبيانات id/title/price/imageUrl/publisher الموجودة أصلاً في StemProductCard
  // (لا description/unit — StemProductCard لا يحملهما في حمولته، فيظهران فارغين في المعاينة السريعة
  // بدل قيمة مُختلَقة؛ الـStem نفسه يُخفي قسم الوصف كاملاً عند غيابه بعد إصلاح هذه المهمة).
  const [quickViewProduct, setQuickViewProduct] = useState<QuickViewProductSnapshot | null>(null);

  const runtime = useMemo(() => {
    const appRuntime = new ApplicationRuntime();

    appRuntime.registerCapability('OPEN_QUICK_VIEW', (action) => {
      setQuickViewProduct(action.payload.product);
    });

    appRuntime.registerCapability('OPEN_CONFIGURATION', (action) => {
      setQuickViewProduct(null);
      router.push(`/product/${action.payload.id}`);
    });

    appRuntime.registerCapability('ADD_TO_CART', (action) => {
      const { id: productId, action: qtyAction, amount } = action.payload;
      const product = products.find((candidate) => candidate.id === productId);
      if (product && productRequiresConfiguration(product)) {
        router.push(`/product/${productId}`);
        return;
      }
      void trackCartMutation(async () => {
        const beforeMutation = await getCartSummaryAction();
        const existingLine = beforeMutation.lines.find((line) => line.product.id === productId);
        const currentQty = existingLine?.item.quantity ?? 0;

        let desiredQty: number;
        if (qtyAction === 'decrement') desiredQty = Math.max(0, currentQty - 1);
        else if (qtyAction === 'set' && amount !== undefined) desiredQty = Math.max(0, amount);
        else desiredQty = currentQty + 1;

        if (desiredQty === currentQty) return null;

        const result = existingLine
          ? desiredQty <= 0
            ? await removeCartItemAction(existingLine.item.id)
            : await updateCartItemAction(existingLine.item.id, desiredQty)
          : await addToCartAction({ productId, quantity: desiredQty });

        if ('error' in result) throw new Error(result.error);

        // لا نعتمد على ملخص mutation كعقد تأكيد ضمني. القراءة اللاحقة داخل نفس
        // بوابة التسلسل هي مصدر الحقيقة الذي يُحدّث منه سطح Stem.
        return getCartSummaryAction();
      })
        .then((confirmedSummary) => {
          if (!confirmedSummary) return;
          const confirmedLine = confirmedSummary.lines.find((line) => line.product.id === productId);
          setQuantities((prev) => ({ ...prev, [productId]: confirmedLine?.item.quantity ?? 0 }));
          // CartTotalProvider لا يملك setter مؤكداً، وعداد القطع Server prop؛ refresh يعيد
          // مزامنة هذين السطحين بعد أن ثبّتت القراءة أعلاه حقيقة السلة للبطاقة.
          router.refresh();
        })
        .catch((error: unknown) => {
          showToast(error instanceof Error ? error.message : 'تعذر تحديث السلة');
        });
    });

    return appRuntime;
  }, [products, router, showToast]);

  const page = useMemo<SDUIPage>(
    () => ({
      id: 'home_real_catalog_shelf',
      sections: [
        {
          id: 'section_real_catalog_shelf',
          type: 'product_shelf',
          props: {
            title,
            items: products.map((product) => ({ ...product, quantity: quantities[product.id] ?? 0 })),
          },
          visibility: { enabled: true },
        },
      ],
    }),
    [title, products, quantities]
  );

  return (
    <>
      <PageEngine pageData={page} onAction={runtime.dispatch} />
      {quickViewProduct && (
        <ProductQuickViewStem
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
          onAction={runtime.dispatch}
        />
      )}
      {toastNode}
    </>
  );
}
