// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartSummary } from '@/core/modules/cart/types';
import type { Product } from '@/core/modules/catalog/types';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  add: vi.fn(),
  getSummary: vi.fn(),
  remove: vi.fn(),
  update: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
}));

vi.mock('@/app/(reef)/cart/actions', () => ({
  addToCartAction: mocks.add,
  getCartSummaryAction: mocks.getSummary,
  removeCartItemAction: mocks.remove,
  updateCartItemAction: mocks.update,
}));

vi.mock('@/components/useCartToast', async () => {
  const React = await import('react');
  return {
    useCartToast: () => {
      const [message, setMessage] = React.useState<string | null>(null);
      return {
        showToast: setMessage,
        toastNode: message ? <div role="alert">{message}</div> : null,
      };
    },
  };
});

vi.mock('@/sdui/engine/PageEngine', () => ({
  PageEngine: ({ pageData, onAction }: { pageData: any; onAction: (action: any) => void }) => {
    const product = pageData.sections[0].props.items[0];
    return (
      <div>
        <span data-testid="quantity">{product.quantity}</span>
        <button onClick={() => onAction({ type: 'ADD_TO_CART', payload: { id: product.id, action: 'increment' } })}>
          increment
        </button>
        <button onClick={() => onAction({ type: 'ADD_TO_CART', payload: { id: product.id, action: 'decrement' } })}>
          decrement
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/ui/StemProductCard', () => ({ StemProductCard: () => null }));
vi.mock('@/components/ui/HorizontalShelfStem', () => ({ HorizontalShelfStem: () => null }));
vi.mock('@/components/ui/ProductQuickViewStem', () => ({ ProductQuickViewStem: () => null }));

const { RealCatalogShelfSDUI } = await import('./RealCatalogShelfSDUI');

const product: Product = {
  id: 'product-1',
  categoryId: 'category-1',
  tenantId: 'tenant-1',
  name: 'Product',
  basePrice: 25,
  unit: 'piece',
  options: [],
  isActive: true,
  createdAt: '2026-09-23T00:00:00.000Z',
};

let serverQuantity = 0;
let container: HTMLDivElement;
let root: Root;

function summary(quantity = serverQuantity): CartSummary {
  return {
    cart: { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: product.createdAt },
    lines:
      quantity > 0
        ? [
            {
              item: {
                id: 'item-1',
                cartId: 'cart-1',
                productId: product.id,
                quantity,
                selection: {},
                createdAt: product.createdAt,
              },
              product,
              unitPrice: product.basePrice,
              lineTotal: product.basePrice * quantity,
            },
          ]
        : [],
    total: product.basePrice * quantity,
  };
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function remount(initialQuantity: number, renderedProduct: Product = product) {
  serverQuantity = initialQuantity;
  act(() => root.unmount());
  root = createRoot(container);
  await act(async () => {
    root.render(
      <RealCatalogShelfSDUI
        title="Shelf"
        products={[renderedProduct]}
        initialQuantities={{ [renderedProduct.id]: initialQuantity }}
      />
    );
  });
}

function click(label: 'increment' | 'decrement') {
  const button = Array.from(container.querySelectorAll('button')).find((candidate) => candidate.textContent === label);
  button!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
}

function quantityText() {
  return container.querySelector('[data-testid="quantity"]')?.textContent;
}

beforeEach(async () => {
  vi.clearAllMocks();
  serverQuantity = 0;
  mocks.getSummary.mockImplementation(async () => summary());
  mocks.add.mockImplementation(async (input: { quantity: number }) => {
    serverQuantity = input.quantity;
    return { summary: summary(999) };
  });
  mocks.update.mockImplementation(async (_itemId: string, quantity: number) => {
    serverQuantity = quantity;
    return { summary: summary(999) };
  });
  mocks.remove.mockImplementation(async () => {
    serverQuantity = 0;
    return { summary: summary(999) };
  });

  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<RealCatalogShelfSDUI title="Shelf" products={[product]} initialQuantities={{ [product.id]: serverQuantity }} />);
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('UI-MIG-000 — Stem catalog cart mutations', () => {
  it('A: serializes rapid increments and derives each quantity from current server state', async () => {
    await remount(1);

    click('increment');
    click('increment');
    await settle();

    expect(mocks.update.mock.calls.map((call) => call[1])).toEqual([2, 3]);
    expect(quantityText()).toBe('3');
  });

  it('B: preserves rapid increment-then-decrement ordering', async () => {
    await remount(1);

    click('increment');
    click('decrement');
    await settle();

    expect(mocks.update.mock.calls.map((call) => call[1])).toEqual([2, 1]);
    expect(quantityText()).toBe('1');
  });

  it('C: keeps the last confirmed quantity when a mutation fails', async () => {
    mocks.update.mockResolvedValueOnce({ error: 'Out of stock' });
    await remount(1);

    click('increment');
    await settle();

    expect(quantityText()).toBe('1');
    expect(mocks.getSummary).toHaveBeenCalledTimes(1);
  });

  it('D: exposes the server failure to the user', async () => {
    mocks.add.mockResolvedValueOnce({ error: 'Cannot add this product' });

    click('increment');
    await settle();

    expect(document.querySelector('[role="alert"]')?.textContent).toBe('Cannot add this product');
  });

  it('E: refreshes server-rendered cart surfaces only after a confirmed post-mutation read', async () => {
    click('increment');
    await settle();

    expect(mocks.getSummary).toHaveBeenCalledTimes(2);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.getSummary.mock.invocationCallOrder[1]).toBeLessThan(mocks.refresh.mock.invocationCallOrder[0]);
  });

  it('F: sends product identity and quantity without a client price', async () => {
    click('increment');
    await settle();

    expect(mocks.add).toHaveBeenCalledWith({ productId: product.id, quantity: 1 });
    expect(mocks.add.mock.calls[0][0]).not.toHaveProperty('price');
  });

  it('routes configured products without reaching any cart mutation', async () => {
    const configuredProduct: Product = {
      ...product,
      options: [{ id: 'size-1', type: 'size', label: 'Large', priceModifier: 5 }],
    };
    await remount(0, configuredProduct);

    click('increment');
    await settle();

    expect(mocks.push).toHaveBeenCalledWith(`/product/${configuredProduct.id}`);
    expect(mocks.getSummary).not.toHaveBeenCalled();
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
