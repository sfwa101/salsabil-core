'use client';
// src/components/PostCard.tsx
// بطاقة منشور واحد في خلاصة بيان (اليوم 27، BAYAN-HOME-FEED-001) — carousel صور بالتمرير+snap (نفس
// أسلوب HorizontalShelf، لكن عمودي واحد ملء العرض لا رف)، مؤشرات نقاط تتبع موضع التمرير الفعلي
// (onScroll، لا مكتبة carousel خارجية — لا حاجة لتعقيد إضافي لسلوك بهذه البساطة)، caption نصي، ثم رف
// المنتجات المرتبط (post_products) عبر HorizontalShelf/ProductCard الموجودين أصلاً.
//
// اليوم 28: النقر على صورة مرتبطة (post_media.link من نوع product/recipe) يفتح Product/Recipe Bottom
// Sheet — يُغلِق فجوة Outstanding Risk #1 من تقرير اليوم 27. صور بلا رابط (type: 'none') تبقى بلا
// تفاعل (لا cursor pointer، لا onClick) — نفس السلوك القديم بالضبط لهذه الحالة.

import { useRef, useState } from 'react';
import type { PostMediaLink, PostWithDetails } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import { HorizontalShelf } from './HorizontalShelf';
import { ProductCard } from './ProductCard';
import { BottomSheet } from './BottomSheet';
import { ProductSheetContent } from './ProductSheetContent';
import { RecipeSheetContent } from './RecipeSheetContent';

interface PostCardProps {
  post: PostWithDetails;
  products: Product[];
}

type OpenSheet = Extract<PostMediaLink, { type: 'product' | 'recipe' }>;

export function PostCard({ post, products }: PostCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  return (
    <article className="flex flex-col gap-3">
      {post.media.length > 0 && (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl"
          >
            {post.media.map((m) =>
              m.link.type === 'none' ? (
                <div key={m.id} className="aspect-square w-full shrink-0 snap-center">
                  <img src={m.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              ) : (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOpenSheet(m.link as OpenSheet)}
                  className="aspect-square w-full shrink-0 snap-center"
                >
                  <img src={m.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              )
            )}
          </div>
          {post.media.length > 1 && (
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
              {post.media.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    i === activeIndex ? 'bg-primary' : 'bg-background/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {post.caption && <p className="px-1 text-sm text-foreground">{post.caption}</p>}

      {products.length > 0 && (
        <HorizontalShelf title="منتجات هذا المنشور">
          {products.map((product) => (
            <div key={product.id} className="w-36 shrink-0 snap-start md:w-44 xl:w-48">
              <ProductCard product={product} />
            </div>
          ))}
        </HorizontalShelf>
      )}

      <BottomSheet
        open={openSheet !== null}
        onClose={() => setOpenSheet(null)}
        title={openSheet?.type === 'recipe' ? openSheet.title : 'تفاصيل المنتج'}
      >
        {openSheet?.type === 'product' && <ProductSheetContent productId={openSheet.productId} />}
        {openSheet?.type === 'recipe' && <RecipeSheetContent recipe={openSheet} />}
      </BottomSheet>
    </article>
  );
}
