// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Product } from '@/core/modules/catalog/types';
import type { UIAction } from '@/sdui/actions/action-contracts';
import type { ProductCardStemProps } from '@/types/ui-contracts';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  setQuantity: vi.fn(),
  showToast: vi.fn(),
  stemProps: null as ProductCardStemProps | null,
  useLine: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/components/ui/StemProductCard', () => ({
  StemProductCard: (props: ProductCardStemProps) => {
    mocks.stemProps = props;
    return <div data-testid="stem-adapter-output" />;
  },
}));
vi.mock('@/components/useOptimisticCartLine', () => ({
  useOptimisticCartLine: (...args: unknown[]) => {
    mocks.useLine(...args);
    return { quantity: 2, setQuantity: mocks.setQuantity };
  },
}));
vi.mock('@/components/useCartToast', () => ({
  useCartToast: () => ({ showToast: mocks.showToast, toastNode: <div data-testid="toast-node" /> }),
}));

const { StemProductCardAdapter } = await import('./StemProductCardAdapter');

function product(options: Product['options'] = []): Product {
  return {
    id: 'product-1', categoryId: 'category-1', tenantId: 'tenant-1', name: 'Product', basePrice: 20,
    unit: 'piece', options, isActive: true, createdAt: '2026-09-23T00:00:00.000Z',
  };
}

let container: HTMLDivElement;
let root: Root;

async function renderProduct(value: Product, onOpenSheet?: (id: string) => void) {
  await act(async () => {
    root.render(<StemProductCardAdapter product={value} onOpenSheet={onOpenSheet} />);
  });
  return mocks.stemProps!;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.stemProps = null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('StemProductCardAdapter configuration safety', () => {
  it('keeps simple quantity actions on the existing cart hook', async () => {
    const props = await renderProduct(product());
    props.onAction?.({ type: 'ADD_TO_CART', payload: { id: props.id, action: 'increment' } });
    expect(mocks.setQuantity).toHaveBeenCalledWith(3);
  });

  it.each([
    { id: 'size-1', type: 'size' as const, label: 'Large', priceModifier: 5 },
    { id: 'addon-1', type: 'addon' as const, label: 'Extra', priceModifier: 2 },
  ])('renders configured products in Stem and hands off without cart mutation', async (option) => {
    const openSheet = vi.fn();
    const props = await renderProduct(product([option]), openSheet);
    expect(props.requiresConfiguration).toBe(true);

    props.onAction?.({ type: 'OPEN_CONFIGURATION', payload: { id: props.id } });
    props.onAction?.({ type: 'ADD_TO_CART', payload: { id: props.id, action: 'increment' } } as UIAction);

    expect(openSheet).toHaveBeenCalledTimes(2);
    expect(openSheet).toHaveBeenCalledWith(props.id);
    expect(mocks.setQuantity).not.toHaveBeenCalled();
  });

  it('routes configured products to the existing Product page when no sheet callback exists', async () => {
    const props = await renderProduct(product([{ id: 'size-1', type: 'size', label: 'Large', priceModifier: 5 }]));
    props.onAction?.({ type: 'OPEN_CONFIGURATION', payload: { id: props.id } });
    expect(mocks.push).toHaveBeenCalledWith('/product/product-1');
  });

  it('keeps the existing visible-error callback connected to the cart hook', async () => {
    await renderProduct(product());
    const onError = mocks.useLine.mock.calls[0][3] as (message: string) => void;
    onError('Out of stock');
    expect(mocks.showToast).toHaveBeenCalledWith('Out of stock');
  });
});
