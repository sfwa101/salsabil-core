// @vitest-environment jsdom
// src/components/storefront/MobileStorefront.test.tsx
// اختبار وحدة (DOM حقيقي عبر jsdom + react-dom/client) — regression test مباشر لإزالة فرع "reel"
// الذي كان يعرض <ReelsFeed /> ببيانات MOCK_REELS ثابتة (TASK-04، خيار (ب) — راجع Task Report للمعيار
// الكامل: post_media لا يملك عمود فيديو، فالربط ببيانات حقيقية (خيار أ) غير ممكن اليوم بلا Schema
// جديد). يموّه MobileHeroProductCard/MobileSmallProductCard/HorizontalShelf/StoryBar (خارج نطاق
// TASK-04) — الهدف الوحيد هنا إثبات: feedTab="reel" لا يعرض أي أثر لـReelsFeed/MOCK_REELS، ويسقط
// لنفس مسار الخلاصة العادية بدل صفحة فارغة.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Product } from '@/core/modules/catalog/types';
import type { CartLineSummary } from '@/core/modules/cart/types';
import type { PostWithDetails } from '@/core/modules/bayan/types';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/storefront/MobileHeroProductCard', () => ({
  MobileHeroProductCard: ({ product }: { product: Product }) => (
    <div data-testid="hero-card" data-product-id={product.id} />
  ),
}));
vi.mock('@/components/ui/HorizontalShelfStem', () => ({
  HorizontalShelfStem: ({ title, items }: { title: string; items: React.ReactNode[] }) => (
    <section data-testid="mobile-cycle-stem-shelf" data-title={title}>{items}</section>
  ),
}));
vi.mock('@/components/StemProductCardAdapter', () => ({
  StemProductCardAdapter: ({ product, cartLine }: { product: Product; cartLine?: CartLineSummary }) => (
    <div
      data-testid="mobile-cycle-adapter"
      data-product-id={product.id}
      data-cart-quantity={cartLine?.item.quantity ?? 0}
    />
  ),
}));
// HOMEPAGE-SHELL-VISUAL-PARITY-PASS (2026-09-22) — StoryBar/MobileSmallProductCard لم يعودا
// مستوردَين هنا (استُبدِلا بـCategoryBarNav/StemProductCardAdapter). CategoryBarNav يستدعي
// useRouter() حقيقياً (لا مزوّد App Router في هذا الاختبار jsdom) — يُموَّه بلا شرط، مطابقاً
// لمعاملة StoryBar القديمة تماماً. StemProductCardAdapter نفسه لا يُختبَر هنا (يقع داخل
// HorizontalShelf المُموَّه إلى null — أطفاله، ومنها، لا تُعرَض إطلاقاً، نفس ما كان يحدث مسبقاً).
vi.mock('@/app/(reef)/CategoryBarNav', () => ({ CategoryBarNav: () => null }));

const { MobileStorefront } = await import('./MobileStorefront');

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    categoryId: 'cat-1',
    tenantId: 'tenant-1',
    name: 'طماطم بلدي',
    basePrice: 18,
    unit: 'kg',
    options: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makePost(overrides: Partial<PostWithDetails> = {}): PostWithDetails {
  return {
    id: 'post-1',
    worldScope: 'world-1',
    categoryId: 'cat-1',
    postType: 'post',
    isPublished: true,
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    media: [],
    productIds: ['product-1'],
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(feedTab: string, product: Product, post: PostWithDetails) {
  await act(async () => {
    root.render(
      <MobileStorefront
        feedTab={feedTab}
        districts={[]}
        categories={[]}
        products={[product]}
        posts={[post]}
        cartLines={[]}
        hasMorePosts={false}
        realCatalogProducts={[]}
      />
    );
  });
}

async function renderCycleShelf(products: Product[], posts: PostWithDetails[], cartLines: CartLineSummary[] = []) {
  await act(async () => {
    root.render(
      <MobileStorefront
        feedTab="all"
        districts={[]}
        categories={[]}
        products={products}
        posts={posts}
        cartLines={cartLines}
        hasMorePosts={false}
        realCatalogProducts={[]}
      />
    );
  });
}

describe('MobileStorefront — إزالة فرع/بيانات Reels الوهمية (TASK-04 regression)', () => {
  it('اختبار حاسم: feedTab="reel" لا يعرض أي عنصر <video> ولا أي أثر لأسماء تجار MOCK_REELS الوهمية', async () => {
    const product = makeProduct();
    const post = makePost({ productIds: [product.id] });

    await render('reel', product, post);

    expect(container.querySelector('video')).toBeNull();
    expect(container.textContent ?? '').not.toMatch(/مزرعة الخير|مزارع الدواجن/);
  });

  it('feedTab="reel" يسقط فعلياً لنفس مسار الخلاصة العادية (بطاقة المنتج الحقيقية تُعرَض) — لا صفحة فارغة بدل البيانات الوهمية', async () => {
    const product = makeProduct();
    const post = makePost({ productIds: [product.id] });

    await render('reel', product, post);

    const heroCard = container.querySelector('[data-testid="hero-card"]');
    expect(heroCard).not.toBeNull();
    expect(heroCard?.getAttribute('data-product-id')).toBe(product.id);
  });

  it('قيمة feedTab عادية ("all") تنتج نفس نتيجة "reel" بالضبط لنفس البيانات — يؤكد أن "reel" لم يعد فرعاً خاصاً إطلاقاً', async () => {
    const product = makeProduct();
    const post = makePost({ productIds: [product.id] });

    await render('all', product, post);
    const allHtml = container.innerHTML;

    await render('reel', product, post);
    const reelHtml = container.innerHTML;

    expect(reelHtml).toBe(allHtml);
  });
});

describe('BATCH A — Mobile cycle shelf', () => {
  it('keeps cycle interleaving while rendering cycle 2 with HorizontalShelfStem', async () => {
    const product = makeProduct();
    const posts = [0, 1, 2].map((index) => makePost({ id: `post-${index}`, productIds: [product.id] }));

    await renderCycleShelf([product], posts);

    expect(container.querySelectorAll('[data-testid="hero-card"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-testid="mobile-cycle-stem-shelf"]')).toHaveLength(1);
  });

  it('preserves cycle product order, adapter cartLine wiring, and responsive wrappers', async () => {
    const first = makeProduct({ id: 'product-1' });
    const second = makeProduct({ id: 'product-2' });
    const posts = [
      makePost({ id: 'post-0', productIds: [first.id] }),
      makePost({ id: 'post-1', productIds: [first.id] }),
      makePost({ id: 'post-2', productIds: [second.id, first.id] }),
    ];
    const cartLine: CartLineSummary = {
      item: {
        id: 'item-1', cartId: 'cart-1', productId: second.id, quantity: 4, selection: {}, createdAt: first.createdAt,
      },
      product: second,
      unitPrice: second.basePrice,
      lineTotal: second.basePrice * 4,
    };

    await renderCycleShelf([first, second], posts, [cartLine]);

    const shelf = container.querySelector('[data-testid="mobile-cycle-stem-shelf"]')!;
    const adapters = Array.from(shelf.querySelectorAll('[data-testid="mobile-cycle-adapter"]'));
    expect(adapters.map((node) => node.getAttribute('data-product-id'))).toEqual(['product-2', 'product-1']);
    expect(adapters[0].getAttribute('data-cart-quantity')).toBe('4');
    expect(adapters[0].parentElement?.className).toContain('w-[145px]');
    expect(adapters[0].parentElement?.className).toContain('shrink-0');
  });

  it('does not drop the sixth real post when no Reels data exists', async () => {
    const product = makeProduct();
    const posts = Array.from({ length: 6 }, (_, index) =>
      makePost({ id: `post-${index}`, productIds: [product.id] })
    );

    await renderCycleShelf([product], posts);

    expect(container.querySelectorAll('[data-testid="hero-card"]')).toHaveLength(5);
    expect(container.querySelectorAll('[data-testid="mobile-cycle-stem-shelf"]')).toHaveLength(1);
  });
});
