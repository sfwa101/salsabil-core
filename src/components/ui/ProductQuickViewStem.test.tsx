// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuickViewProductSnapshot, UIAction } from '@/sdui/actions/action-contracts';
import { ProductQuickViewStem } from './ProductQuickViewStem';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const baseProduct: QuickViewProductSnapshot = {
  id: 'product-1',
  title: 'Product',
  price: 20,
  description: 'Real description',
  unit: 'kg',
  currentQuantity: 2,
  requiresConfiguration: false,
};

let container: HTMLDivElement;
let root: Root;

async function render(product: QuickViewProductSnapshot, onAction: (action: UIAction) => void, onClose = vi.fn()) {
  await act(async () => {
    root.render(<ProductQuickViewStem product={product} onAction={onAction} onClose={onClose} />);
  });
  return onClose;
}

function actionButton(): HTMLButtonElement {
  return Array.from(container.querySelectorAll('button')).find((button) =>
    button.textContent?.includes('أضف للسلة') || button.textContent?.includes('اختر الخيارات')
  )!;
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.style.overflow = '';
});

describe('ProductQuickViewStem production presentation', () => {
  it('shows real description/unit/current quantity and sends no client price or computed total', async () => {
    const onAction = vi.fn();
    await render(baseProduct, onAction);

    expect(container.textContent).toContain(baseProduct.description);
    expect(container.textContent).toContain(baseProduct.unit);
    expect(container.textContent).toContain('2');
    expect(actionButton().textContent).toBe('أضف للسلة');
    expect(actionButton().textContent).not.toContain('40');

    act(() => actionButton().click());
    expect(onAction).toHaveBeenCalledWith({
      type: 'ADD_TO_CART',
      payload: { id: baseProduct.id, amount: 2, action: 'set' },
    });
    expect(onAction.mock.calls[0][0].payload).not.toHaveProperty('price');
  });

  it('labels base price truthfully and hands configured products to configuration only', async () => {
    const onAction = vi.fn();
    const onClose = await render({ ...baseProduct, requiresConfiguration: true }, onAction);

    expect(container.textContent).toContain('يبدأ من 20 ج.م');
    expect(container.textContent).not.toContain('الكمية');
    expect(actionButton().textContent).toBe('اختر الخيارات');
    act(() => actionButton().click());

    expect(onAction).toHaveBeenCalledWith({ type: 'OPEN_CONFIGURATION', payload: { id: baseProduct.id } });
    expect(onAction.mock.calls.some(([action]) => action.type === 'ADD_TO_CART')).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
