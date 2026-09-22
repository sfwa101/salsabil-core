// @vitest-environment jsdom
// src/components/storefront/DesktopCartSidebar.test.tsx
// TASK-02 (REEF_V1_MASTER_EXECUTION_PLAN.md Phase 1 #2، docs/audits/2026-09-14-reef-v1-engineering-
// audit.md §5/§19#3) — يثبت أن DesktopCartSidebar يستهلك الآن useOptimisticCartLine.ts الحقيقي (لا
// منطقه الخاص القديم بلا تراجع): فشل updateCartItemAction يُعيد رقم الكمية المعروض على الشاشة
// للقيمة السابقة فعلياً. نفس نمط تمويه CartCapsule.test.tsx/PostCard.test.tsx.
//
// FULL-VISUAL-IMPORT-REMAINING-SURFACES (2026-09-22) — المكوّن الآن يُعيد استخدام CartLineItem.tsx
// الحقيقي (بدل DesktopCartLineRow المحلي القديم) عبر prop واحد `lines: CartLineSummary[]` بدل
// `items`/`total` المُبسَّطَين سابقاً — نفس الاختبار السلوكي حرفياً (فشل التحديث يتراجع)، بشكل
// البيانات الحقيقي فقط.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/app/(reef)/cart/actions', () => ({
  addToCartAction: vi.fn(),
  updateCartItemAction: vi.fn(),
  removeCartItemAction: vi.fn(),
}));

const { DesktopCartSidebar } = await import('./DesktopCartSidebar');
const { updateCartItemAction } = await import('@/app/(reef)/cart/actions');
const { CartTotalProvider } = await import('@/components/CartTotalProvider');

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

const lines = [
  {
    item: { id: 'item-1', cartId: 'cart-1', productId: 'product-1', quantity: 2, selection: {}, createdAt: new Date().toISOString() },
    product: {
      id: 'product-1',
      categoryId: 'cat-1',
      tenantId: 'tenant-1',
      name: 'طماطم بلدي',
      basePrice: 10,
      unit: 'kg',
      options: [],
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    unitPrice: 10,
    lineTotal: 20,
  },
];

async function render() {
  await act(async () => {
    root.render(
      <CartTotalProvider total={20}>
        <DesktopCartSidebar lines={lines} />
      </CartTotalProvider>
    );
  });
}

function findByLabel(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === label);
}

describe('DesktopCartSidebar — توحيد منطق Cart Optimistic Update (TASK-02)', () => {
  it('اختبار حاسم: فشل updateCartItemAction يُعيد الكمية المعروضة للقيمة السابقة (تراجع بصري حقيقي)', async () => {
    vi.mocked(updateCartItemAction).mockResolvedValue({ error: 'الكمية المطلوبة غير متوفرة في المخزون' });

    await render();

    const quantitySpanBefore = container.querySelector('span.tabular-nums');
    expect(quantitySpanBefore?.textContent).toBe('2');

    const incrementButton = findByLabel(container, 'زيادة');
    expect(incrementButton).toBeTruthy();

    await act(async () => {
      incrementButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(updateCartItemAction).toHaveBeenCalledWith('item-1', 3);
    expect(container.querySelector('span.tabular-nums')?.textContent).toBe('2');
  });

  it('نجاح updateCartItemAction: الكمية المعروضة تبقى عند القيمة الجديدة (لا تراجع بلا داعٍ)', async () => {
    vi.mocked(updateCartItemAction).mockResolvedValue({
      summary: {
        cart: { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: new Date().toISOString() },
        lines: [],
        total: 30,
      },
    });

    await render();

    const incrementButton = findByLabel(container, 'زيادة');
    await act(async () => {
      incrementButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(container.querySelector('span.tabular-nums')?.textContent).toBe('3');
  });
});
