'use client';
// src/components/PostCard.tsx
// بطاقة منشور واحد في خلاصة بيان (اليوم 27، BAYAN-HOME-FEED-001) — carousel صور بالتمرير+snap (نفس
// أسلوب HorizontalShelf، لكن عمودي واحد ملء العرض لا رف)، مؤشرات نقاط تتبع موضع التمرير الفعلي
// (onScroll، لا مكتبة carousel خارجية — لا حاجة لتعقيد إضافي لسلوك بهذه البساطة)، caption نصي، ثم رف
// المنتجات المرتبط (post_products) عبر HorizontalShelf/ProductCard الموجودين أصلاً.
//
// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 2) — إعادة بناء منطق التوجيه عند الضغط:
// كان القرار السابق (اليوم 28) يعتمد فقط على نوع رابط الصورة المفردة (post_media.link)، بصرف النظر
// عن postType — أي صورة موسومة بمنتج تفتح مباشرة Product Sheet حتى داخل منشور عام (postType='post'/
// 'reel') له caption/سياق كامل، فيُفقَد ذلك السياق فوراً. هذا هو "الخلط" المطلوب فصله صراحة:
//
//   - postType ∈ {product_highlight, offer} → المنشور *هو* المنتج نفسه بطبيعته. الضغط على أي صورة
//     فيه يفتح Product Sheet مباشرة (نفس السلوك القديم) — يستخدم رابط الصورة المحدَّد إن وُجد، وإلا
//     أول منتج في post_products (الحالة الشائعة لـproduct_highlight: صورة واحدة بلا رابط فردي،
//     والمنتج نفسه من post_products).
//   - postType ∈ {post, reel} → منشور عام قد يذكر عدة منتجات أو لا شيء. الضغط على أي صورة (حتى
//     الموسومة بمنتج فردياً) يفتح PostSheetContent (المنشور كاملاً: carousel + caption + رف
//     "المنتجات المذكورة") — الوصول لمنتج معيّن يمر عبر ذلك الرف صراحة، لا اختصاراً من الصورة.
//   - رابط 'recipe' يبقى كما كان في الحالتين (مسار ثالث لا يغطيه هذا التمييز الثنائي، خارج نطاق
//     موجّه المهمة صراحة) — يفتح RecipeSheetContent دائماً بصرف النظر عن postType.
//
// صور بلا رابط (type: 'none') كانت "بلا تفاعل" سابقاً — أصبحت الآن تفتح PostSheetContent لمنشور
// عام (المنشور نفسه صار وجهة تفاعل حقيقية بعد بناء هذا الشيت)، وتبقى بلا تفاعل لمنشور منتج بلا أي
// منتج مرتبط أصلاً (حالة نادرة/بيانات ناقصة — fail-safe، لا كسر).

import { useRef, useState } from 'react';
import Image from 'next/image';
import type { PostMedia, PostType, PostWithDetails } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import { HorizontalShelf } from './HorizontalShelf';
import { ProductCard } from './ProductCard';
import { BottomSheet } from './BottomSheet';
import { ProductSheetContent } from './ProductSheetContent';
import { RecipeSheetContent } from './RecipeSheetContent';
import { PostSheetContent } from './PostSheetContent';

interface PostCardProps {
  post: PostWithDetails;
  products: Product[];
}

type SheetState =
  | { kind: 'product'; productId: string }
  | { kind: 'recipe'; title: string; baseFamilySize: number; ingredients: { productId: string; baseQuantity: number }[] }
  | { kind: 'post' }
  | null;

const PRODUCT_CENTRIC_TYPES: PostType[] = ['product_highlight', 'offer'];

export function PostCard({ post, products }: PostCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sheet, setSheet] = useState<SheetState>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isProductCentric = PRODUCT_CENTRIC_TYPES.includes(post.postType);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function handleMediaClick(media: PostMedia) {
    if (media.link.type === 'recipe') {
      setSheet({ kind: 'recipe', ...media.link });
      return;
    }
    if (isProductCentric) {
      const productId = media.link.type === 'product' ? media.link.productId : products[0]?.id;
      if (productId) setSheet({ kind: 'product', productId });
      return;
    }
    setSheet({ kind: 'post' });
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
            {post.media.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleMediaClick(m)}
                className="relative aspect-square w-full shrink-0 snap-center"
              >
                <Image src={m.imageUrl} alt="" fill loading="lazy" sizes="100vw" className="object-cover" />
              </button>
            ))}
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
              <ProductCard product={product} onOpenSheet={(productId) => setSheet({ kind: 'product', productId })} />
            </div>
          ))}
        </HorizontalShelf>
      )}

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet?.kind === 'recipe' ? sheet.title : sheet?.kind === 'product' ? 'تفاصيل المنتج' : undefined}
      >
        {sheet?.kind === 'product' && <ProductSheetContent productId={sheet.productId} />}
        {sheet?.kind === 'recipe' && (
          <RecipeSheetContent
            recipe={{ type: 'recipe', title: sheet.title, baseFamilySize: sheet.baseFamilySize, ingredients: sheet.ingredients }}
          />
        )}
        {sheet?.kind === 'post' && (
          <PostSheetContent
            post={post}
            products={products}
            onSelectProduct={(productId) => setSheet({ kind: 'product', productId })}
          />
        )}
      </BottomSheet>
    </article>
  );
}
