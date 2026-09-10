// src/core/modules/cart/cart.service.test.ts
// اختبارات وحدة — تُموّه فقط طبقة الوصول لقاعدة البيانات (*.repository.ts)،
// منطق catalogService (calculatePrice/validateSelection) الحقيقي يعمل فعلياً بلا تمويه

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '../catalog/types';
import type { Cart, CartItem } from './types';

const chicken: Product = {
  id: 'prod-chicken',
  categoryId: 'cat-1',
  tenantId: null,
  name: 'دجاجة اختبار',
  basePrice: 120,
  unit: 'piece',
  options: [
    { id: 'small', type: 'size', label: 'صغير', priceModifier: -20 },
    { id: 'medium', type: 'size', label: 'متوسط', priceModifier: 0 },
    { id: 'large', type: 'size', label: 'كبير', priceModifier: 30 },
  ],
  isActive: true,
  createdAt: new Date().toISOString(),
};

vi.mock('../catalog/catalog.repository', () => ({
  catalogRepository: {
    findProductById: vi.fn(async (id: string) => (id === chicken.id ? chicken : null)),
  },
}));

vi.mock('../inventory/inventory.repository', () => ({
  inventoryRepository: {
    findByProductId: vi.fn(),
  },
}));

vi.mock('./cart.repository', () => ({
  cartRepository: {
    findCartById: vi.fn(),
    findCartByUserId: vi.fn(),
    findCartBySessionToken: vi.fn(),
    createCartForUser: vi.fn(),
    createCartForSession: vi.fn(),
    findItems: vi.fn(),
    // REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 2: getSummary/getSummaryForCart تستدعيان
    // هذه الآن بدل findItems + استعلام منتج منفصل لكل بند — راجع cart.repository.ts.
    findItemsWithProducts: vi.fn(),
    insertItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    deleteItem: vi.fn(),
    deleteCart: vi.fn(),
  },
}));

const { cartService } = await import('./cart.service');
const { cartRepository } = await import('./cart.repository');
const { inventoryRepository } = await import('../inventory/inventory.repository');

const cart: Cart = { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: new Date().toISOString() };

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    id: 'item-1',
    cartId: cart.id,
    productId: chicken.id,
    quantity: 1,
    selection: { sizeId: 'small' },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// buildSummary (getSummary/getSummaryForCart) تستدعي findItemsWithProducts دائماً في نهايتها —
// حتى الاختبارات التي لا تتحقق من محتوى summary (addItem/updateItemQuantity/removeItem) تحتاج
// موكاً صالحاً هنا، وإلا يرمي .map() على undefined. المنتج المرتبط دائماً chicken في هذا الملف.
function mockSummaryItems(items: CartItem[]): void {
  vi.mocked(cartRepository.findItemsWithProducts).mockResolvedValue(
    items.map((item) => ({ item, product: chicken }))
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cartRepository.findCartById).mockResolvedValue(cart);
  mockSummaryItems([]);
});

describe('CartService.getSummary', () => {
  it('يحسب سعر كل بند حياً عبر calculatePrice الحقيقي، ويجمع الإجمالي بشكل صحيح', async () => {
    mockSummaryItems([
      makeItem({ id: 'a', selection: { sizeId: 'small' }, quantity: 2 }), // 100 * 2 = 200
      makeItem({ id: 'b', selection: { sizeId: 'large' }, quantity: 1 }), // 150 * 1 = 150
    ]);

    const summary = await cartService.getSummary(cart.id);

    expect(summary.lines[0].unitPrice).toBe(100);
    expect(summary.lines[0].lineTotal).toBe(200);
    expect(summary.lines[1].unitPrice).toBe(150);
    expect(summary.total).toBe(350);
  });
});

describe('CartService.getSummaryForCart', () => {
  it('لا يستدعي findCartById إطلاقاً — يستخدم كائن Cart المُمرَّر مباشرة (REBUILD-CART-CHECKOUT دفعة 2)', async () => {
    mockSummaryItems([makeItem({ selection: { sizeId: 'medium' }, quantity: 1 })]);

    const summary = await cartService.getSummaryForCart(cart);

    expect(cartRepository.findCartById).not.toHaveBeenCalled();
    expect(summary.cart).toBe(cart);
    expect(summary.total).toBe(120);
  });
});

describe('CartService.addItem', () => {
  it('يدمج الكمية عند إضافة نفس المنتج بنفس الاختيار مرة أخرى بدل إنشاء بند جديد', async () => {
    const existing = makeItem({ quantity: 1, selection: { sizeId: 'small' } });
    vi.mocked(cartRepository.findItems).mockResolvedValue([existing]);
    vi.mocked(inventoryRepository.findByProductId).mockResolvedValue({
      productId: chicken.id,
      quantityAvailable: 10,
      updatedAt: new Date().toISOString(),
    });

    await cartService.addItem(cart.id, { productId: chicken.id, quantity: 2, selection: { sizeId: 'small' } });

    expect(cartRepository.updateItemQuantity).toHaveBeenCalledWith(existing.id, 3);
    expect(cartRepository.insertItem).not.toHaveBeenCalled();
  });

  it('يرفض الإضافة عند نقص المخزون', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([]);
    vi.mocked(inventoryRepository.findByProductId).mockResolvedValue({
      productId: chicken.id,
      quantityAvailable: 1,
      updatedAt: new Date().toISOString(),
    });

    await expect(
      cartService.addItem(cart.id, { productId: chicken.id, quantity: 5, selection: { sizeId: 'small' } })
    ).rejects.toThrow(/غير متوفرة/);
    expect(cartRepository.insertItem).not.toHaveBeenCalled();
  });

  it('يرفض اختياراً غير صالح (validateSelection الحقيقي غير المُصطنَع)', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([]);

    await expect(
      cartService.addItem(cart.id, { productId: chicken.id, quantity: 1, selection: { sizeId: 'not-a-real-size' } })
    ).rejects.toThrow(/اختيار غير صالح/);
    expect(cartRepository.insertItem).not.toHaveBeenCalled();
  });
});

describe('CartService.updateItemQuantity', () => {
  it('يحذف البند عند تمرير كمية صفر أو أقل', async () => {
    const item = makeItem();
    vi.mocked(cartRepository.findItems).mockResolvedValue([item]);

    await cartService.updateItemQuantity(cart.id, item.id, 0);

    expect(cartRepository.deleteItem).toHaveBeenCalledWith(item.id);
    expect(cartRepository.updateItemQuantity).not.toHaveBeenCalled();
  });
});

describe('CartService.getItemCount', () => {
  it('يجمع الكميات عبر كل البنود لا عدد الأصناف', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([
      makeItem({ id: 'a', quantity: 2 }),
      makeItem({ id: 'b', quantity: 3 }),
    ]);

    const count = await cartService.getItemCount(cart.id);

    expect(count).toBe(5);
  });

  it('يعيد صفراً لسلة بلا بنود', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([]);

    const count = await cartService.getItemCount(cart.id);

    expect(count).toBe(0);
  });
});

describe('CartService.getItemCountForIdentity', () => {
  it('اختبار حاسم (اليوم 14، منع سباق مع الـHeader): لا يستدعي إنشاء سلة جديدة إطلاقاً — يعيد صفراً إن لم توجد سلة لهذا التوكن بعد', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(null);

    const count = await cartService.getItemCountForIdentity({ sessionToken: 'brand-new-token' });

    expect(count).toBe(0);
    expect(cartRepository.createCartForSession).not.toHaveBeenCalled();
    expect(cartRepository.findItems).not.toHaveBeenCalled();
  });

  it('يجمع كميات السلة الموجودة فعلاً لهذا التوكن', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(cart);
    vi.mocked(cartRepository.findItems).mockResolvedValue([makeItem({ quantity: 4 })]);

    const count = await cartService.getItemCountForIdentity({ sessionToken: cart.sessionToken! });

    expect(count).toBe(4);
  });

  // CUSTOMER-IDENTITY-PHASE-1 — عميل مسجَّل دخوله: سلته بـuserId لا sessionToken (ADR-008).
  it('يجمع كميات سلة عميل مسجَّل دخوله عبر userId، لا sessionToken', async () => {
    vi.mocked(cartRepository.findCartByUserId).mockResolvedValue(cart);
    vi.mocked(cartRepository.findItems).mockResolvedValue([makeItem({ quantity: 2 })]);

    const count = await cartService.getItemCountForIdentity({ userId: 'user-1' });

    expect(count).toBe(2);
    expect(cartRepository.findCartByUserId).toHaveBeenCalledWith('user-1');
    expect(cartRepository.findCartBySessionToken).not.toHaveBeenCalled();
  });
});

describe('CartService.getTotalForIdentity', () => {
  it('يعيد صفراً بلا استدعاء getSummary إن لم توجد سلة لهذا التوكن بعد (نفس نمط getItemCountForIdentity)', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(null);

    const total = await cartService.getTotalForIdentity({ sessionToken: 'brand-new-token' });

    expect(total).toBe(0);
    expect(cartRepository.findItemsWithProducts).not.toHaveBeenCalled();
  });

  it('يعيد إجمالي السلة الموجودة فعلاً لهذا التوكن (سعر محسوب حياً عبر getSummary)', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(cart);
    mockSummaryItems([makeItem({ selection: { sizeId: 'medium' }, quantity: 2 })]); // 120 * 2 = 240

    const total = await cartService.getTotalForIdentity({ sessionToken: cart.sessionToken! });

    expect(total).toBe(240);
  });
});

describe('CartService.getSummaryForIdentityIfExists', () => {
  it('يعيد null بلا استدعاء findCartById إن لم توجد سلة لهذا التوكن بعد (نفس نمط getTotalForIdentity)', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(null);

    const summary = await cartService.getSummaryForIdentityIfExists({ sessionToken: 'brand-new-token' });

    expect(summary).toBeNull();
    expect(cartRepository.findCartById).not.toHaveBeenCalled();
    expect(cartRepository.findItemsWithProducts).not.toHaveBeenCalled();
  });

  it('يعيد الملخّص الكامل للسلة الموجودة فعلاً لهذا التوكن، عبر getSummaryForCart (بلا findCartById زائدة)', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(cart);
    mockSummaryItems([makeItem({ selection: { sizeId: 'medium' }, quantity: 3 })]); // 120 * 3 = 360

    const summary = await cartService.getSummaryForIdentityIfExists({ sessionToken: cart.sessionToken! });

    expect(cartRepository.findCartById).not.toHaveBeenCalled();
    expect(summary?.total).toBe(360);
    expect(summary?.lines).toHaveLength(1);
  });
});

describe('CartService.mergeGuestCartIntoUser', () => {
  it('لا يفعل شيئاً إن لم توجد سلة ضيف لهذا التوكن أصلاً', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(null);

    await cartService.mergeGuestCartIntoUser('guest-token', 'user-1');

    expect(cartRepository.findCartByUserId).not.toHaveBeenCalled();
    expect(cartRepository.deleteCart).not.toHaveBeenCalled();
  });

  it('يحذف سلة الضيف الفارغة بلا لمس سلة المستخدم إطلاقاً', async () => {
    const guestCart = { ...cart, id: 'guest-cart', sessionToken: 'guest-token' };
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(guestCart);
    vi.mocked(cartRepository.findItems).mockResolvedValue([]);

    await cartService.mergeGuestCartIntoUser('guest-token', 'user-1');

    expect(cartRepository.deleteCart).toHaveBeenCalledWith('guest-cart');
    expect(cartRepository.findCartByUserId).not.toHaveBeenCalled();
  });

  it('يجمع الكمية عند نفس المنتج بنفس الاختيار (لا استبدال)، وينقل بند مختلف كما هو، ثم يحذف سلة الضيف', async () => {
    const guestCart = { ...cart, id: 'guest-cart', userId: null, sessionToken: 'guest-token' };
    const userCart = { ...cart, id: 'user-cart', userId: 'user-1', sessionToken: null };
    const sharedItem = makeItem({ id: 'shared', productId: 'p1', selection: { sizeId: 'small' }, quantity: 2 });
    const guestOnlyItem = makeItem({ id: 'guest-only', productId: 'p2', selection: {}, quantity: 1 });
    const existingUserItem = makeItem({ id: 'existing', productId: 'p1', selection: { sizeId: 'small' }, quantity: 3 });

    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(guestCart);
    vi.mocked(cartRepository.findCartByUserId).mockResolvedValue(userCart);
    vi.mocked(cartRepository.findItems).mockImplementation(async (cartId: string) =>
      cartId === 'guest-cart' ? [sharedItem, guestOnlyItem] : [existingUserItem]
    );

    await cartService.mergeGuestCartIntoUser('guest-token', 'user-1');

    // نفس المنتج/الاختيار — تُجمَع الكميات (3 + 2 = 5)، لا استبدال
    expect(cartRepository.updateItemQuantity).toHaveBeenCalledWith('existing', 5);
    // بند لا يوجد له مطابق في سلة المستخدم — يُنقَل كما هو
    expect(cartRepository.insertItem).toHaveBeenCalledWith('user-cart', 'p2', 1, {});
    expect(cartRepository.deleteCart).toHaveBeenCalledWith('guest-cart');
  });
});

describe('CartService.removeItem', () => {
  it('يحذف البند ويُعيد ملخصاً محدَّثاً عندما ينتمي فعلاً لهذه السلة', async () => {
    const item = makeItem();
    // findItems: فحص الملكية فقط (يجد البند). getSummary اللاحق يستخدم findItemsWithProducts
    // (موكاً في beforeEach إلى [] — لا بند بعد الحذف الفعلي).
    vi.mocked(cartRepository.findItems).mockResolvedValue([item]);

    const summary = await cartService.removeItem(cart.id, item.id);

    expect(cartRepository.deleteItem).toHaveBeenCalledWith(item.id);
    expect(summary.lines).toHaveLength(0);
  });

  it('اختبار أمني حاسم (IDOR، اليوم 12): يرفض حذف itemId لا ينتمي لهذه السلة، بلا لمس deleteItem إطلاقاً', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([]); // سلة الفاعل فارغة — البند ينتمي لسلة أخرى

    await expect(cartService.removeItem(cart.id, 'item-from-another-cart')).rejects.toThrow(/غير موجود/);
    expect(cartRepository.deleteItem).not.toHaveBeenCalled();
  });
});
