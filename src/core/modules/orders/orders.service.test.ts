// src/core/modules/orders/orders.service.test.ts
// اختبارات وحدة — تُموّه فقط طبقة الوصول لقاعدة البيانات (*.repository.ts)؛
// منطق catalogService (calculatePrice/validateSelection) وcartService الحقيقيان يعملان بلا تمويه

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '../catalog/types';
import type { Cart, CartItem } from '../cart/types';
import type { User } from '../../kernel/khalil/types';

const chicken: Product = {
  id: 'prod-chicken',
  categoryId: 'cat-1',
  tenantId: 'tenant-a',
  name: 'دجاجة اختبار',
  basePrice: 120,
  unit: 'piece',
  options: [{ id: 'small', type: 'size', label: 'صغير', priceModifier: -20 }],
  isActive: true,
  createdAt: new Date().toISOString(),
};

const fish: Product = {
  id: 'prod-fish',
  categoryId: 'cat-1',
  tenantId: 'tenant-b',
  name: 'سمك اختبار',
  basePrice: 50,
  unit: 'piece',
  options: [],
  isActive: true,
  createdAt: new Date().toISOString(),
};

const products: Record<string, Product> = { [chicken.id]: chicken, [fish.id]: fish };

vi.mock('../catalog/catalog.repository', () => ({
  catalogRepository: {
    findProductById: vi.fn(async (id: string) => products[id] ?? null),
  },
}));

vi.mock('../inventory/inventory.repository', () => ({
  inventoryRepository: {
    findByProductId: vi.fn(async () => ({ productId: chicken.id, quantityAvailable: 10, updatedAt: new Date().toISOString() })),
  },
}));

const cart: Cart = { id: 'cart-1', userId: null, sessionToken: 'session-1', createdAt: new Date().toISOString() };

vi.mock('../cart/cart.repository', () => ({
  cartRepository: {
    findCartById: vi.fn(async () => cart),
    findCartByUserId: vi.fn(async () => null),
    findCartBySessionToken: vi.fn(async () => cart),
    createCartForUser: vi.fn(),
    createCartForSession: vi.fn(),
    findItems: vi.fn(),
    insertItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

const testUser: User = { id: 'user-1', fullName: 'زبون اختبار', phone: '01099999999', role: 'customer', createdAt: new Date().toISOString() };

vi.mock('../../kernel/khalil/khalil.repository', () => ({
  khalilRepository: {
    findUserByPhoneAdmin: vi.fn(async () => null),
    createUser: vi.fn(async () => testUser),
  },
}));

vi.mock('./orders.repository', () => ({
  ordersRepository: {
    createOrder: vi.fn(async (input) => ({
      id: 'order-1',
      userId: input.userId,
      tenantId: input.tenantId,
      status: 'pending',
      paymentMethod: input.paymentMethod,
      deliveryAddress: input.deliveryAddress,
      total: input.total,
      createdAt: new Date().toISOString(),
    })),
    createOrderItems: vi.fn(async () => []),
    deleteOrder: vi.fn(),
    findOrderById: vi.fn(),
    findOrderItems: vi.fn(),
  },
}));

const { ordersService } = await import('./orders.service');
const { cartRepository } = await import('../cart/cart.repository');
const { ordersRepository } = await import('./orders.repository');
const { khalilRepository } = await import('../../kernel/khalil/khalil.repository');

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

const checkoutInput = {
  identity: { sessionToken: 'session-1' } as const,
  customerName: 'زبون اختبار',
  customerPhone: '01099999999',
  deliveryAddress: { line1: 'شارع 1', city: 'القاهرة' },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cartRepository.findCartById).mockResolvedValue(cart);
  vi.mocked(cartRepository.findCartBySessionToken).mockResolvedValue(cart);
});

describe('OrdersService.checkout', () => {
  it('يرفض عند سلة فارغة', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([]);
    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/فارغة/);
    expect(ordersRepository.createOrder).not.toHaveBeenCalled();
  });

  it('يرفض عند منتج غير نشط', async () => {
    products[chicken.id] = { ...chicken, isActive: false };
    vi.mocked(cartRepository.findItems).mockResolvedValue([makeItem()]);
    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/لم يعد متاحاً/);
    products[chicken.id] = chicken; // إعادة الحالة لبقية الاختبارات
  });

  it('يرفض عند نقص المخزون', async () => {
    const { inventoryRepository } = await import('../inventory/inventory.repository');
    vi.mocked(inventoryRepository.findByProductId).mockResolvedValueOnce({
      productId: chicken.id,
      quantityAvailable: 0,
      updatedAt: new Date().toISOString(),
    });
    vi.mocked(cartRepository.findItems).mockResolvedValue([makeItem()]);
    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/غير متوفرة في المخزون/);
  });

  it('يرفض عند تعدد التجار بين بنود السلة', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([
      makeItem({ id: 'a', productId: chicken.id, selection: { sizeId: 'small' } }),
      makeItem({ id: 'b', productId: fish.id, selection: {} }),
    ]);
    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/أكثر من تاجر/);
  });

  it('ينجح: يُنشئ الطلب بسعر مجمَّد مطابق للسعر المحسوب حياً، وينشئ مستخدماً جديداً، ويُفرغ السلة', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([makeItem({ quantity: 2, selection: { sizeId: 'small' } })]);

    const order = await ordersService.checkout(checkoutInput);

    expect(order.total).toBe(200); // (120 - 20) * 2
    expect(order.tenantId).toBe('tenant-a');
    expect(khalilRepository.createUser).toHaveBeenCalledWith({
      fullName: 'زبون اختبار',
      phone: '01099999999',
      role: 'customer',
    });
    expect(ordersRepository.createOrderItems).toHaveBeenCalledWith(
      'order-1',
      expect.arrayContaining([expect.objectContaining({ unitPriceSnapshot: 100, quantity: 2 })])
    );
    expect(cartRepository.deleteItem).toHaveBeenCalledWith('item-1');
  });

  it('لا يُنشئ مستخدماً جديداً إذا وُجد مستخدم مطابق بالهاتف مسبقاً', async () => {
    vi.mocked(cartRepository.findItems).mockResolvedValue([makeItem()]);
    vi.mocked(khalilRepository.findUserByPhoneAdmin).mockResolvedValueOnce(testUser);

    await ordersService.checkout(checkoutInput);

    expect(khalilRepository.createUser).not.toHaveBeenCalled();
  });
});
