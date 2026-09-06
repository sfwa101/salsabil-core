import { Suspense } from 'react';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { FeedTopBar } from '@/components/FeedTopBar';
import { StoryBar } from '@/components/StoryBar';
import { FeedTabBar } from '@/components/FeedTabBar';
import { ScrollHideBar } from '@/components/ScrollHideBar';
import { Feed } from '@/components/Feed';
import { loadFeedPageAction } from './feed-actions';
import { POST_TYPES, type PostType } from '@/core/modules/bayan/types';

function parsePostType(tab: string | undefined): PostType | undefined {
  return POST_TYPES.includes(tab as PostType) ? (tab as PostType) : undefined;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const postType = parsePostType(tab);

  const [categories, firstPage] = await Promise.all([
    catalogService.listCategories(),
    loadFeedPageAction({ postType, offset: 0 }),
  ]);
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <>
      {/* اليوم 28 (BAYAN-HOME-FEED-001) — الثلاثة معاً (بحث+قصص+تبويبات) يختفون/يظهرون كوحدة واحدة
          بالتمرير (ScrollHideBar). Header.tsx (layout.tsx المشترك) يبقى خارج هذا الغلاف عمداً — راجع
          تعليق ScrollHideBar.tsx نفسه للسبب. */}
      <ScrollHideBar>
        <FeedTopBar />
        <div className="border-b border-border bg-card px-4 py-3">
          <div className="mx-auto max-w-2xl md:max-w-4xl xl:max-w-6xl">
            <StoryBar categories={activeCategories} />
          </div>
        </div>
        <Suspense fallback={null}>
          <FeedTabBar />
        </Suspense>
      </ScrollHideBar>

      {/* اليوم 27 (BAYAN-HOME-FEED-001) — الخلاصة الفعلية تستبدل قائمة الأقسام (CategoryCard) التي
          كانت هنا سابقاً؛ تصفّح الأحياء أصبح عبر StoryBar أعلاه. اليوم 31: مقياس العرض الموحَّد
          (max-w-2xl/md:max-w-4xl/xl:max-w-6xl) — يطابق Header/FeedTopBar/FeedTabBar تماماً حتى لا
          يبدو أي منها أضيق/أوسع من الآخر عند md/xl. */}
      <main className="mx-auto max-w-2xl md:max-w-4xl xl:max-w-6xl">
        <Feed
          initialPosts={firstPage.posts}
          initialHasMore={firstPage.hasMore}
          initialProducts={firstPage.products}
          postType={postType}
        />
      </main>
    </>
  );
}
