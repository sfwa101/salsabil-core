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
  getCartSummaryAction: vi.fn(),
  updateCartItemAction: vi.fn(),
  removeCartItemAction: vi.fn(),
}));

const { DesktopCartSidebar } = await import('./DesktopCartSidebar');
const { CartLineItem } = await import('@/components/CartLineItem');
const { addToCartAction, getCartSummaryAction, updateCartItemAction } = await import('@/app/(reef)/cart/actions');
const { CartTotalProvider, useCartTotal } = await import('@/components/CartTotalProvider');

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCartSummaryAction).mockResolvedValue(summary(2));
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

function CartSnapshot() {
  const { total, itemCount } = useCartTotal();
  return <output data-testid="cart-snapshot">{`${total}:${itemCount}`}</output>;
}

function summary(quantity: number) {
  return {
    cart: { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: new Date().toISOString() },
    lines: quantity > 0 ? [{ ...lines[0], item: { ...lines[0].item, quantity }, lineTotal: 10 * quantity }] : [],
    total: 10 * quantity,
  };
}

function configuredVariantSummary(smallQuantity: number) {
  const configuredProduct = {
    ...lines[0].product,
    options: [
      { id: 'small', type: 'size' as const, label: 'صغير', priceModifier: 0 },
      { id: 'large', type: 'size' as const, label: 'كبير', priceModifier: 0 },
      { id: 'addon-a', type: 'addon' as const, label: 'إضافة', priceModifier: 0 },
    ],
  };
  const largeLine = {
    ...lines[0],
    product: configuredProduct,
    item: {
      ...lines[0].item,
      id: 'item-large',
      quantity: 5,
      selection: { sizeId: 'large', addonIds: [] },
    },
    lineTotal: 50,
  };
  const smallLine = {
    ...lines[0],
    product: configuredProduct,
    item: {
      ...lines[0].item,
      id: smallQuantity === 1 ? 'item-small-new' : 'item-small',
      quantity: smallQuantity,
      selection: { sizeId: 'small', addonIds: ['addon-a'] },
    },
    lineTotal: 10 * smallQuantity,
  };
  return {
    cart: { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: new Date().toISOString() },
    lines: smallQuantity > 0 ? [largeLine, smallLine] : [largeLine],
    total: 50 + 10 * smallQuantity,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

async function render() {
  await act(async () => {
    root.render(
      <CartTotalProvider total={20} itemCount={2}>
        <DesktopCartSidebar lines={lines} />
        <CartSnapshot />
      </CartTotalProvider>
    );
  });
}

function findByLabel(root: ParentNode, label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((b) => b.getAttribute('aria-label') === label);
}

function displayedQuantity(root: ParentNode): string | null | undefined {
  return findByLabel(root, 'زيادة الكمية')?.parentElement?.querySelector('span')?.textContent;
}

describe('DesktopCartSidebar — توحيد منطق Cart Optimistic Update (TASK-02)', () => {
  it('اختبار حاسم: فشل updateCartItemAction يُعيد الكمية المعروضة للقيمة السابقة (تراجع بصري حقيقي)', async () => {
    vi.mocked(updateCartItemAction).mockResolvedValue({ error: 'الكمية المطلوبة غير متوفرة في المخزون' });

    await render();

    expect(displayedQuantity(container)).toBe('2');

    const incrementButton = findByLabel(container, 'زيادة الكمية');
    expect(incrementButton).toBeTruthy();

    await act(async () => {
      incrementButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(updateCartItemAction).toHaveBeenCalledWith('item-1', 3);
    expect(displayedQuantity(container)).toBe('2');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('20:2');
  });

  it('نجاح updateCartItemAction: الكمية المعروضة تبقى عند القيمة الجديدة (لا تراجع بلا داعٍ)', async () => {
    vi.mocked(updateCartItemAction).mockResolvedValue({ summary: summary(3) });

    await render();

    const incrementButton = findByLabel(container, 'زيادة الكمية');
    await act(async () => {
      incrementButton!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(displayedQuantity(container)).toBe('3');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('30:3');
  });

  it('يحافظ على ترتيب زيادتين سريعتين ويطابق ملخص الخادم النهائي', async () => {
    const first = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    const second = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    vi.mocked(updateCartItemAction)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    vi.mocked(getCartSummaryAction)
      .mockResolvedValueOnce(summary(2))
      .mockResolvedValueOnce(summary(3));

    await render();
    const incrementButton = findByLabel(container, 'زيادة الكمية')!;

    await act(async () => {
      incrementButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    await act(async () => {
      findByLabel(container, 'زيادة الكمية')!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(displayedQuantity(container)).toBe('4');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('40:4');
    expect(updateCartItemAction).toHaveBeenCalledTimes(1);
    expect(updateCartItemAction).toHaveBeenNthCalledWith(1, 'item-1', 3);

    await act(async () => first.resolve({ summary: summary(3) }));
    expect(updateCartItemAction).toHaveBeenCalledTimes(2);
    expect(updateCartItemAction).toHaveBeenNthCalledWith(2, 'item-1', 4);

    await act(async () => second.resolve({ summary: summary(4) }));
    expect(displayedQuantity(container)).toBe('4');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('40:4');
  });

  it('لا تسمح لفشل الطلب الأول بإلغاء نجاح الطلب الثاني في الطابور', async () => {
    const first = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    const second = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    vi.mocked(updateCartItemAction)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    await render();
    findByLabel(container, 'زيادة الكمية')!.click();
    await act(async () => undefined);
    findByLabel(container, 'زيادة الكمية')!.click();
    await act(async () => undefined);

    await act(async () => first.resolve({ error: 'فشل الطلب الأول' }));
    await act(async () => second.resolve({ summary: summary(3) }));

    expect(displayedQuantity(container)).toBe('3');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('30:3');
  });

  it('يحفظ نجاح الطلب الأول إذا فشل الطلب الثاني', async () => {
    const first = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    const second = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    vi.mocked(updateCartItemAction)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    vi.mocked(getCartSummaryAction)
      .mockResolvedValueOnce(summary(2))
      .mockResolvedValueOnce(summary(3));

    await render();
    await act(async () => {
      findByLabel(container, 'زيادة الكمية')!.click();
    });
    await act(async () => {
      findByLabel(container, 'زيادة الكمية')!.click();
    });

    await act(async () => first.resolve({ summary: summary(3) }));
    await act(async () => second.resolve({ error: 'فشل الطلب الثاني' }));

    expect(displayedQuantity(container)).toBe('3');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('30:3');
  });

  it('يرسل الزيادة ثم الإنقاص بالترتيب ويحافظ على الإجمالي والعداد غير سالبين', async () => {
    const first = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    const second = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    vi.mocked(updateCartItemAction)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    vi.mocked(getCartSummaryAction)
      .mockResolvedValueOnce(summary(2))
      .mockResolvedValueOnce(summary(3));

    await render();
    await act(async () => {
      findByLabel(container, 'زيادة الكمية')!.click();
    });
    await act(async () => {
      findByLabel(container, 'إنقاص الكمية')!.click();
    });

    expect(displayedQuantity(container)).toBe('2');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('20:2');
    await act(async () => first.resolve({ summary: summary(3) }));
    expect(updateCartItemAction).toHaveBeenNthCalledWith(2, 'item-1', 2);
    await act(async () => second.resolve({ summary: summary(2) }));

    expect(displayedQuantity(container)).toBe('2');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('20:2');
  });

  it('يتراجع ويعرض خطأً مرئياً إذا رمى Server Action استثناءً', async () => {
    vi.mocked(updateCartItemAction).mockRejectedValue(new Error('انقطع الاتصال'));

    await render();
    await act(async () => {
      findByLabel(container, 'زيادة الكمية')!.click();
    });

    expect(displayedQuantity(container)).toBe('2');
    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('20:2');
    expect(document.body.textContent).toContain('انقطع الاتصال');
  });

  it('يعيد تأسيس زيادتين من سطحين مستقلين على أحدث كمية خادمية دون فقد نقرة', async () => {
    const first = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    const second = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    vi.mocked(updateCartItemAction)
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    vi.mocked(getCartSummaryAction)
      .mockResolvedValueOnce(summary(2))
      .mockResolvedValueOnce(summary(3));

    await act(async () => {
      root.render(
        <CartTotalProvider total={20} itemCount={2}>
          <CartLineItem line={lines[0]} />
          <CartLineItem line={lines[0]} />
          <CartSnapshot />
        </CartTotalProvider>
      );
    });

    const incrementButtons = Array.from(container.querySelectorAll('button')).filter(
      (button) => button.getAttribute('aria-label') === 'زيادة الكمية'
    );
    await act(async () => incrementButtons[0].click());
    await act(async () => incrementButtons[1].click());

    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('40:4');
    expect(updateCartItemAction).toHaveBeenNthCalledWith(1, 'item-1', 3);

    await act(async () => first.resolve({ summary: summary(3) }));
    expect(updateCartItemAction).toHaveBeenNthCalledWith(2, 'item-1', 4);
    await act(async () => second.resolve({ summary: summary(4) }));

    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('40:4');
    const finalQuantities = Array.from(container.querySelectorAll('button'))
      .filter((button) => button.getAttribute('aria-label') === 'زيادة الكمية')
      .map((button) => button.parentElement?.querySelector('span')?.textContent);
    expect(finalQuantities).toEqual(['4', '4']);
  });

  it('يعيد إضافة السطر بعد حذفه من سطح آخر ويحافظ على التهيئة ويزامن السطحين', async () => {
    const oneLine = { ...lines[0], item: { ...lines[0].item, quantity: 1 } };
    const remove = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    const readd = deferred<Awaited<ReturnType<typeof addToCartAction>>>();
    vi.mocked(updateCartItemAction).mockImplementationOnce(() => remove.promise);
    vi.mocked(addToCartAction).mockImplementationOnce(() => readd.promise);
    vi.mocked(getCartSummaryAction)
      .mockResolvedValueOnce(summary(1))
      .mockResolvedValueOnce(summary(0));

    await act(async () => {
      root.render(
        <CartTotalProvider total={10} itemCount={1}>
          <CartLineItem line={oneLine} />
          <CartLineItem line={oneLine} />
          <CartSnapshot />
        </CartTotalProvider>
      );
    });

    const decrementButtons = Array.from(container.querySelectorAll('button')).filter(
      (button) => button.getAttribute('aria-label') === 'إنقاص الكمية'
    );
    const incrementButtons = Array.from(container.querySelectorAll('button')).filter(
      (button) => button.getAttribute('aria-label') === 'زيادة الكمية'
    );
    await act(async () => decrementButtons[0].click());
    await act(async () => incrementButtons[1].click());

    expect(updateCartItemAction).toHaveBeenCalledWith('item-1', 0);
    await act(async () => remove.resolve({ summary: summary(0) }));
    expect(addToCartAction).toHaveBeenCalledWith({
      productId: 'product-1',
      quantity: 1,
      selection: {},
    });
    await act(async () => readd.resolve({ summary: summary(1) }));

    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('10:1');
    const finalQuantities = Array.from(container.querySelectorAll('button'))
      .filter((button) => button.getAttribute('aria-label') === 'زيادة الكمية')
      .map((button) => button.parentElement?.querySelector('span')?.textContent);
    expect(finalQuantities).toEqual(['1', '1']);
  });

  it('يعيد ربط التأكيد بنفس تهيئة السطر عند وجود تهيئة أخرى للمنتج نفسه', async () => {
    const initialSummary = configuredVariantSummary(1);
    const smallLine = initialSummary.lines[1];
    const remove = deferred<Awaited<ReturnType<typeof updateCartItemAction>>>();
    const readd = deferred<Awaited<ReturnType<typeof addToCartAction>>>();
    vi.mocked(updateCartItemAction).mockImplementationOnce(() => remove.promise);
    vi.mocked(addToCartAction).mockImplementationOnce(() => readd.promise);
    vi.mocked(getCartSummaryAction)
      .mockResolvedValueOnce(initialSummary)
      .mockResolvedValueOnce(configuredVariantSummary(0));

    await act(async () => {
      root.render(
        <CartTotalProvider total={60} itemCount={6}>
          <CartLineItem line={smallLine} />
          <CartLineItem line={smallLine} />
          <CartSnapshot />
        </CartTotalProvider>
      );
    });

    const decrementButtons = Array.from(container.querySelectorAll('button')).filter(
      (button) => button.getAttribute('aria-label') === 'إنقاص الكمية'
    );
    const incrementButtons = Array.from(container.querySelectorAll('button')).filter(
      (button) => button.getAttribute('aria-label') === 'زيادة الكمية'
    );
    await act(async () => decrementButtons[0].click());
    await act(async () => incrementButtons[1].click());

    await act(async () => remove.resolve({ summary: configuredVariantSummary(0) }));
    expect(addToCartAction).toHaveBeenCalledWith({
      productId: 'product-1',
      quantity: 1,
      selection: { sizeId: 'small', addonIds: ['addon-a'] },
    });
    await act(async () => readd.resolve({ summary: configuredVariantSummary(1) }));

    expect(container.querySelector('[data-testid="cart-snapshot"]')?.textContent).toBe('60:6');
    const finalQuantities = Array.from(container.querySelectorAll('button'))
      .filter((button) => button.getAttribute('aria-label') === 'زيادة الكمية')
      .map((button) => button.parentElement?.querySelector('span')?.textContent);
    expect(finalQuantities).toEqual(['1', '1']);
  });
});
