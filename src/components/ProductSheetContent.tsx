'use client';
// src/components/ProductSheetContent.tsx
// وضع "منتج" في Product/Recipe Bottom Sheet (اليوم 28، BAYAN-HOME-FEED-001) — يجلب Product الكامل
// بالمعرّف (قد لا يكون ضمن رف post_products للمنشور نفسه؛ post_media.link.productId يشير لأي منتج)
// ثم يُغلِّف ProductOptions.tsx القائم دون أي تعديل عليه — نفس التسعير/الإضافة للسلة بالضبط.

import { useEffect, useState } from 'react';
import { getProductByIdAction } from '@/app/(reef)/feed-actions';
import { ProductOptions } from './ProductOptions';
import type { Product } from '@/core/modules/catalog/types';

export function ProductSheetContent({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null | undefined>(undefined); // undefined = جارٍ التحميل

  useEffect(() => {
    let cancelled = false;
    setProduct(undefined);
    getProductByIdAction(productId).then((result) => {
      if (!cancelled) setProduct(result);
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

  return <ProductOptions product={product} />;
}
