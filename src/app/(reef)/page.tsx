import { Suspense } from 'react';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import type { Category, District, Product } from '@/core/modules/catalog/types';
import type { CartSummary } from '@/core/modules/cart/types';
import { StoryBar } from '@/components/StoryBar';
import { Feed } from '@/components/Feed';
import { HorizontalShelf } from '@/components/HorizontalShelf';
import { ProductCard } from '@/components/ProductCard';
import { DesktopCategorySidebar } from '@/components/storefront/DesktopCategorySidebar';
import { DesktopCartSidebar } from '@/components/storefront/DesktopCartSidebar';
import { CartLoadErrorPanel } from '@/components/storefront/CartLoadErrorPanel';
import { loadFeedPageAction, loadRealCatalogShelfAction } from './feed-actions';
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

  // TASK-18: مصدران منفصلان عمداً — districts (كتالوج catalog_districts الحقيقي، تصفح الأحياء عبر
  // StoryBar/DesktopCategorySidebar) وcategories (جدول categories القديم، يبقى فقط لتصنيف المنشورات
  // نفسها داخل MobileStorefront — راجع تعليق الملف هناك).
  let districts: District[] = [];
  let categories: Category[] = [];
  let firstPage: any = { posts: [], hasMore: false, products: [] };
  let realCatalogProducts: Product[] = [];
  let cartSummary: CartSummary | null = null;
  let cartLoadFailed = false;

  // فشل جلب السلة يُعالَج بمعزل عن فشل الكتالوج/الخلاصة (Promise.allSettled لا try/catch مشترك) —
  // بدون هذا الفصل لا سبيل للتمييز بين "السلة فارغة فعلياً" و"فشل جلبها" (كلاهما كانا يسقطان معاً في
  // نفس catch واحد، فتُعرَض كأنها فارغة دائماً). راجع TASK-03.
  //
  // §31 بند 3 — loadRealCatalogShelfAction مضافة هنا (بمعزل عن loadFeedPageAction/بيان تماماً):
  // رف "منتجات ريف" يعرض الكتالوج القابل للشراء مباشرة، لا يعتمد على وجود منشور مُخصَّص للمنتج.
  const [catalogFeedResult, cartResult] = await Promise.allSettled([
    Promise.all([
      catalogService.getDistricts(),
      catalogService.listCategories(),
      loadFeedPageAction({ postTypes, offset: 0 }),
      loadRealCatalogShelfAction(),
    ]),
    getCartSummaryAction(),
  ]);

  if (catalogFeedResult.status === 'fulfilled') {
    districts = catalogFeedResult.value[0] || [];
    categories = catalogFeedResult.value[1] || [];
    firstPage = catalogFeedResult.value[2] || { posts: [], hasMore: false, products: [] };
    realCatalogProducts = catalogFeedResult.value[3] || [];
  } else {
    console.error('Failed to load storefront data:', catalogFeedResult.reason);
  }

  if (cartResult.status === 'fulfilled') {
    cartSummary = cartResult.value || null;
  } else {
    console.error('Failed to load cart summary:', cartResult.reason);
    cartLoadFailed = true;
  }

  return (
    <div className="bg-background min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="mx-auto max-w-[1340px] w-full lg:max-w-full lg:h-[calc(100vh-3.5rem)] lg:overflow-hidden flex flex-col lg:flex-row justify-between lg:gap-4 p-0 lg:px-4 lg:py-0">
        
        {/* Right Sidebar (Desktop only) */}
        <div className="hidden lg:block w-64 shrink-0 h-full overflow-y-auto lg:py-4">
          <DesktopCategorySidebar districts={districts} />
        </div>

        {/* Center Column (Feed - Desktop Only) */}
        <main className="hidden lg:flex flex-1 min-w-0 h-full overflow-y-auto px-2 py-4 flex-col gap-6">
          {/* Story Bar */}
          <div className="bg-card rounded-2xl shadow-[var(--sb-shadow-soft)] p-4 border border-border/50">
            <StoryBar districts={districts} />
          </div>

          {/* §31 بند 3 — رف مستقل عن مسار بيان/المنشورات، يعرض الكتالوج القابل للشراء مباشرة */}
          {realCatalogProducts.length > 0 && (
            <HorizontalShelf title="منتجات ريف">
              {realCatalogProducts.map((p) => (
                <div key={p.id} className="w-40 shrink-0">
                  <ProductCard product={p} />
                </div>
              ))}
            </HorizontalShelf>
          )}

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
            districts={districts}
            categories={categories}
            products={firstPage?.products || []}
            posts={firstPage?.posts || []}
            hasMorePosts={firstPage?.hasMore || false}
            cartLines={cartSummary?.lines || []}
            realCatalogProducts={realCatalogProducts}
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
