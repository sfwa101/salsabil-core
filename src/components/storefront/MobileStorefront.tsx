'use client';

import type { Product, Category, District } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import type { PostWithDetails } from '@/core/modules/bayan/types';
import { StoryBar } from '@/components/StoryBar';
import { MobileHeroProductCard } from './MobileHeroProductCard';
import { MobileSmallProductCard } from './MobileSmallProductCard';
import { HorizontalShelf } from '@/components/HorizontalShelf';

interface MobileStorefrontProps {
  feedTab: string;
  // TASK-18: كانا نفس القائمة (Category[] من categories القديم) — الآن مصدران مختلفان عمداً.
  // districts: تصفح الأحياء الحقيقي (StoryBar) عبر catalog_districts. categories: تصنيف المنشورات
  // نفسها (badge/رابط "عرض الكل" أسفل كل منشور) — مفهوم محتوى منفصل، ما زال على categories القديمة
  // عمداً (راجع تقرير TASK-18 النهائي لسبب عدم لمسه).
  districts: District[];
  categories: Category[];
  products: Product[];
  posts: PostWithDetails[];
  cartLines: CartLineSummary[];
  hasMorePosts: boolean;
  // §31 بند 3 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md) — الكتالوج القابل للشراء مباشرة، بمعزل
  // تام عن `products`/`posts` أعلاه (تلك مصدرها منشورات بيان حصراً). راجع
  // catalogService.listPurchasableProducts.
  realCatalogProducts: Product[];
}

export function MobileStorefront({
  feedTab,
  districts,
  categories,
  products,
  posts,
  cartLines,
  hasMorePosts,
  realCatalogProducts,
}: MobileStorefrontProps) {
  // TASK-04 — فرع "reel" (كان يعرض <ReelsFeed /> ببيانات MOCK_REELS ثابتة بلا أي علاقة بمنشورات
  // حقيقية — لا عمود فيديو في post_media أصلاً، راجع Header.tsx) أُزيل عمداً. زر التبويب المؤدي لهذه
  // القيمة أُزيل من Header.tsx أيضاً؛ حتى عبر رابط ?tab=reel يدوي، feedTab غير مستخدَم في أي مكان آخر
  // بهذا المكوّن — القيمة تسقط تلقائياً إلى نفس الخلاصة العادية أدناه بدل عرض بيانات وهمية، بنفس منطق
  // "Cycle 5: Mini Reels Bar (Disabled until real data is available)" الموجود أصلاً أسفل هذا الملف.

  return (
    <div className="w-full space-y-4 py-4 bg-background min-h-screen">
      {/* 1. Story Bar */}
      <div className="bg-card rounded-[24px] shadow-sm p-3 mx-2.5 sm:mx-4 border border-border/50">
        <StoryBar districts={districts} />
      </div>

      {/* 1.5. §31 بند 3 — رف الكتالوج القابل للشراء مباشرة، مستقل عن خلاصة بيان أدناه */}
      {realCatalogProducts.length > 0 && (
        <div className="px-2.5 sm:px-4">
          <HorizontalShelf title="منتجات ريف">
            {realCatalogProducts.map((p) => (
              <MobileSmallProductCard
                key={p.id}
                product={p}
                cartLine={cartLines.find((c) => c.item.productId === p.id)}
              />
            ))}
          </HorizontalShelf>
        </div>
      )}

      {/* 2. Feed Interleaving Engine */}
      {posts.length > 0 && (
        <div className="flex flex-col gap-5 pt-2">
          {posts.map((post, index) => {
            const postCategory = categories.find((c) => c.id === post.categoryId);
            const postProducts = post.productIds
              .map((id) => products.find((p) => p.id === id))
              .filter(Boolean) as Product[];

            if (postProducts.length === 0) return null;

            const cycleIndex = index % 6;

            // Cycle 2: Horizontal Shelf
            if (cycleIndex === 2) {
              return (
                <div key={post.id} className="py-2">
                  <div className="flex items-center justify-between mb-3 px-1.5">
                    <h2 className="text-lg font-extrabold text-foreground">
                      {postCategory?.name || 'أحدث المنتجات'}
                    </h2>
                    {/* TASK-18: كان الرابط يؤدي لـ /${postCategory.slug} (مسار قسم المنشور القديم،
                        categories). ذلك المسار حُذف مع نقل تصفح الكتالوج للأحياء الجديدة
                        (/[district])، ولا صفحة مكافئة لأقسام المنشورات القديمة اليوم — رابط "عرض
                        الكل" أُزيل لتفادي 404 حي بدل اختراع وجهة غير موجودة؛ العنوان النصي بقي كما
                        هو (تصنيف المنشور، خارج نطاق هذا التاسك). */}
                  </div>
                  <div className="w-full">
                    <HorizontalShelf emptyMessage="لا توجد منتجات">
                      {postProducts.map((p) => (
                        <MobileSmallProductCard
                          key={`${post.id}-${p.id}`}
                          product={p}
                          cartLine={cartLines.find((c) => c.item.productId === p.id)}
                        />
                      ))}
                    </HorizontalShelf>
                  </div>
                </div>
              );
            }

            // Cycle 5: Mini Reels Bar (Disabled until real data is available)
            if (cycleIndex === 5) {
              return null;
            }

            // Cycles 0, 1, 3, 4: Hero Cards
            return postProducts.map((p) => (
              <div key={`${post.id}-${p.id}`} className="px-2.5 sm:px-4">
                <MobileHeroProductCard
                  product={p}
                  category={postCategory}
                  cartLine={cartLines.find((c) => c.item.productId === p.id)}
                />
              </div>
            ));
          })}
        </div>
      )}
    </div>
  );
}
