// @vitest-environment jsdom
// src/components/CartCapsule.test.tsx
// TASK-02 (REEF_V1_MASTER_EXECUTION_PLAN.md Phase 1 #2، docs/audits/2026-09-14-reef-v1-engineering-
// audit.md §5/§19#3) — يثبت أن CartCapsule يستهلك الآن useOptimisticCartLine.ts الحقيقي (لا منطقه
// الخاص القديم بلا تراجع): فشل updateCartItemAction يُعيد رقم الكمية المعروض على الشاشة للقيمة
// السابقة فعلياً (state حقيقي في الـDOM يعود، لا افتراض). نفس نمط تمويه PostCard.test.tsx (يموّه طبقة
// Server Actions فقط، يترك منطق المكوّنات نفسه حقيقياً).
//
// BottomSheet.tsx يُصيَّر عبر createPortal إلى document.body — القسم الديسكتوب (BottomSheet) يخرج من
// `container` تماماً، فالاستعلام عبر `container.querySelectorAll` يلتقط قسم الموبايل فقط تلقائياً
// (lg:hidden، غير مُصيَّر عبر portal) بلا حاجة لأي selector إضافي للتفريق بين النسختين.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

import type { CartSummary } from '@/core/modules/cart/types';
import type { Product } from '@/core/modules/catalog/types';
import { CartTotalProvider } from './CartTotalProvider';

vi.mock('@/app/(reef)/cart/actions', () => ({
  getCartSummaryAction: vi.fn(),
  addToCartAction: vi.fn(),
  updateCartItemAction: vi.fn(),
}));

const { CartCapsule } = await import('./CartCapsule');
const { getCartSummaryAction, updateCartItemAction } = await import('@/app/(reef)/cart/actions');

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'product-1',
    categoryId: 'cat-1',
    tenantId: 'tenant-1',
    name: 'طماطم بلدي',
    basePrice: 10,
    unit: 'kg',
    options: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeSummary(quantity: number): CartSummary {
  const product = makeProduct();
  return {
    cart: { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: new Date().toISOString() },
    lines: [
      {
        item: { id: 'item-1', cartId: 'cart-1', productId: product.id, quantity, selection: {}, createdAt: new Date().toISOString() },
        product,
        unitPrice: product.basePrice,
        lineTotal: product.basePrice * quantity,
      },
    ],
    total: product.basePrice * quantity,
  };
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
  document.body.innerHTML = '';
});

async function render() {
  await act(async () => {
    root.render(
      <CartTotalProvider total={0}>
        <CartCapsule />
      </CartTotalProvider>
    );
  });
}

function findByLabel(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === label);
}

describe('CartCapsule — توحيد منطق Cart Optimistic Update (TASK-02)', () => {
  it('اختبار حاسم: فشل updateCartItemAction يُعيد الكمية المعروضة للقيمة السابقة (تراجع بصري حقيقي)', async () => {
    vi.mocked(getCartSummaryAction).mockResolvedValue(makeSummary(2));
    vi.mocked(updateCartItemAction).mockResolvedValue({ error: 'الكمية المطلوبة غير متوفرة في المخزون' });

    await render();

    const openButton = findByLabel(container, 'السلة');
    expect(openButton).toBeTruthy();
    await act(async () => {
      openButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    // انتظار اكتمال getCartSummaryAction (promise microtask)
    await act(async () => {});

    const incrementButton = findByLabel(container, 'زيادة');
    expect(incrementButton).toBeTruthy();

    const quantitySpanBefore = container.querySelector('span.tabular-nums');
    expect(quantitySpanBefore?.textContent).toBe('2');

    await act(async () => {
      incrementButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(updateCartItemAction).toHaveBeenCalledWith('item-1', 3);
    expect(container.querySelector('span.tabular-nums')?.textContent).toBe('2');
  });

  it('نجاح updateCartItemAction: الكمية المعروضة تبقى عند القيمة الجديدة (لا تراجع بلا داعٍ)', async () => {
    vi.mocked(getCartSummaryAction).mockResolvedValue(makeSummary(1));
    vi.mocked(updateCartItemAction).mockResolvedValue({ summary: makeSummary(2) });

    await render();

    const openButton = findByLabel(container, 'السلة');
    await act(async () => {
      openButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await act(async () => {});

    const incrementButton = findByLabel(container, 'زيادة');
    await act(async () => {
      incrementButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(container.querySelector('span.tabular-nums')?.textContent).toBe('2');
  });
});
