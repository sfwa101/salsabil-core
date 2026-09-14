// @vitest-environment jsdom
// src/components/PostCard.test.tsx
// اختبار وحدة (DOM حقيقي عبر jsdom + react-dom/client، بلا @testing-library) — regression test مباشر
// لإصلاح زر "أضف إلى السلة" الميت في قسم Hero Product Details (TASK-04، راجع
// docs/audits/2026-09-14-reef-v1-engineering-audit.md §5/§15). يموّه HorizontalShelf/ProductCard (رف
// "منتجات هذا المنشور" خارج نطاق هذه المهمة) وطبقة Server Actions الحقيقية للسلة (@/app/(reef)/cart/actions)
// — نفس نمط تمويه customer.service.test.ts (يموّه الطبقة الأدنى، يترك منطق المكوّن نفسه حقيقياً).
//
// لا @testing-library/react هنا عمداً — لا توجد بنية اختبار مكوّنات (component testing) قائمة أصلاً في
// هذا المستودع (vitest.config.ts: environment: 'node' افتراضياً)؛ jsdom أُضيف كتبعية تطوير جديدة
// (devDependency فقط، بلا أثر إنتاجي) مع تفعيله لهذا الملف وحده عبر توجيه Vitest أعلاه، بلا تعديل
// الإعداد المشترك — راجع Task Report لإعلان هذه التبعية صراحة (AGENTS.md §13).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

// بلا @testing-library/react هنا (راجع التعليق أعلى الملف) — هذا العلم هو ما تضبطه تلك المكتبة تلقائياً
// عادة؛ بدونه React يطبع تحذير "act(...) not configured" غير ضار لكنه ضجيج حقيقي في stderr.
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
import type { PostWithDetails } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import { CartTotalProvider } from './CartTotalProvider';

vi.mock('./HorizontalShelf', () => ({ HorizontalShelf: () => null }));
vi.mock('./ProductCard', () => ({ ProductCard: () => null }));
vi.mock('@/app/(reef)/cart/actions', () => ({
  addToCartAction: vi.fn(),
  updateCartItemAction: vi.fn(),
}));

const { PostCard } = await import('./PostCard');
const { addToCartAction } = await import('@/app/(reef)/cart/actions');

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
    caption: 'وصف تجريبي',
    isPublished: true,
    priority: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    media: [], // بلا صور — يتجنّب next/image غير الضروري لنطاق هذا الاختبار (قسم Hero فقط)
    productIds: ['product-1'],
    ...overrides,
  };
}

function findAddToCartButton(container: HTMLElement): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('أضف إلى السلة'));
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render(post: PostWithDetails, products: Product[]) {
  await act(async () => {
    root.render(
      <CartTotalProvider total={0}>
        <PostCard post={post} products={products} />
      </CartTotalProvider>
    );
  });
}

describe('PostCard — زر "أضف إلى السلة" في Hero Product Details (TASK-04 regression)', () => {
  it('اختبار حاسم: الضغط على الزر يستدعي addToCartAction الحقيقي بمعرّف المنتج وكمية 1 — لا Toast وهمي بلا أثر فعلي', async () => {
    const product = makeProduct();
    vi.mocked(addToCartAction).mockResolvedValue({
      summary: {
        cart: { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: new Date().toISOString() },
        lines: [
          {
            item: { id: 'item-1', cartId: 'cart-1', productId: product.id, quantity: 1, selection: {}, createdAt: new Date().toISOString() },
            product,
            unitPrice: product.basePrice,
            lineTotal: product.basePrice,
          },
        ],
        total: product.basePrice,
      },
    });

    await render(makePost(), [product]);

    const button = findAddToCartButton(container);
    expect(button).toBeTruthy();
    expect(addToCartAction).not.toHaveBeenCalled();

    await act(async () => {
      button!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(addToCartAction).toHaveBeenCalledTimes(1);
    expect(addToCartAction).toHaveBeenCalledWith({ productId: product.id, quantity: 1 });
  });

  it('منتج بخيار حجم (size) — لا يظهر زر إضافة سريعة إطلاقاً (نفس حماية ProductCard.tsx: إضافة بلا اختيار حجم تفشل في validateSelection)', async () => {
    const product = makeProduct({
      options: [{ id: 'size-1', type: 'size', label: 'كبير', priceModifier: 5 }],
    });

    await render(makePost(), [product]);

    expect(findAddToCartButton(container)).toBeUndefined();
  });

  it('منشور بلا منتج مرتبط — قسم Hero Product Details لا يُعرض إطلاقاً، لا زر معطَّل يفشل بصمت', async () => {
    await render(makePost({ productIds: [] }), []);

    expect(findAddToCartButton(container)).toBeUndefined();
    expect(addToCartAction).not.toHaveBeenCalled();
  });
});
