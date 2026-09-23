// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UIAction } from '@/sdui/actions/action-contracts';
import { StemProductCard } from './StemProductCard';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

async function render(requiresConfiguration: boolean, onAction: (action: UIAction) => void) {
  await act(async () => {
    root.render(
      <StemProductCard
        id="product-1"
        title="Chicken"
        price={100}
        unit="piece"
        quantity={requiresConfiguration ? undefined : 2}
        requiresConfiguration={requiresConfiguration}
        onAction={onAction}
      />
    );
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('StemProductCard product actions', () => {
  it('keeps simple products on direct cart actions', async () => {
    const onAction = vi.fn();
    await render(false, onAction);

    const buttons = Array.from(container.querySelectorAll('button'));
    act(() => buttons.at(-1)!.click());

    expect(onAction).toHaveBeenCalledWith({ type: 'ADD_TO_CART', payload: { id: 'product-1', action: 'increment' } });
  });

  it('renders a native, truthfully-labelled configured CTA that never emits ADD_TO_CART', async () => {
    const onAction = vi.fn();
    await render(true, onAction);

    const button = container.querySelector<HTMLButtonElement>('button[aria-label="اختر خيارات Chicken"]');
    expect(button).toBeTruthy();
    expect(button?.type).toBe('button');
    act(() => button!.click());

    expect(onAction).toHaveBeenCalledWith({ type: 'OPEN_CONFIGURATION', payload: { id: 'product-1' } });
    expect(onAction.mock.calls.some(([action]) => action.type === 'ADD_TO_CART')).toBe(false);
  });
});
