import { Suspense } from 'react';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import type { Category } from '@/core/modules/catalog/types';
import type { CartSummary } from '@/core/modules/cart/types';
import { StoryBar } from '@/components/StoryBar';
import { Feed } from '@/components/Feed';
import { DesktopCategorySidebar } from '@/components/storefront/DesktopCategorySidebar';
import { DesktopCartSidebar } from '@/components/storefront/DesktopCartSidebar';
import { CartLoadErrorPanel } from '@/components/storefront/CartLoadErrorPanel';
import { loadFeedPageAction } from './feed-actions';
import { getCartSummaryAction } from '@/app/(reef)/cart/actions';
import { FEED_TAB_KEYS, getPostTypesForTab, type FeedTabKey } from '@/config/content-type-registry';
import { MobileStorefront } from '@/components/storefront/MobileStorefront';

function parseFeedTab(tab: string | undefined): FeedTabKey {
  return FEED_TAB_KEYS.includes(tab as FeedTabKey) ? (tab as FeedTabKey) : 'all';
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const feedTab = parseFeedTab(tab);
  const postTypes = getPostTypesForTab(feedTab);

  let categories: Category[] = [];
  let firstPage: any = { posts: [], hasMore: false, products: [] };
  let cartSummary: CartSummary | null = null;
  let cartLoadFailed = false;

  // فشل جلب السلة يُعالَج بمعزل عن فشل الكتالوج/الخلاصة (Promise.allSettled لا try/catch مشترك) —
  // بدون هذا الفصل لا سبيل للتمييز بين "السلة فارغة فعلياً" و"فشل جلبها" (كلاهما كانا يسقطان معاً في
  // نفس catch واحد، فتُعرَض كأنها فارغة دائماً). راجع TASK-03.
  const [catalogFeedResult, cartResult] = await Promise.allSettled([
    Promise.all([catalogService.listCategories(), loadFeedPageAction({ postTypes, offset: 0 })]),
    getCartSummaryAction(),
  ]);

  if (catalogFeedResult.status === 'fulfilled') {
    categories = catalogFeedResult.value[0] || [];
    firstPage = catalogFeedResult.value[1] || { posts: [], hasMore: false, products: [] };
  } else {
    console.error('Failed to load storefront data:', catalogFeedResult.reason);
  }

  if (cartResult.status === 'fulfilled') {
    cartSummary = cartResult.value || null;
  } else {
    console.error('Failed to load cart summary:', cartResult.reason);
    cartLoadFailed = true;
  }

  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <div className="bg-background min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto max-w-[1340px] w-full lg:max-w-full lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden flex flex-col lg:flex-row justify-between lg:gap-4 p-0 lg:px-4 lg:py-0">
        
        {/* Right Sidebar (Desktop only) */}
        <div className="hidden lg:block w-64 shrink-0 h-full overflow-y-auto lg:py-4">
          <DesktopCategorySidebar categories={activeCategories} />
        </div>

        {/* Center Column (Feed - Desktop Only) */}
        <main className="hidden lg:flex flex-1 min-w-0 h-full overflow-y-auto px-2 py-4 flex-col gap-6">
          {/* Story Bar */}
          <div className="bg-card rounded-2xl shadow-[var(--sb-shadow-soft)] p-4 border border-border/50">
            <StoryBar categories={activeCategories || []} />
          </div>

          {/* Section Title */}
          <h2 className="text-xl font-bold text-foreground px-2">
            طازج اليوم
          </h2>

          <Feed
            initialPosts={firstPage?.posts || []}
            initialHasMore={firstPage?.hasMore || false}
            initialProducts={firstPage?.products || []}
            postTypes={postTypes}
          />
        </main>

        {/* Mobile View (Isolated) */}
        <div className="block lg:hidden w-full">
          <MobileStorefront
            feedTab={feedTab}
            categories={activeCategories || []}
            products={firstPage?.products || []}
            posts={firstPage?.posts || []}
            hasMorePosts={firstPage?.hasMore || false}
            cartLines={cartSummary?.lines || []}
          />
        </div>

        {/* Left Sidebar (Desktop only) */}
        <div className="hidden lg:block h-full">
          {cartLoadFailed ? (
            <CartLoadErrorPanel />
          ) : (
            <DesktopCartSidebar
              items={cartSummary?.lines?.map((line: any) => ({
                id: line.product.id,
                itemId: line.item.id,
                name: line.product.name,
                price: line.unitPrice,
                quantity: line.item.quantity,
                imageUrl: line.product.imageUrl || undefined
              })) || []}
              total={cartSummary?.total || 0}
            />
          )}
        </div>

      </div>
    </div>
  );
}
