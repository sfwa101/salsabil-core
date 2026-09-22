'use client';

import type { Product, Category, District } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import type { PostWithDetails } from '@/core/modules/bayan/types';
import { StoryBar } from '@/components/StoryBar';
import { MobileHeroProductCard } from './MobileHeroProductCard';
import { MobileSmallProductCard } from './MobileSmallProductCard';
import { HorizontalShelf } from '@/components/HorizontalShelf';
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
  // VERTICAL-SLICE-2-MOBILE-HOME-SHELF-INTEGRATION (2026-09-22) — كانت تصل هنا غير مُفلترة وتُعرَض عبر
  // MobileSmallProductCard/HorizontalShelf (المسار القديم). أصبحت الآن مُفلترة مسبقاً في page.tsx بنفس
  // فلتر رف سطح المكتب (استبعاد أي منتج بخيار حجم 'size' — قدرة ADD_TO_CART المُعاد استخدامها من
  // RealCatalogShelfSDUI لا تدعم اختيار حجم، راجع تعليق ذلك الملف) وتُعرَض عبر نفس خط أنابيب SDUI
  // الحقيقي (RealCatalogDataSource → DataResolver → PageEngine → StemProductCard داخل
  // HorizontalShelfStem) بدل المسار القديم. راجع docs/DECISIONS.md → ADR-035.
  realCatalogProducts: Product[];
  // نفس initialQuantities المُمرَّرة لرف سطح المكتب (page.tsx) — كميات السلة الحقيقية الحالية لكل
  // منتج، تُهيِّئ حالة StemProductCard الأولية بدل افتراض صفر دائماً. اختيارية لتفادي كسر
  // MobileStorefront.test.tsx القائم (لا يمرّرها، لا يختبر هذا القسم أصلاً — realCatalogProducts=[]
  // هناك).
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
    <div className="w-full space-y-4 py-4 bg-background min-h-screen">
      {/* 1. Story Bar */}
      <div className="bg-card rounded-[24px] shadow-sm p-3 mx-2.5 sm:mx-4 border border-border/50">
        <StoryBar districts={districts} />
      </div>

      {/* 1.5. §31 بند 3 — رف الكتالوج القابل للشراء مباشرة، مستقل عن خلاصة بيان أدناه. عبر SDUI منذ
          VERTICAL-SLICE-2-MOBILE-HOME-SHELF-INTEGRATION (2026-09-22) — نفس RealCatalogShelfSDUI الذي
          يُثبِّته رف سطح المكتب فعلياً (RUNTIME-VERIFIED)، مُعاد استخدامه حرفياً بلا تعديل (نفس نمط
          إعادة استخدام DesktopHeaderStem/MobileHeaderStem في الشريحة السابقة — كلاهما يُركَّب دائماً،
          الظهور CSS-only فقط عبر hidden lg:flex/block lg:hidden في الحاويتين الأصليتين). تسجيل
          componentRegistry('product_shelf') يحدث مرة واحدة فقط (مشروط بـ.has() داخل ذلك الملف نفسه)
          بصرف النظر عن عدد مرات تركيب المكوّن. ApplicationRuntime/CapabilityRegistry الخاصة بهذه
          النسخة مستقلة عن نسخة سطح المكتب (غير Singleton، مؤكَّد في التدقيق المعماري) — لا تعارض. */}
      {realCatalogProducts.length > 0 && (
        <div className="px-2.5 sm:px-4">
          <RealCatalogShelfSDUI
            title="منتجات ريف"
            products={realCatalogProducts}
            initialQuantities={initialQuantities}
          />
        </div>
      )}

      {/* 2. Feed Interleaving Engine */}
      {posts.length > 0 && (
        <div className="flex flex-col gap-5 pt-2">
          {posts.map((post, index) => {
            const cycleIndex = index % 6;

            // DD-024 — يُفحَص قبل فلتر postProducts أدناه عمداً: reels بيانات على مستوى الصفحة، لا
            // لكل منشور، فلا يصح إسقاط فرصة عرضها لمجرد أن منشور posts[index] نفسه بلا منتجات.
            if (cycleIndex === 5 && index === firstReelsSlotIndex) {
              return <ReelsShelfSDUI key="reels-shelf" reels={reels} />;
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

            // Cycle 5 (تكرارات لاحقة بعد firstReelsSlotIndex): لا رف ريلز ثانٍ مكرَّر بنفس المحتوى —
            // يبقى بلا عرض، نفس سلوك ما قبل DD-024.
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
