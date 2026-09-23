// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartSummary } from '@/core/modules/cart/types';
import type { Product } from '@/core/modules/catalog/types';
import type { ProductCardStemProps } from '@/types/ui-contracts';
import { CartTotalProvider } from '@/components/CartTotalProvider';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  getCartSummary: vi.fn(),
  getMerchants: vi.fn(),
  getProductsByIds: vi.fn(),
  getRecommendations: vi.fn(),
  push: vi.fn(),
  update: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('./actions', () => ({
  addToCartAction: mocks.add,
  getCartSummaryAction: mocks.getCartSummary,
  updateCartItemAction: mocks.update,
}));
vi.mock('@/core/modules/merchant/merchant.service', () => ({
  merchantService: { getByIds: mocks.getMerchants },
}));
vi.mock('@/core/modules/orders/orders.service', () => ({
  ordersService: { getMostOrderedProductIds: mocks.getRecommendations },
}));
vi.mock('@/core/modules/catalog/catalog.service', () => ({
  catalogService: { getProductsByIds: mocks.getProductsByIds },
}));
vi.mock('./CartStemView', () => ({ CartStemView: () => <div data-testid="cart-stem-view" /> }));
vi.mock('@/components/ui/HorizontalShelfStem', () => ({
  HorizontalShelfStem: ({ title, items }: { title: string; items: React.ReactNode[] }) => (
    <section data-testid="cart-cross-sell-stem" data-title={title}>{items}</section>
  ),
}));
vi.mock('@/components/ui/StemProductCard', () => ({
  StemProductCard: (props: ProductCardStemProps) => (
    <button
      data-testid="cart-cross-sell-product"
      data-product-id={props.id}
      data-requires-configuration={String(props.requiresConfiguration)}
      onClick={() => props.onAction?.(
        props.requiresConfiguration
          ? { type: 'OPEN_CONFIGURATION', payload: { id: props.id } }
          : { type: 'ADD_TO_CART', payload: { id: props.id, action: 'increment' } }
      )}
    >
      {props.title}
    </button>
  ),
}));

const { default: CartPage } = await import('./page');

function makeProduct(id: string, options: Product['options'] = []): Product {
  return {
    id,
    categoryId: 'category-1',
    tenantId: null,
    name: `Product ${id}`,
    basePrice: id === 'recommended-1' ? 20 : 35,
    unit: 'piece',
    options,
    isActive: true,
    createdAt: '2026-09-23T00:00:00.000Z',
  };
}

const cartProduct = makeProduct('cart-product');
const regularRecommendation = makeProduct('recommended-1');
const sizedRecommendation = makeProduct('recommended-2', [
  { id: 'size-1', type: 'size', label: 'Large', priceModifier: 5 },
]);

function cartSummary(): CartSummary {
  return {
    cart: { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: cartProduct.createdAt },
    lines: [
      {
        item: {
          id: 'cart-item-1', cartId: 'cart-1', productId: cartProduct.id, quantity: 1, selection: {}, createdAt: cartProduct.createdAt,
        },
        product: cartProduct,
        unitPrice: cartProduct.basePrice,
        lineTotal: cartProduct.basePrice,
      },
    ],
    total: cartProduct.basePrice,
  };
}

let container: HTMLDivElement;
let root: Root;

async function renderPage() {
  const page = await CartPage();
  await act(async () => {
    root.render(<CartTotalProvider total={cartProduct.basePrice} itemCount={1}>{page}</CartTotalProvider>);
  });
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getCartSummary.mockResolvedValue(cartSummary());
  mocks.getMerchants.mockResolvedValue([]);
  mocks.getRecommendations.mockResolvedValue([sizedRecommendation.id, regularRecommendation.id]);
  mocks.getProductsByIds.mockResolvedValue([sizedRecommendation, regularRecommendation]);
  mocks.add.mockResolvedValue({ summary: cartSummary() });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('BATCH A — cart cross-sell shelf', () => {
  it('preserves recommendation IDs/order in HorizontalShelfStem', async () => {
    await renderPage();

    const shelf = container.querySelector('[data-testid="cart-cross-sell-stem"]')!;
    expect(shelf.getAttribute('data-title')).toBe('غالباً ما يُشترى معه');
    expect(Array.from(shelf.querySelectorAll('[data-product-id]')).map((node) => node.getAttribute('data-product-id')))
      .toEqual([sizedRecommendation.id, regularRecommendation.id]);
    expect(mocks.getProductsByIds).toHaveBeenCalledWith([sizedRecommendation.id, regularRecommendation.id]);
  });

  it('keeps real adapter cart actions and sends no client price', async () => {
    await renderPage();

    container.querySelector<HTMLButtonElement>(
      `[data-testid="cart-cross-sell-product"][data-product-id="${regularRecommendation.id}"]`
    )!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await settle();

    expect(mocks.add).toHaveBeenCalledWith({ productId: regularRecommendation.id, quantity: 1 });
    expect(mocks.add.mock.calls[0][0]).not.toHaveProperty('price');
  });

  it('routes configured recommendations without cart mutation and omits an empty recommendation shelf', async () => {
    await renderPage();
    const configuredCard = container.querySelector<HTMLButtonElement>(
      `[data-testid="cart-cross-sell-product"][data-product-id="${sizedRecommendation.id}"]`
    );
    expect(configuredCard?.getAttribute('data-requires-configuration')).toBe('true');
    configuredCard!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await settle();
    expect(mocks.push).toHaveBeenCalledWith(`/product/${sizedRecommendation.id}`);
    expect(mocks.add).not.toHaveBeenCalled();

    mocks.getRecommendations.mockResolvedValueOnce([]);
    mocks.getProductsByIds.mockClear();
    await renderPage();

    expect(container.querySelector('[data-testid="cart-cross-sell-stem"]')).toBeNull();
    expect(mocks.getProductsByIds).not.toHaveBeenCalled();
  });
});
