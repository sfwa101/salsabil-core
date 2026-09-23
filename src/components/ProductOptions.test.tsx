// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/core/modules/catalog/types';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/app/(reef)/product/[id]/actions', () => ({
  calculatePriceAction: vi.fn(),
}));
vi.mock('@/app/(reef)/cart/actions', () => ({
  addToCartAction: vi.fn(),
}));

const { ProductOptions } = await import('./ProductOptions');
const { CartTotalProvider } = await import('./CartTotalProvider');
const { calculatePriceAction } = await import('@/app/(reef)/product/[id]/actions');

const product: Product = {
  id: 'product-1',
  categoryId: 'category-1',
  tenantId: 'tenant-1',
  name: 'منتج بخيارات',
  basePrice: 10,
  unit: 'قطعة',
  options: [
    { id: 'small', type: 'size', label: 'صغير', priceModifier: 0 },
    { id: 'large', type: 'size', label: 'كبير', priceModifier: 20 },
  ],
  isActive: true,
  createdAt: new Date().toISOString(),
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
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

describe('ProductOptions price ordering', () => {
  it('does not let an older price response replace the latest selection price', async () => {
    const first = deferred<Awaited<ReturnType<typeof calculatePriceAction>>>();
    const second = deferred<Awaited<ReturnType<typeof calculatePriceAction>>>();
    vi.mocked(calculatePriceAction)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    await act(async () => {
      root.render(
        <CartTotalProvider total={0} itemCount={0}>
          <ProductOptions product={product} />
        </CartTotalProvider>
      );
    });

    const largeOption = Array.from(container.querySelectorAll('input[type="radio"]')).find(
      (input) => (input.parentElement?.textContent ?? '').includes('كبير')
    ) as HTMLInputElement;
    await act(async () => largeOption.click());

    await act(async () => second.resolve({ price: 30 }));
    await act(async () => first.resolve({ price: 10 }));

    expect(container.textContent).toContain('السعر: 30 جنيه');
  });
});
