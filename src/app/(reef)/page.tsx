import { Suspense } from 'react';
import { z } from 'zod';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import type { Category, District, Product } from '@/core/modules/catalog/types';
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
import { RealCatalogShelfSDUI } from './RealCatalogShelfSDUI';
import { QueryRegistry } from '@/sdui/data/QueryRegistry';
import { DataResolver } from '@/sdui/data/DataResolver';
import { RealCatalogDataSource } from '@/app/(reef)/data/RealCatalogDataSource';
import { ReelsDataSource, type RealReelSnapshot } from '@/app/(reef)/data/ReelsDataSource';
import type { SDUIPage } from '@/sdui/schema/page.schema';

// MIGRATE-HOME-REAL-SHELF-TO-SDUI (2026-09-21) — نفس الحد الأقصى الذي كانت تستخدمه
// loadRealCatalogShelfAction المحذوفة (feed-actions.ts) — سلوك الرف بلا تغيير، فقط مصدر القراءة.
const REAL_CATALOG_SHELF_LIMIT = 12;
const realCatalogShelfPageSchema: SDUIPage = {
  id: 'home_real_catalog_shelf_query',
  sections: [
    {
      id: 'section_real_catalog_shelf',
      type: 'product_shelf',
      props: { title: 'منتجات ريف', items: { $bind: 'query.real_products', params: { limit: REAL_CATALOG_SHELF_LIMIT } } },
      visibility: { enabled: true },
    },
  ],
};

async function resolveRealCatalogShelf(): Promise<Product[]> {
  const registry = new QueryRegistry();
  registry.register({
    id: 'query.real_products',
    paramSchema: z.object({ limit: z.number().optional() }),
    resultSchema: z.array(z.unknown()),
  });
  const resolver = new DataResolver(registry);
  resolver.registerSource(new RealCatalogDataSource());
  const resolved = await resolver.resolvePage(realCatalogShelfPageSchema);
  return (resolved.sections[0]?.props.items as Product[] | null) ?? [];
}

// DD-024 — نفس نمط resolveRealCatalogShelf حرفياً، مصدر بيانات مستقل (post_type='reel' فقط) لا علاقة
// له بخلاصة بيان الرئيسية (loadFeedPageAction) — ReelsDataSource يجلب categories بنفسه (راجع تعليقه)
// فيبقى هذا الاستدعاء مستقلاً بالكامل، قابلاً للتشغيل بالتوازي مع بقية Promise.all أدناه.
const REELS_SHELF_LIMIT = 10;
const reelsShelfPageSchema: SDUIPage = {
  id: 'home_reels_shelf_query',
  sections: [
    {
      id: 'section_reels_shelf_query',
      type: 'reels_shelf',
      props: { items: { $bind: 'query.reels_feed', params: { limit: REELS_SHELF_LIMIT } } },
      visibility: { enabled: true },
    },
  ],
};

async function resolveReelsFeed(): Promise<RealReelSnapshot[]> {
  const registry = new QueryRegistry();
  registry.register({
    id: 'query.reels_feed',
    paramSchema: z.object({ limit: z.number().optional() }),
    resultSchema: z.array(z.unknown()),
  });
  const resolver = new DataResolver(registry);
  resolver.registerSource(new ReelsDataSource());
  const resolved = await resolver.resolvePage(reelsShelfPageSchema);
  return (resolved.sections[0]?.props.items as RealReelSnapshot[] | null) ?? [];
}

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
  let reels: RealReelSnapshot[] = [];
  let cartSummary: CartSummary | null = null;
  let cartLoadFailed = false;

  // فشل جلب السلة يُعالَج بمعزل عن فشل الكتالوج/الخلاصة (Promise.allSettled لا try/catch مشترك) —
  // بدون هذا الفصل لا سبيل للتمييز بين "السلة فارغة فعلياً" و"فشل جلبها" (كلاهما كانا يسقطان معاً في
  // نفس catch واحد، فتُعرَض كأنها فارغة دائماً). راجع TASK-03.
  //
  // §31 بند 3، مُهاجَر لخط أنابيب SDUI في MIGRATE-HOME-REAL-SHELF-TO-SDUI (2026-09-21) —
  // resolveRealCatalogShelf (RealCatalogDataSource → DataResolver) محل loadRealCatalogShelfAction
  // المحذوفة: رف "منتجات ريف" يعرض الكتالوج القابل للشراء مباشرة، لا يعتمد على وجود منشور مُخصَّص
  // للمنتج. لا تغيير في المصدر الفعلي (catalogService.listPurchasableProducts نفسه)، فقط مسار القراءة.
  const [catalogFeedResult, cartResult] = await Promise.allSettled([
    Promise.all([
      catalogService.getDistricts(),
      catalogService.listCategories(),
      loadFeedPageAction({ postTypes, offset: 0 }),
      resolveRealCatalogShelf(),
      // DD-024 — مستقل تماماً عن باقي هذه القائمة (لا يشارك districts/categories/firstPage)، يُشغَّل
      // بالتوازي فقط لأنه ضمن نفس Promise.all، لا لأنه يعتمد على أي منها.
      resolveReelsFeed(),
    ]),
    getCartSummaryAction(),
  ]);

  if (catalogFeedResult.status === 'fulfilled') {
    districts = catalogFeedResult.value[0] || [];
    categories = catalogFeedResult.value[1] || [];
    firstPage = catalogFeedResult.value[2] || { posts: [], hasMore: false, products: [] };
    realCatalogProducts = catalogFeedResult.value[3] || [];
    reels = catalogFeedResult.value[4] || [];
  } else {
    console.error('Failed to load storefront data:', catalogFeedResult.reason);
  }

  if (cartResult.status === 'fulfilled') {
    cartSummary = cartResult.value || null;
  } else {
    console.error('Failed to load cart summary:', cartResult.reason);
    cartLoadFailed = true;
  }

  // MIGRATE-HOME-REAL-SHELF-TO-SDUI + VERTICAL-SLICE-2-MOBILE-HOME-SHELF-INTEGRATION (2026-09-22) —
  // منتجات بخيار حجم (options من نوع 'size') مُستبعَدة من كل استهلاك لـRealCatalogShelfSDUI (سطح
  // المكتب والمتنقل معاً منذ هذه الشريحة): قدرة ADD_TO_CART المسجَّلة داخله لا تدعم اختيار حجم
  // (sizeId)، وإضافتها المباشرة كانت ستفشل عند CatalogService.validateSelection — نفس الحماية القائمة
  // أصلاً في ProductCard.tsx (hasSizeOptions). هذا الاسم (desktopShelfProducts) يُمرَّر الآن لكلا
  // الفرعين (سطح المكتب + المتنقل عبر MobileStorefront أدناه) — لم يعد حصرياً لسطح المكتب رغم اسمه.
  const desktopShelfProducts = realCatalogProducts.filter((p) => !p.options.some((o) => o.type === 'size'));
  const initialQuantities: Record<string, number> = {};
  for (const line of cartSummary?.lines ?? []) {
    initialQuantities[line.product.id] = line.item.quantity;
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

          {/* §31 بند 3، عبر SDUI منذ MIGRATE-HOME-REAL-SHELF-TO-SDUI — رف مستقل عن مسار بيان/المنشورات،
              يعرض الكتالوج القابل للشراء مباشرة عبر RealCatalogDataSource → DataResolver → PageEngine */}
          {desktopShelfProducts.length > 0 && (
            <RealCatalogShelfSDUI
              title="منتجات ريف"
              products={desktopShelfProducts}
              initialQuantities={initialQuantities}
            />
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
            // VERTICAL-SLICE-2-MOBILE-HOME-SHELF-INTEGRATION (2026-09-22) — desktopShelfProducts
            // (مُفلترة، بلا خيارات حجم) لا realCatalogProducts الخام — راجع التعليق أعلاه عند تعريفها.
            realCatalogProducts={desktopShelfProducts}
            initialQuantities={initialQuantities}
            reels={reels}
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
