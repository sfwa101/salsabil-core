'use client';
// src/components/CategoryProductGrid.tsx
// PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH (بند 1) — [category]/page.tsx كانت تفتح صفحة منتج
// كاملة منفصلة (`/product/[id]`) عند الضغط على بطاقة — الخلاصة الرئيسية (PostCard.tsx) تفتح Bottom
// Sheet بدلاً من ذلك منذ اليوم 27. هذا المكوّن يطبّق **نفس النمط حرفياً** (BottomSheet.tsx +
// ProductSheetContent.tsx + حالة sheet محلية) لصفحة الحي — اتساق تجربة عبر كل نقاط الدخول كما طلب
// الموجّه، بلا اختراع آلية جديدة.
//
// `cartLineByProductId` يُبنى هنا محلياً من `cartLines` (مصفوفة قابلة للتسلسل عبر حدود Server/Client)
// بدل تمرير Map جاهزة من [category]/page.tsx (Server Component) — Map ليست قابلة للتسلسل عبر React
// Server Components flight protocol.
//
// `/product/[id]` الصفحة الكاملة **بلا أي تغيير** — تبقى وجهة صالحة لمشاركة رابط مباشر/محركات بحث،
// هذا التعديل يمس فقط كيفية فتح بطاقة منتج من داخل شبكة صفحة الحي.

import { useState } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { BottomSheet } from '@/components/BottomSheet';
import { ProductSheetContent } from '@/components/ProductSheetContent';
import type { Product } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';

export function CategoryProductGrid({ products, cartLines }: { products: Product[]; cartLines: CartLineSummary[] }) {
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const cartLineByProductId = new Map(cartLines.map((line) => [line.product.id, line]));

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            cartLine={cartLineByProductId.get(product.id)}
            onOpenSheet={setOpenProductId}
          />
        ))}
      </div>

      <BottomSheet open={openProductId !== null} onClose={() => setOpenProductId(null)} title="تفاصيل المنتج">
        {openProductId && <ProductSheetContent productId={openProductId} />}
      </BottomSheet>
    </>
  );
}
