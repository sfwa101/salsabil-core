import { Suspense } from 'react';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { StoryBar } from '@/components/StoryBar';
import { FeedTabBar } from '@/components/FeedTabBar';
import { ScrollHideBar } from '@/components/ScrollHideBar';
import { Feed } from '@/components/Feed';
import { loadFeedPageAction } from './feed-actions';
import { FEED_TAB_KEYS, getPostTypesForTab, type FeedTabKey } from '@/config/content-type-registry';

function parseFeedTab(tab: string | undefined): FeedTabKey {
  return FEED_TAB_KEYS.includes(tab as FeedTabKey) ? (tab as FeedTabKey) : 'all';
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const feedTab = parseFeedTab(tab);
  const postTypes = getPostTypesForTab(feedTab);

  const [categories, firstPage] = await Promise.all([
    catalogService.listCategories(),
    loadFeedPageAction({ postTypes, offset: 0 }),
  ]);
  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <>
      {/* FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 1ج): StoryBar لم يعد داخل أي ScrollHideBar — تدفق
          محتوى عادي (Scrollable)، يختفي مع التمرير للأسفل مثل أي محتوى، ويحتاج المستخدم للتمرير
          لأعلى ليصل إليه مجدداً (قرار مؤسس صريح، لا يشارك حركة الهيدر/التبويبات). */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="mx-auto max-w-2xl md:max-w-4xl xl:max-w-6xl">
          <StoryBar categories={activeCategories} />
        </div>
      </div>

      {/* FeedTabBar وحده: mode="reposition" — لا يختفي أبداً، يلتصق top:0 حين يكون Header مخفياً
          بالتمرير للأسفل، ويرتد أسفل Header (--header-height المنشورة من Header.tsx) حين يظهر
          بالتمرير للأعلى. راجع تعليق ScrollHideBar.tsx للتفصيل الكامل. */}
      <ScrollHideBar mode="reposition" topOffset="var(--header-height, 0px)">
        <Suspense fallback={null}>
          <FeedTabBar />
        </Suspense>
      </ScrollHideBar>

      {/* اليوم 27 (BAYAN-HOME-FEED-001) — الخلاصة الفعلية تستبدل قائمة الأقسام (CategoryCard) التي
          كانت هنا سابقاً؛ تصفّح الأحياء أصبح عبر StoryBar أعلاه. اليوم 31: مقياس العرض الموحَّد
          (max-w-2xl/md:max-w-4xl/xl:max-w-6xl) — يطابق Header/FeedTabBar تماماً حتى لا يبدو أي منها
          أضيق/أوسع من الآخر عند md/xl. */}
      <main className="mx-auto max-w-2xl md:max-w-4xl xl:max-w-6xl">
        <Feed
          initialPosts={firstPage.posts}
          initialHasMore={firstPage.hasMore}
          initialProducts={firstPage.products}
          postTypes={postTypes}
        />
      </main>
    </>
  );
}
