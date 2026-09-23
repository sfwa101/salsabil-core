// @vitest-environment jsdom

import type { ReactNode } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PostWithDetails } from '@/core/modules/bayan/types';
import type { Product } from '@/core/modules/catalog/types';
import type { ProductCardStemProps } from '@/types/ui-contracts';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setQuantity: vi.fn(),
  shelf: vi.fn(),
  stemCard: vi.fn(),
  useLine: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/components/ui/HorizontalShelfStem', () => ({
  HorizontalShelfStem: ({ title, items }: { title: string; items: ReactNode[] }) => {
    mocks.shelf({ title, items });
    return (
      <section data-testid="stem-shelf" data-title={title}>
        {items}
      </section>
    );
  },
}));

vi.mock('@/components/ui/StemProductCard', () => ({
  StemProductCard: (props: ProductCardStemProps) => {
    mocks.stemCard(props);
    return (
      <div data-card="stem" data-product-id={props.id}>
        <span>{props.title}</span>
        <button
          data-action="select"
          onClick={() =>
            props.onAction?.(
              props.requiresConfiguration
                ? { type: 'OPEN_CONFIGURATION', payload: { id: props.id } }
                : {
                    type: 'OPEN_QUICK_VIEW',
                    payload: {
                      product: {
                        id: props.id,
                        title: props.title,
                        price: props.price,
                        imageUrl: props.imageUrl,
                        publisher: props.publisher,
                      },
                    },
                  }
            )
          }
        >
          select
        </button>
        <button
          data-action="cart"
          onClick={() => props.onAction?.({ type: 'ADD_TO_CART', payload: { id: props.id, action: 'increment' } })}
        >
          cart
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/useOptimisticCartLine', () => ({
  useOptimisticCartLine: (
    productId: string,
    unitPrice: number,
    cartLine: { itemId: string; quantity: number } | undefined,
    onError: (message: string) => void
  ) => {
    mocks.useLine(productId, unitPrice, cartLine, onError);
    return { quantity: 0, setQuantity: mocks.setQuantity };
  },
}));

vi.mock('@/components/useCartToast', () => ({
  useCartToast: () => ({ showToast: vi.fn(), toastNode: null }),
}));

const { PostSheetContent } = await import('./PostSheetContent');

function makeProduct(id: string, options: Product['options'] = []): Product {
  return {
    id,
    categoryId: 'category-1',
    tenantId: 'tenant-1',
    name: `Product ${id}`,
    basePrice: id === 'product-1' ? 15 : 30,
    unit: 'piece',
    options,
    isActive: true,
    createdAt: '2026-09-23T00:00:00.000Z',
  };
}

const post: PostWithDetails = {
  id: 'post-1',
  worldScope: 'reef',
  categoryId: 'category-1',
  postType: 'post',
  caption: 'Real post caption',
  isPublished: true,
  priority: 1,
  createdAt: '2026-09-23T00:00:00.000Z',
  updatedAt: '2026-09-23T00:00:00.000Z',
  media: [],
  productIds: ['product-1', 'product-2'],
};

const regularProduct = makeProduct('product-1');
const sizedProduct = makeProduct('product-2', [
  { id: 'size-1', type: 'size', label: 'Large', priceModifier: 5 },
]);

let container: HTMLDivElement;
let root: Root;

async function render(products: Product[], onSelectProduct = vi.fn()) {
  await act(async () => {
    root.render(<PostSheetContent post={post} products={products} onSelectProduct={onSelectProduct} />);
  });
  return onSelectProduct;
}

function click(selector: string) {
  const element = container.querySelector<HTMLButtonElement>(selector);
  expect(element).toBeTruthy();
  act(() => element!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
}

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

describe('UI-MIG-010 — PostSheet mentioned-products shelf container', () => {
  it('renders HorizontalShelfStem with the existing title', async () => {
    await render([regularProduct]);

    expect(container.querySelector('[data-testid="stem-shelf"]')).toBeTruthy();
    expect(mocks.shelf).toHaveBeenCalledWith(expect.objectContaining({ title: 'المنتجات المذكورة' }));
  });

  it('preserves every mentioned product and its ordering', async () => {
    await render([regularProduct, sizedProduct]);

    expect(
      Array.from(container.querySelectorAll('[data-product-id]')).map((element) => element.getAttribute('data-product-id'))
    ).toEqual(['product-1', 'product-2']);
  });

  it('preserves product selection through onSelectProduct', async () => {
    const onSelectProduct = await render([regularProduct]);

    click('[data-product-id="product-1"] [data-action="select"]');

    expect(onSelectProduct).toHaveBeenCalledWith('product-1');
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('keeps cart actions wired through StemProductCardAdapter', async () => {
    await render([regularProduct]);

    click('[data-product-id="product-1"] [data-action="cart"]');

    expect(mocks.useLine).toHaveBeenCalledWith('product-1', regularProduct.basePrice, undefined, expect.any(Function));
    expect(mocks.setQuantity).toHaveBeenCalledWith(1);
  });

  it('keeps the existing empty-list behavior by omitting the shelf', async () => {
    await render([]);

    expect(container.querySelector('[data-testid="stem-shelf"]')).toBeNull();
    expect(mocks.shelf).not.toHaveBeenCalled();
  });

  it('passes caller-supplied product data without local replacements', async () => {
    await render([regularProduct, sizedProduct]);

    expect(mocks.stemCard).toHaveBeenCalledWith(expect.objectContaining({
      id: regularProduct.id,
      title: regularProduct.name,
      price: regularProduct.basePrice,
    }));
    expect(mocks.stemCard).toHaveBeenCalledWith(expect.objectContaining({
      id: sizedProduct.id,
      requiresConfiguration: true,
    }));
  });

  it('keeps configured products in Stem and preserves the sheet callback without a cart mutation', async () => {
    const onSelectProduct = await render([sizedProduct]);

    expect(container.querySelector('[data-card="stem"]')).toBeTruthy();
    click('[data-card="stem"] [data-action="select"]');
    expect(onSelectProduct).toHaveBeenCalledWith(sizedProduct.id);
    expect(mocks.setQuantity).not.toHaveBeenCalled();
  });
});
