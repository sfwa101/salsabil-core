'use client';
// src/components/Feed.tsx
// مُنسِّق خلاصة بيان الرئيسية (اليوم 27، BAYAN-HOME-FEED-001) — يستقبل الصفحة الأولى مُصيَّرة من
// الخادم (page.tsx)، ثم يحمّل صفحات إضافية عبر loadFeedPageAction (feed-actions.ts) كلما وصل عنصر
// "الحارس" (sentinel) الفارغ أسفل القائمة إلى منطقة الرؤية — IntersectionObserver، أول استخدام له في
// هذا المستودع، بدل مستمع scroll يدوي. رف الريلز يتخلل القائمة كل REEL_SHELF_INTERVAL منشورات — رقم
// بصري تعسّفي، لا علاقة له بعدد الريلز الفعلي.
//
// VISUAL-PARITY-PASS (2026-09-22) — ReelsShelfPlaceholder (نائب بصري بحت، "قريباً") استُبدِل بـ
// ReelsShelfSDUI الحقيقي — DD-024 بنى Backend فعلياً لـpost_type='reel' بعد أن كُتب هذا الملف، فبقي
// النائب هنا بلا داعٍ (نفس بيانات reels المُمرَّرة أصلاً للجوال في MobileStorefront). يُعرَض مرة واحدة
// فقط (أول فرصة تخلّل)، لا عند كل REEL_SHELF_INTERVAL — نفس منطق "لا تكرار نفس الرف" المُطبَّق في
// MobileStorefront.tsx.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PostWithDetails, PostType } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import { loadFeedPageAction } from '@/app/(reef)/feed-actions';
import { MobileHeroProductCard } from '@/components/storefront/MobileHeroProductCard';
import { HorizontalShelfStem } from '@/components/ui/HorizontalShelfStem';
import { StemProductCardAdapter } from '@/components/StemProductCardAdapter';
import { ReelsShelfSDUI } from '@/app/(reef)/ReelsShelfSDUI';
import type { RealReelSnapshot } from '@/app/(reef)/data/ReelsDataSource';

const REEL_SHELF_INTERVAL = 4;

interface FeedProps {
  initialPosts: PostWithDetails[];
  initialHasMore: boolean;
  initialProducts: Product[];
  postTypes?: PostType[];
  reels?: RealReelSnapshot[];
}

export function Feed({ initialPosts, initialHasMore, initialProducts, postTypes, reels = [] }: FeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [products, setProducts] = useState(initialProducts);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const firstReelsSlotIndex = reels.length > 0 ? posts.findIndex((_, i) => i % 6 === 5) : -1;

  // page.tsx يعيد التصيير بصفحة أولى جديدة كاملة عند تغيّر التبويب (?tab=، رابط مختلف) — هذا
  // التزامن يستبدل حالة الخلاصة القديمة بدل تراكمها فوق تبويب سابق.
  useEffect(() => {
    setPosts(initialPosts);
    setHasMore(initialHasMore);
    setProducts(initialProducts);
  }, [initialPosts, initialHasMore, initialProducts]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    try {
      const result = await loadFeedPageAction({ postTypes, offset: posts.length });
      setPosts((prev) => [...prev, ...result.posts]);
      setHasMore(result.hasMore);
      setProducts((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        result.products.forEach((p) => map.set(p.id, p));
        return Array.from(map.values());
      });
    } finally {
      loadingRef.current = false;
    }
  }, [hasMore, postTypes, posts.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  if (posts.length === 0) {
    return <p className="px-4 py-10 text-center text-muted-foreground">لا توجد منشورات بعد.</p>;
  }

  return (
    // اليوم 31 (Responsive Pass): Grid بدل عمود Flex واحد — 1 عمود على الموبايل، عمودان من md
    // (تابلت)، 3 أعمدة من xl (ديسكتوب). رف الريلز النائب وحارس التمرير اللانهائي يأخذان
    // col-span-full (صف كامل العرض بصرف النظر عن عدد الأعمدة) — لا يصح أن يقع الريلز داخل عمود واحد
    // وسط شبكة متعددة الأعمدة. خط الفاصل بين المنشورات (border-b) يفترض ترتيباً عمودياً واحداً
    // فيُزال من md فصاعداً، تعتمد المسافة البصرية بين البطاقات على gap-8 فقط.
    <div className="flex flex-col gap-5 pt-2 w-full pb-8">
      {posts.map((post, index) => {
        const cycleIndex = index % 6;

        if (cycleIndex === 5 && index === firstReelsSlotIndex) {
          const reelSlotProducts = post.productIds
            .map((id) => productsById.get(id))
            .filter((product): product is Product => Boolean(product));
          return (
            <Fragment key={post.id}>
              <div className="py-2 pb-6">
                <ReelsShelfSDUI reels={reels} />
              </div>
              {reelSlotProducts.map((product) => (
                <div key={`${post.id}-${product.id}`} className="px-0 sm:px-2">
                  <MobileHeroProductCard product={product} />
                </div>
              ))}
            </Fragment>
          );
        }

        const postProducts = post.productIds
          .map((id) => productsById.get(id))
          .filter((p): p is Product => Boolean(p));

        if (postProducts.length === 0) return null;

        if (cycleIndex === 2) {
          return (
            <div key={post.id} className="py-2">
              <div className="w-full">
                <HorizontalShelfStem
                  title="أحدث المنتجات"
                  items={postProducts.map((p) => (
                    <div key={`${post.id}-${p.id}`} className="w-[145px] shrink-0">
                      <StemProductCardAdapter product={p} />
                    </div>
                  ))}
                />
              </div>
            </div>
          );
        }

        return postProducts.map((p) => (
          <div key={`${post.id}-${p.id}`} className="px-0 sm:px-2">
            <MobileHeroProductCard product={p} />
          </div>
        ));
      })}
      {hasMore && <div ref={sentinelRef} aria-hidden className="w-full h-px" />}
    </div>
  );
}
