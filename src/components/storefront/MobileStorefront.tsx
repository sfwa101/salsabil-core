'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import type { Product, Category } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import type { PostWithDetails } from '@/core/modules/bayan/types';
import { StoryBar } from '@/components/StoryBar';
import { MobileHeroProductCard } from './MobileHeroProductCard';
import { MobileSmallProductCard } from './MobileSmallProductCard';
import { HorizontalShelf } from '@/components/HorizontalShelf';

interface MobileStorefrontProps {
  feedTab: string;
  categories: Category[];
  products: Product[];
  posts: PostWithDetails[];
  cartLines: CartLineSummary[];
  hasMorePosts: boolean;
}

export function MobileStorefront({
  feedTab,
  categories,
  products,
  posts,
  cartLines,
  hasMorePosts,
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
        <StoryBar categories={categories} />
      </div>

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
                    <h2 className="text-lg font-extrabold text-gray-900">
                      {postCategory?.name || 'أحدث المنتجات'}
                    </h2>
                    {postCategory && (
                      <Link href={`/${postCategory.slug}`} className="text-[13px] font-medium text-gray-500 flex items-center hover:text-emerald-600 transition-colors">
                        عرض الكل
                        <ChevronLeft size={14} className="ml-0.5" />
                      </Link>
                    )}
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
