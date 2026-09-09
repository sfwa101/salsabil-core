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

import { useEffect, useState } from 'react';
import { getCategoriesAction, getProductByIdAction } from '@/app/(reef)/feed-actions';
import { ProductOptions } from './ProductOptions';
import { getNeighborhoodIdentity } from '@/config/neighborhood-identity-registry';
import type { Category, Product } from '@/core/modules/catalog/types';

export function ProductSheetContent({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined); // undefined = جارٍ التحميل
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;
    setProduct(undefined);
    Promise.all([getProductByIdAction(productId), getCategoriesAction()]).then(([productResult, categoriesResult]) => {
      if (cancelled) return;
      setProduct(productResult);
      setCategories(categoriesResult);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (product === undefined) {
    return <p className="py-6 text-center text-muted-foreground">جارٍ التحميل...</p>;
  }

  if (!product || !product.isActive) {
    return <p className="py-6 text-center text-muted-foreground">هذا المنتج لم يعد متاحاً</p>;
  }

  const category = categories.find((c) => c.id === product.categoryId) ?? null;
  const identity = category ? getNeighborhoodIdentity('reef', category.slug) : null;

  return (
    <div
      className="rounded-2xl"
      style={identity ? { boxShadow: `inset 3px 0 0 0 ${identity.accentColor}` } : undefined}
    >
      <div className="p-1">
        <ProductOptions product={product} accentColor={identity?.accentColor} />
      </div>
    </div>
  );
}
