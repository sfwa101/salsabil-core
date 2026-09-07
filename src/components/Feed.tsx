'use client';
// src/components/Feed.tsx
// مُنسِّق خلاصة بيان الرئيسية (اليوم 27، BAYAN-HOME-FEED-001) — يستقبل الصفحة الأولى مُصيَّرة من
// الخادم (page.tsx)، ثم يحمّل صفحات إضافية عبر loadFeedPageAction (feed-actions.ts) كلما وصل عنصر
// "الحارس" (sentinel) الفارغ أسفل القائمة إلى منطقة الرؤية — IntersectionObserver، أول استخدام له في
// هذا المستودع، بدل مستمع scroll يدوي. رفوف الريلز النائبة (ReelsShelfPlaceholder) تتخلل القائمة كل
// REEL_SHELF_INTERVAL منشورات — رقم بصري تعسّفي، لا مصدر بيانات حقيقي وراءه.

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PostWithDetails, PostType } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import { loadFeedPageAction } from '@/app/(reef)/feed-actions';
import { PostCard } from './PostCard';
import { ReelsShelfPlaceholder } from './ReelsShelfPlaceholder';

const REEL_SHELF_INTERVAL = 4;

interface FeedProps {
  initialPosts: PostWithDetails[];
  initialHasMore: boolean;
  initialProducts: Product[];
  postTypes?: PostType[];
}

export function Feed({ initialPosts, initialHasMore, initialProducts, postTypes }: FeedProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [products, setProducts] = useState(initialProducts);
  const loadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

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
    <div className="grid grid-cols-1 gap-6 px-4 py-4 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
      {posts.map((post, index) => (
        <Fragment key={post.id}>
          <div className="flex flex-col gap-6 border-b border-border pb-6 last:border-0 md:border-0 md:pb-0">
            <PostCard
              post={post}
              products={post.productIds
                .map((id) => productsById.get(id))
                .filter((p): p is Product => Boolean(p))}
            />
          </div>
          {(index + 1) % REEL_SHELF_INTERVAL === 0 && (
            <div className="col-span-full">
              <ReelsShelfPlaceholder />
            </div>
          )}
        </Fragment>
      ))}
      {hasMore && <div ref={sentinelRef} aria-hidden className="col-span-full h-px" />}
    </div>
  );
}
