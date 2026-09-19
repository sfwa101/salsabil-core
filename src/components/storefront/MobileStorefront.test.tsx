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
vi.mock('@/components/storefront/MobileSmallProductCard', () => ({ MobileSmallProductCard: () => null }));
vi.mock('@/components/HorizontalShelf', () => ({ HorizontalShelf: () => null }));
vi.mock('@/components/StoryBar', () => ({ StoryBar: () => null }));

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
