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
    insertItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    deleteItem: vi.fn(),
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cartRepository.findCartById).mockResolvedValue(cart);
});

describe('CartService.getSummary', () => {
  it('يحسب سعر كل بند حياً عبر calculatePrice الحقيقي، ويجمع الإجمالي بشكل صحيح', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([
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

describe('CartService.getItemCountForSession', () => {
  it('اختبار حاسم (اليوم 14، منع سباق مع الـHeader): لا يستدعي إنشاء سلة جديدة إطلاقاً — يعيد صفراً إن لم توجد سلة لهذا التوكن بعد', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(null);

    const count = await cartService.getItemCountForSession('brand-new-token');

    expect(count).toBe(0);
    expect(cartRepository.createCartForSession).not.toHaveBeenCalled();
    expect(cartRepository.findItems).not.toHaveBeenCalled();
  });

  it('يجمع كميات السلة الموجودة فعلاً لهذا التوكن', async () => {
    vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(cart);
    vi.mocked(cartRepository.findItems).mockResolvedValue([makeItem({ quantity: 4 })]);

    const count = await cartService.getItemCountForSession(cart.sessionToken!);

    expect(count).toBe(4);
  });
});

describe('CartService.removeItem', () => {
  it('يحذف البند ويُعيد ملخصاً محدَّثاً عندما ينتمي فعلاً لهذه السلة', async () => {
    const item = makeItem();
    // الاستدعاء الأول: فحص الملكية (يجد البند)؛ الثاني: getSummary بعد الحذف الفعلي (لا بند بعدها)
    vi.mocked(cartRepository.findItems).mockResolvedValueOnce([item]).mockResolvedValueOnce([]);

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
