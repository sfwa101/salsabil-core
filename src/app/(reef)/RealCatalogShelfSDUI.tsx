'use client';
// src/app/(reef)/RealCatalogShelfSDUI.tsx
// MIGRATE-HOME-REAL-SHELF-TO-SDUI (2026-09-21) — أول استهلاك إنتاجي حقيقي لخط أنابيب SDUI المُثبَت في
// docs/audits/2026-09-21-real-backend-sdui-integration-poc.md، بدل صفحة اختبار معزولة. يحل محل الرسم
// المباشر لـ<HorizontalShelf><ProductCard/></HorizontalShelf> في page.tsx لرف "منتجات ريف" فقط —
// راجع docs/salsabil-frontend-integration-pattern.md للقواعد الحاكمة (لا لمس PageEngine/DataResolver/
// ApplicationRuntime/ActionRouter/CapabilityRegistry، لا سعر من العميل).
//
// حدود متعمَّدة (قرار مؤسس صريح أثناء التخطيط، سطح المكتب 2026-09-21):
// - `products` الممرَّرة هنا مُرشَّحة مسبقاً في page.tsx لاستبعاد أي منتج بخيار حجم (`options` من نوع
//   'size') — قدرة ADD_TO_CART أدناه (مطابقة للـPOC حرفياً) لا تدعم اختيار حجم (`sizeId`)، والإضافة
//   المباشرة لمنتج بخيار حجم بلا اختيار كانت ستفشل صامتاً عند CatalogService.validateSelection. هذا
//   يطابق الحماية القائمة أصلاً في ProductCard.tsx (`hasSizeOptions` يعطّل الإضافة السريعة).
// - publisher.name ثابت "سلسبيل" (نفس حد POC §J.4) — Product الحقيقي لا يحمل اسم تاجر عرض جاهزاً.
// - تسجيل componentRegistry هنا **مشروط** بـ`.has()` (خلاف POC نفسه الذي سجّل بلا شرط عمداً لصفحة
//   اختبار معزولة) — إلزامي لأي استهلاك إنتاجي حسب القاعدة الصريحة رقم 4 في وثيقة النمط أعلاه.
//
// VERTICAL-SLICE-2-MOBILE-HOME-SHELF-INTEGRATION (2026-09-22) — هذا المكوّن يُستهلَك الآن مرتين: رف
// سطح المكتب (page.tsx، بلا تغيير) ورف المتنقل (MobileStorefront.tsx، جديد) — نفس المكوّن حرفياً بلا
// أي تعديل هنا، مُركَّب مرتين، الظهور CSS-only عبر hidden lg:flex/block lg:hidden في الحاويتين
// الأصليتين (نفس نمط DesktopHeaderStem/MobileHeaderStem في الشريحة الأولى). فلتر خيار الحجم أعلاه
// يسري الآن على كلا الاستهلاكين معاً (نفس القيمة المُفلترة تصل للفرعين).

import { useMemo, useState } from 'react';
import { PageEngine } from '@/sdui/engine/PageEngine';
import { ApplicationRuntime } from '@/sdui/runtime/ApplicationRuntime';
import { componentRegistry } from '@/sdui/registry/component-registry';
import { SDUIComponent } from '@/sdui/contracts/component-contracts';
import type { SDUIPage } from '@/sdui/schema/page.schema';
import { StemProductCard } from '@/components/ui/StemProductCard';
import { HorizontalShelfStem } from '@/components/ui/HorizontalShelfStem';
import type { ProductCardStemProps } from '@/types/ui-contracts';
import type { Product } from '@/core/modules/catalog/types';
import {
  addToCartAction,
  getCartSummaryAction,
  updateCartItemAction,
  removeCartItemAction,
} from '@/app/(reef)/cart/actions';

function mapProductToStemProps(product: Product, quantity: number): ProductCardStemProps {
  return {
    id: product.id,
    title: product.name,
    price: product.basePrice,
    imageUrl: product.imageUrl,
    publisher: {
      role: product.tenantId ? 'merchant' : 'admin',
      name: 'سلسبيل',
      categoryName: product.unit,
    },
    quantity,
  };
}

const RealCatalogShelf: SDUIComponent = ({ props, onAction }) => {
  const items = Array.isArray(props.items) ? (props.items as Array<Product & { quantity?: number }>) : [];
  const mapped = items.map((product) => (
    <StemProductCard key={product.id} {...mapProductToStemProps(product, product.quantity ?? 0)} onAction={onAction} />
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

  const runtime = useMemo(() => {
    const appRuntime = new ApplicationRuntime();

    appRuntime.registerCapability('ADD_TO_CART', (action) => {
      const { id: productId, action: qtyAction, amount } = action.payload;
      void (async () => {
        try {
          const summary = await getCartSummaryAction();
          const existingLine = summary.lines.find((l) => l.product.id === productId);
          const currentQty = existingLine?.item.quantity ?? 0;

          let desiredQty: number;
          if (qtyAction === 'decrement') desiredQty = Math.max(0, currentQty - 1);
          else if (qtyAction === 'set' && amount !== undefined) desiredQty = Math.max(0, amount);
          else desiredQty = currentQty + 1;

          let result;
          if (existingLine) {
            result =
              desiredQty <= 0
                ? await removeCartItemAction(existingLine.item.id)
                : await updateCartItemAction(existingLine.item.id, desiredQty);
          } else if (desiredQty > 0) {
            result = await addToCartAction({ productId, quantity: desiredQty });
          } else {
            return;
          }

          if ('error' in result) return;

          const line = result.summary.lines.find((l) => l.product.id === productId);
          setQuantities((prev) => ({ ...prev, [productId]: line?.item.quantity ?? 0 }));
        } catch {
          // بلا معالجة إضافية هنا — نفس حدود POC (لا Action Log إنتاجي)؛ toast/معالجة أخطاء مستخدم
          // نهائي خارج نطاق هذه الدفعة (ProductCard.tsx الحالي لديه useCartToast، غير مُستنسَخ هنا عمداً
          // لإبقاء الشريحة صغيرة وقابلة للمراجعة — راجع Outstanding risks في تقرير المهمة).
        }
      })();
    });

    return appRuntime;
  }, []);

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

  return <PageEngine pageData={page} onAction={runtime.dispatch} />;
}
