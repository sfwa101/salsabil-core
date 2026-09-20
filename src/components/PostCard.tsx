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
import { BadgeCheck, Heart, Share2, Plus, ChevronLeft } from 'lucide-react';
import type { PostMedia, PostType, PostWithDetails } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import { HorizontalShelf } from './HorizontalShelf';
import { ProductCard } from './ProductCard';
import { BottomSheet } from './BottomSheet';
import { ProductSheetContent } from './ProductSheetContent';
import { RecipeSheetContent } from './RecipeSheetContent';
import { PostSheetContent } from './PostSheetContent';
import { useOptimisticCartLine } from './useOptimisticCartLine';
import { useCartToast } from './useCartToast';
import { QuantityStepper } from './QuantityStepper';

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
  const [productSheetName, setProductSheetName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isProductCentric = PRODUCT_CENTRIC_TYPES.includes(post.postType);

  // TASK-04 — ربط زر "أضف إلى السلة" (قسم 3، Hero Product Details) بنفس آلية السلة الحقيقية
  // المستخدَمة في ProductCard.tsx حرفياً (useOptimisticCartLine → addToCartAction/updateCartItemAction)،
  // لا مساراً موازياً. لا cartLine مُمرَّرة هنا (Feed.tsx لا يجلبها لهذا المكوّن اليوم، خارج نطاق
  // TASK-04) — نفس نمط استدعاء ProductCard الآخر في هذا الملف بالضبط (رف "منتجات هذا المنشور" أسفله،
  // بلا cartLine أيضاً)، فيبدأ العدّاد من صفر عند كل mount ثم يتزامن مع الخادم بعد أول إضافة ناجحة.
  const heroProduct = products[0];
  const heroHasSizeOptions = heroProduct?.options.some((o) => o.type === 'size') ?? false;
  const { showToast, toastNode: cartToastNode } = useCartToast();
  const { quantity: heroQuantity, setQuantity: setHeroQuantity } = useOptimisticCartLine(
    heroProduct?.id ?? '',
    heroProduct?.basePrice ?? 0,
    undefined,
    showToast
  );

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function openProductSheet(productId: string) {
    setProductSheetName(null);
    setSheet({ kind: 'product', productId });
  }

  function handleMediaClick(media: PostMedia) {
    if (media.link.type === 'recipe') {
      setSheet({ kind: 'recipe', ...media.link });
      return;
    }
    if (isProductCentric) {
      const productId = media.link.type === 'product' ? media.link.productId : products[0]?.id;
      if (productId) openProductSheet(productId);
      return;
    }
    setSheet({ kind: 'post' });
  }

  return (
    <article className="flex flex-col gap-3">
      {/* 1. Mobile Publisher Header (lg:hidden) */}
      <div className="flex items-center justify-between px-2 lg:hidden mb-1">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg leading-none">ر</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground text-[13px]">ريف المدينة</span>
              <BadgeCheck className="text-primary" size={14} />
            </div>
            <span className="text-[11px] text-muted-foreground">الخضار والفواكه · طازج اليوم</span>
          </div>
        </div>
        <button className="flex items-center text-[11px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
          القسم <ChevronLeft size={12} className="mr-0.5" />
        </button>
      </div>

      {/* 2. Hero Image */}
      {post.media.length > 0 && (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-2xl mx-1"
          >
            {post.media.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleMediaClick(m)}
                className="relative aspect-square w-full shrink-0 snap-center"
              >
                <Image src={m.imageUrl} alt="" fill loading="lazy" sizes="100vw" className="object-contain" />
              </button>
            ))}
          </div>

          {/* Action Buttons Overlay - Mobile Only */}
          <div className="absolute top-3 left-4 flex flex-col gap-2 lg:hidden">
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-card">
              <Heart size={18} />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-card">
              <Share2 size={18} />
            </button>
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

      {/* 3. Hero Product Details - Mobile Only */}
      {products.length > 0 && (
        <div className="flex flex-col gap-1 px-3 lg:hidden">
          <h3 className="text-lg font-bold text-foreground">{products[0].name}</h3>
          {post.caption && <p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p>}
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold leading-none text-foreground">{products[0].basePrice}</span>
              <span className="text-sm font-medium text-muted-foreground">جنيه</span>
            </div>
            {!heroHasSizeOptions &&
              (heroQuantity > 0 ? (
                <QuantityStepper
                  variant="pill"
                  quantity={heroQuantity}
                  onDecrement={() => setHeroQuantity(heroQuantity - 1)}
                  onIncrement={() => setHeroQuantity(heroQuantity + 1)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setHeroQuantity(1)}
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                >
                  <Plus size={16} strokeWidth={3} /> أضف إلى السلة
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 4. Desktop Caption */}
      {post.caption && <p className="hidden px-2 text-sm text-foreground lg:block">{post.caption}</p>}

      {products.length > 0 && (
        <HorizontalShelf title="منتجات هذا المنشور">
          {products.map((product) => (
            <div key={product.id} className="w-36 shrink-0 snap-start md:w-44 xl:w-48">
              <ProductCard product={product} onOpenSheet={openProductSheet} />
            </div>
          ))}
        </HorizontalShelf>
      )}

      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet?.kind === 'recipe' ? sheet.title : sheet?.kind === 'product' ? (productSheetName ?? 'تفاصيل المنتج') : undefined}
      >
        {sheet?.kind === 'product' && (
          <ProductSheetContent productId={sheet.productId} onProductLoaded={(p) => setProductSheetName(p.name)} />
        )}
        {sheet?.kind === 'recipe' && (
          <RecipeSheetContent
            recipe={{ type: 'recipe', title: sheet.title, baseFamilySize: sheet.baseFamilySize, ingredients: sheet.ingredients }}
          />
        )}
        {sheet?.kind === 'post' && (
          <PostSheetContent post={post} products={products} onSelectProduct={openProductSheet} />
        )}
      </BottomSheet>
      {cartToastNode}
    </article>
  );
}
