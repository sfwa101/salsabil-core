'use client';

import { Fragment } from 'react';

import type { Product, Category, District } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import type { PostWithDetails } from '@/core/modules/bayan/types';
import { CategoryBarNav } from '@/app/(reef)/CategoryBarNav';
import { StemProductCardAdapter } from '@/components/StemProductCardAdapter';
// MobileHeroProductCard (رف "Hero Cards" أدناه، دورات 0/1/3/4) يبقى كما هو عمداً — HOMEPAGE-SHELL-
// VISUAL-PARITY-PASS (2026-09-22): بطاقة عرض بملء العرض، بلا نظير Stem مطابق في مكتبة الـ18. StemProductCard
// مصمَّم بعرض رف ثابت (w-[145px]...shrink-0، مطابق لـ"منتجات ريف"/دورة 2 أدناه بعد التبديل) — إقحامه
// في حاوية ملء العرض هنا ينتج بطاقة ضيقة داخل مساحة واسعة (تراجع بصري، لا مطابقة). راجع تقرير المهمة.
import { MobileHeroProductCard } from './MobileHeroProductCard';
import { HorizontalShelfStem } from '@/components/ui/HorizontalShelfStem';
import { RealCatalogShelfSDUI } from '@/app/(reef)/RealCatalogShelfSDUI';
import { ReelsShelfSDUI } from '@/app/(reef)/ReelsShelfSDUI';
import type { RealReelSnapshot } from '@/app/(reef)/data/ReelsDataSource';

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
  // VERTICAL-SLICE-2-MOBILE-HOME-SHELF-INTEGRATION (2026-09-22) — كانت تُعرَض عبر
  // MobileSmallProductCard/HorizontalShelf (المسار القديم). تُعرَض الآن عبر نفس خط أنابيب SDUI
  // الحقيقي بلا استبعاد لمنتجات الخيارات؛ هذه تنتقل للتهيئة ولا تصل إلى cart mutation
  // (RealCatalogDataSource → DataResolver → PageEngine → StemProductCard داخل
  // HorizontalShelfStem) بدل المسار القديم. راجع docs/DECISIONS.md → ADR-035.
  realCatalogProducts: Product[];
  // نفس initialQuantities المُمرَّرة لرف سطح المكتب (page.tsx) — كميات السلة الحقيقية الحالية لكل
  // منتج، تُهيِّئ حالة StemProductCard الأولية بدل افتراض صفر دائماً. اختيارية لتفادي كسر
  // المستهلكين الأقدم الذين لا يمرّرونها.
  initialQuantities?: Record<string, number>;
  // DD-024 — ريلز حقيقية (post_type='reel')، مستقلة تماماً عن posts أعلاه (منشورات بيان العادية).
  // اختيارية بلا افتراض [] هنا (بل في الاستخدام أدناه) لنفس سبب initialQuantities — لا تكسر
  // MobileStorefront.test.tsx القائم.
  reels?: RealReelSnapshot[];
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
  initialQuantities = {},
  reels = [],
}: MobileStorefrontProps) {
  // TASK-04 — فرع "reel" (كان يعرض <ReelsFeed /> ببيانات MOCK_REELS ثابتة بلا أي علاقة بمنشورات
  // حقيقية — لا عمود فيديو في post_media أصلاً، راجع Header.tsx) أُزيل عمداً. زر التبويب المؤدي لهذه
  // القيمة أُزيل من Header.tsx أيضاً؛ حتى عبر رابط ?tab=reel يدوي، feedTab غير مستخدَم في أي مكان آخر
  // بهذا المكوّن — القيمة تسقط تلقائياً إلى نفس الخلاصة العادية أدناه.
  //
  // DD-024 — "Cycle 5: Mini Reels Bar" (أدناه) لم يعد مُعطَّلاً: يعرض الآن ReelsShelfSDUI ببيانات
  // reel حقيقية. reels مصدر بيانات مستقل عن posts (page-level، لا لكل منشور) — يُعرَض مرة واحدة فقط
  // عند أول فرصة (index % 6 === 5) في التسلسل، لا عند كل تكرار لاحق (تفادياً لتكرار نفس الرف).
  const firstReelsSlotIndex = reels.length > 0 ? posts.findIndex((_, i) => i % 6 === 5) : -1;

  return (
    <div className="w-full space-y-4 pt-44 pb-28 bg-[var(--sb-muted)] min-h-screen">
      {/* 1. Story Bar — HOMEPAGE-SHELL-VISUAL-PARITY-PASS: كان StoryBar (تدرّجات Tailwind حرفية
          ثابتة)، الآن CategoryBarStem عبر نفس محوّل CategoryBarNav المُثبَت فعلياً لتصفح
          الأحياء/الأقسام (a8c8c0d) — basePath="" لأن وجهة الحي هنا جذرية (`/${slug}`) لا متداخلة. */}
      <CategoryBarNav
        items={districts.map((d) => ({ id: d.slug, name: d.nameAr }))}
        basePath=""
      />

      {/* 2. First Hero Item (If available) */}
      {posts.length > 0 && (() => {
        const firstPost = posts[0];
        const postCategory = categories.find((c) => c.id === firstPost.categoryId);
        const postProducts = firstPost.productIds
          .map((id) => products.find((p) => p.id === id))
          .filter(Boolean) as Product[];

        if (postProducts.length === 0) return null;
        return (
          <div className="flex flex-col gap-5 pt-2">
            {postProducts.map((p) => (
              <div key={`hero-${firstPost.id}-${p.id}`} className="px-2.5 sm:px-4">
                <MobileHeroProductCard
                  product={p}
                  category={postCategory}
                  cartLine={cartLines.find((c) => c.item.productId === p.id)}
                />
              </div>
            ))}
          </div>
        );
      })()}

      {/* 1.5. §31 بند 3 — رف الكتالوج القابل للشراء مباشرة */}
      {realCatalogProducts.length > 0 && (
        <div className="px-2.5 sm:px-4">
          <RealCatalogShelfSDUI
            title="منتجات ريف"
            products={realCatalogProducts}
            initialQuantities={initialQuantities}
          />
        </div>
      )}

      {/* 3. Feed Interleaving Engine (Rest of posts) */}
      {posts.length > 1 && (
        <div className="flex flex-col gap-5 pt-2">
          {posts.slice(1).map((post, sliceIndex) => {
            const index = sliceIndex + 1; // Actual index in original array
            const cycleIndex = index % 6;

            // DD-024 — Reels
            if (cycleIndex === 5 && index === firstReelsSlotIndex) {
              const reelSlotCategory = categories.find((category) => category.id === post.categoryId);
              const reelSlotProducts = post.productIds
                .map((id) => products.find((product) => product.id === id))
                .filter(Boolean) as Product[];
              return (
                <Fragment key={post.id}>
                  <div className="py-2 pb-6">
                    <ReelsShelfSDUI reels={reels} />
                  </div>
                  {reelSlotProducts.map((product) => (
                    <div key={`${post.id}-${product.id}`} className="px-2.5 sm:px-4">
                      <MobileHeroProductCard
                        product={product}
                        category={reelSlotCategory}
                        cartLine={cartLines.find((line) => line.item.productId === product.id)}
                      />
                    </div>
                  ))}
                </Fragment>
              );
            }

            const postCategory = categories.find((c) => c.id === post.categoryId);
            const postProducts = post.productIds
              .map((id) => products.find((p) => p.id === id))
              .filter(Boolean) as Product[];

            if (postProducts.length === 0) return null;

            // Cycle 2: Horizontal Shelf
            if (cycleIndex === 2) {
              return (
                <div key={post.id} className="py-2">
                  <div className="w-full">
                    <HorizontalShelfStem
                      title={postCategory?.name || 'أحدث المنتجات'}
                      items={postProducts.map((p) => (
                        <div key={`${post.id}-${p.id}`} className="w-[145px] shrink-0">
                          <StemProductCardAdapter
                            product={p}
                            cartLine={cartLines.find((c) => c.item.productId === p.id)}
                          />
                        </div>
                      ))}
                    />
                  </div>
                </div>
              );
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

      {hasMorePosts && (
        <div className="w-full flex items-center justify-center py-8">
            <div className="w-10 h-10 rounded-full bg-card/60 shadow-sm flex items-center justify-center border border-border">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
}
