'use client';
// src/components/ProductSheetContent.tsx
// وضع "منتج" في Product/Recipe Bottom Sheet (اليوم 28، BAYAN-HOME-FEED-001) — يجلب Product الكامل
// بالمعرّف (قد لا يكون ضمن رف post_products للمنشور نفسه؛ post_media.link.productId يشير لأي منتج)
// ثم يُغلِّف ProductOptions.tsx القائم دون أي تعديل عليه — نفس التسعير/الإضافة للسلة بالضبط.
//
// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 4) — كانت هوية الحي البصرية
// (neighborhood-identity-registry.ts) مطبَّقة فقط على product/[id]/page.tsx (الصفحة الكاملة)، لا
// هذا الشيت — نفس المنتج يبدو بهوية حي مختلفة (مموَّهة هنا، مميَّزة هناك) بحسب مسار الوصول فقط، لا
// بحسب المنتج نفسه. يجلب الآن التصنيفات (getCategoriesAction، نفس نمط getProductByIdAction) لحل
// نفس accentColor المستخدَم في الصفحة الكاملة حرفياً — لا قيمة جديدة، لا حساب مختلف.
//
// PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH (بند 6، إصلاح مُحدَّد بعد تقرير المرحلة 1) — كان هذا
// الملف يعرض فقط بلوكات location='options' (عبر <ProductOptions> وحدها) — لا صورة، لا اسم/وصف، رغم
// أن `gallery`/`titleDescription` (location='page') مسجَّلان أصلاً في product-page-blocks-registry.ts
// ويعملان صحيحاً على product/[id]/page.tsx. الإصلاح: استهلاك نفس البلوكين هنا أيضاً — لا بلوك
// `upsellShelf` (يحتاج استعلام orders إضافي وغير مناسب لشيت مضغوط، لم يُطلَب). `onProductLoaded`
// جديد اختياري — يُستدعى مرة واحدة عند نجاح الجلب، ليتمكن المستدعي (CategoryProductGrid.tsx/
// PostCard.tsx) من استخدام اسم المنتج الفعلي كعنوان BottomSheet بدل النص الثابت "تفاصيل المنتج"
// (العنوان يُعرَض في هيدر BottomSheet نفسه — خارج شجرة هذا المكوّن، فلا بديل عن رفع القيمة عبر callback
// بما أن الجلب هنا غير متزامن).

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { getCategoriesAction, getProductByIdAction } from '@/app/(reef)/feed-actions';
import { ProductOptions } from './ProductOptions';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';
import { getVisibleProductPageBlockIds, type ProductPageBlockId } from '@/config/product-page-blocks-registry';
import type { Category, Product } from '@/core/modules/catalog/types';

export function ProductSheetContent({
  productId,
  onProductLoaded,
}: {
  productId: string;
  onProductLoaded?: (product: Product) => void;
}) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined); // undefined = جارٍ التحميل
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    setProduct(undefined);
    Promise.all([getProductByIdAction(productId), getCategoriesAction()]).then(([productResult, categoriesResult]) => {
      if (cancelled) return;
      setProduct(productResult);
      setCategories(categoriesResult);
      if (productResult) onProductLoaded?.(productResult);
    });
    return () => {
      cancelled = true;
    };
    // onProductLoaded عمداً خارج deps: يُستدعى فقط عند تغيّر productId نفسه (فتح منتج جديد)، لا عند
    // كل إعادة تصيير للمستدعي (لا eslint react-hooks مفعَّل في المشروع، لكن نفس المبدأ).
  }, [productId]);

  if (product === undefined) {
    return <p className="py-6 text-center text-muted-foreground">جارٍ التحميل...</p>;
  }

  if (!product || !product.isActive) {
    return <p className="py-6 text-center text-muted-foreground">هذا المنتج لم يعد متاحاً</p>;
  }

  const category = categories.find((c) => c.id === product.categoryId) ?? null;
  const identity = category ? getNeighborhoodIdentity('reef', category.slug) : null;

  function renderPageBlock(product: Product, blockId: ProductPageBlockId) {
    switch (blockId) {
      case 'gallery':
        return (
          <div key="gallery" className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 32rem"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageOff size={32} />
              </div>
            )}
            {category && (
              <span
                className="sb-glass absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold text-foreground"
                style={identity ? { color: identity.accentColor } : undefined}
              >
                {category.name}
              </span>
            )}
          </div>
        );

      case 'titleDescription':
        return (
          <div key="titleDescription">
            <h2 className="text-lg font-bold text-foreground">{product.name}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">السعر لكل {product.unit}</p>
            {product.description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            )}
          </div>
        );

      // upsellShelf وأي بلوك مستقبلي آخر لـlocation='page' غير مدعوم هنا عمداً — راجع تعليق أعلى الملف.
      default:
        return null;
    }
  }

  return (
    <div
      className="rounded-2xl"
      style={identity ? { boxShadow: `inset 3px 0 0 0 ${identity.accentColor}` } : undefined}
    >
      <div className="flex flex-col gap-4 p-1">
        {getVisibleProductPageBlockIds(product, 'page').map((blockId) => renderPageBlock(product, blockId))}
        <ProductOptions product={product} accentColor={identity?.accentColor} />
      </div>
    </div>
  );
}
