// @vitest-environment jsdom
// src/app/(reef)/page.test.tsx
// TASK-03 (REEF_V1_MASTER_EXECUTION_PLAN.md Phase 1 #3، docs/audits/2026-09-14-reef-v1-engineering-
// audit.md §5/§19#3) — يثبت أن HomePage يميّز الآن "السلة فارغة فعلياً" (getCartSummaryAction ينجح
// بنتيجة lines: []) عن "فشل جلب ملخص السلة" (getCartSummaryAction يطرح استثناءً) بدل عرض نفس حالة
// الفراغ خطأً في الحالتين. يموّه StoryBar/Feed/DesktopCategorySidebar/MobileStorefront (خارج نطاق
// TASK-03) وDesktopCartSidebar/CartLoadErrorPanel (بشواهد بسيطة) — الهدف الوحيد هنا فرع الاختيار في
// page.tsx نفسه، لا منطق أي من تلك المكوّنات.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { CartSummary } from '@/core/modules/cart/types';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/components/StoryBar', () => ({ StoryBar: () => null }));
vi.mock('@/components/Feed', () => ({ Feed: () => null }));
vi.mock('@/components/storefront/DesktopCategorySidebar', () => ({ DesktopCategorySidebar: () => null }));
vi.mock('@/components/storefront/MobileStorefront', () => ({ MobileStorefront: () => null }));
vi.mock('@/components/storefront/DesktopCartSidebar', () => ({
  DesktopCartSidebar: ({ items }: { items: unknown[] }) => (
    <div data-testid="desktop-cart-sidebar" data-item-count={items.length} />
  ),
}));
vi.mock('@/components/storefront/CartLoadErrorPanel', () => ({
  CartLoadErrorPanel: () => <div data-testid="cart-load-error-panel">تعذّر تحميل السلة</div>,
}));
vi.mock('@/core/modules/catalog/catalog.service', () => ({
  catalogService: { listCategories: vi.fn().mockResolvedValue([]) },
}));
vi.mock('./feed-actions', () => ({
  loadFeedPageAction: vi.fn().mockResolvedValue({ posts: [], hasMore: false, products: [] }),
}));
vi.mock('@/app/(reef)/cart/actions', () => ({
  getCartSummaryAction: vi.fn(),
}));

const HomePage = (await import('./page')).default;
const { getCartSummaryAction } = await import('@/app/(reef)/cart/actions');

function makeCartSummary(overrides: Partial<CartSummary> = {}): CartSummary {
  return {
    cart: { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: new Date().toISOString() },
    lines: [],
    total: 0,
    ...overrides,
  };
}

let container: HTMLDivElement;
let root: Root;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  consoleErrorSpy.mockRestore();
});

async function renderHomePage() {
  const element = await HomePage({ searchParams: Promise.resolve({}) });
  await act(async () => {
    root.render(element);
  });
}

describe('HomePage — تمييز "السلة فارغة فعلياً" عن "فشل جلب السلة" (TASK-03)', () => {
  it('نجاح الجلب بنتيجة فارغة فعلياً → DesktopCartSidebar (items: []) لا CartLoadErrorPanel', async () => {
    vi.mocked(getCartSummaryAction).mockResolvedValue(makeCartSummary({ lines: [] }));

    await renderHomePage();

    const sidebar = container.querySelector('[data-testid="desktop-cart-sidebar"]');
    expect(sidebar).not.toBeNull();
    expect(sidebar?.getAttribute('data-item-count')).toBe('0');
    expect(container.querySelector('[data-testid="cart-load-error-panel"]')).toBeNull();
  });

  it('اختبار حاسم: فشل جلب ملخص السلة (استثناء) → CartLoadErrorPanel، وليس DesktopCartSidebar الفارغ', async () => {
    vi.mocked(getCartSummaryAction).mockRejectedValue(new Error('network down'));

    await renderHomePage();

    expect(container.querySelector('[data-testid="cart-load-error-panel"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="desktop-cart-sidebar"]')).toBeNull();
  });
});
