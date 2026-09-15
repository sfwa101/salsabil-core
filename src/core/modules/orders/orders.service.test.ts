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
    // CRITICAL-FIXES-FROM-AUDIT-001، بند 2 — checkout() الحقيقي يستدعي الآن reserve() (خصم ذرّي)
    // بدل isAvailable() فقط عند نقطة الاستهلاك — بلا هذا الـmock، كل اختبار Checkout ناجح كان
    // سيفشل بـ"غير متوفرة في المخزون" (undefined من دالة غير مموَّهة) بلا علاقة بالمنطق المُختبَر.
    decrementIfAvailable: vi.fn(async () => true),
    restore: vi.fn(async () => undefined),
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
    // REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 2: performCheckout يستدعي
    // cartService.getSummaryForCart الآن، الذي يستدعي هذه بدل findItems + استعلام منتج منفصل —
    // راجع mockCartItems أدناه.
    findItemsWithProducts: vi.fn(),
    insertItem: vi.fn(),
    updateItemQuantity: vi.fn(),
    deleteItem: vi.fn(),
  },
}));

const testUser: User = { id: 'user-1', fullName: 'زبون اختبار', phone: '01099999999', role: 'customer', createdAt: new Date().toISOString() };

// اليوم 21 (ADR-019): khalilService.findOrCreateCustomerByPhone (الحقيقي، غير مموَّه هنا) يستدعي
// الآن ensureIndividualPersona أيضاً — يحتاج الـmock الثلاثة أدناه بقيم افتراضية معقولة، وإلا
// يفشل كل اختبار يمر بـ Checkout بخطأ "is not a function" بلا علاقة بمنطق الطلبات نفسه.
const testWorld = { id: 'world-1', slug: 'individuals', name: 'الأفراد', isActive: true, createdAt: new Date().toISOString() };
const testPersona = { id: 'persona-1', userId: testUser.id, worldId: testWorld.id, isDefault: true, createdAt: new Date().toISOString() };

vi.mock('../../kernel/khalil/khalil.repository', () => ({
  khalilRepository: {
    findUserByPhoneAdmin: vi.fn(async () => null),
    createUser: vi.fn(async () => testUser),
    findWorldBySlug: vi.fn(async () => testWorld),
    findPersonaByUserAndWorld: vi.fn(async () => null),
    createPersona: vi.fn(async () => testPersona),
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
      updatedAt: new Date().toISOString(),
    })),
    createOrderItems: vi.fn(async () => []),
    deleteOrder: vi.fn(),
    findOrderById: vi.fn(),
    findOrderItems: vi.fn(),
    findOrdersByTenantId: vi.fn(async () => []),
    findAll: vi.fn(async () => []),
    findAllStatusHistory: vi.fn(async () => []),
    updateOrderStatus: vi.fn(),
    insertStatusHistory: vi.fn(async () => ({})),
    findStatusHistory: vi.fn(async () => []),
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

// getSummaryForCart تستدعي findItemsWithProducts (استعلام مُجمَّع)، لا findItems + بحث منتج منفصل
// — يبني كل زوج {item, product} من نفس قاموس products أعلاه (يعكس حالته الحالية وقت الاستدعاء،
// بما فيها أي تعديل مؤقت مثل isActive: false في اختبار "منتج غير نشط" أدناه). findItems يبقى
// مموَّهاً بنفس البنود أيضاً — clearCart() (نهاية checkout الناجح) لا تزال تستدعيه مباشرة.
function mockCartItems(items: CartItem[]): void {
  vi.mocked(cartRepository.findItems).mockResolvedValue(items);
  vi.mocked(cartRepository.findItemsWithProducts).mockResolvedValue(
    items.map((item) => ({ item, product: products[item.productId] }))
  );
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
    mockCartItems([]);
    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/فارغة/);
    expect(ordersRepository.createOrder).not.toHaveBeenCalled();
  });

  it('يرفض عند منتج غير نشط', async () => {
    products[chicken.id] = { ...chicken, isActive: false };
    mockCartItems([makeItem()]);
    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/لم يعد متاحاً/);
    products[chicken.id] = chicken; // إعادة الحالة لبقية الاختبارات
  });

  it('يرفض عند نقص المخزون (decrementIfAvailable يعيد false عند الاستهلاك الفعلي)', async () => {
    const { inventoryRepository } = await import('../inventory/inventory.repository');
    vi.mocked(inventoryRepository.decrementIfAvailable).mockResolvedValueOnce(false);
    mockCartItems([makeItem()]);
    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/غير متوفرة في المخزون/);
    expect(ordersRepository.createOrder).not.toHaveBeenCalled();
  });

  it('يستعيد (release) كل مخزون خُصم في نفس المحاولة عند فشل خطوة لاحقة (تعويض، بند 3)', async () => {
    const { inventoryRepository } = await import('../inventory/inventory.repository');
    mockCartItems([makeItem({ quantity: 2 })]);
    // ينجح خصم المخزون، ثم يفشل إنشاء الطلب نفسه (خطأ DB افتراضي) — يجب استرجاع الكمية المخصومة
    vi.mocked(ordersRepository.createOrder).mockRejectedValueOnce(new Error('فشل DB افتراضي'));

    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/فشل DB افتراضي/);

    expect(inventoryRepository.decrementIfAvailable).toHaveBeenCalledWith(chicken.id, 2);
    expect(inventoryRepository.restore).toHaveBeenCalledWith(chicken.id, 2);
  });

  it('يرفض عند تعدد التجار بين بنود السلة', async () => {
    mockCartItems([
      makeItem({ id: 'a', productId: chicken.id, selection: { sizeId: 'small' } }),
      makeItem({ id: 'b', productId: fish.id, selection: {} }),
    ]);
    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/أكثر من تاجر/);
  });

  it('ينجح: يُنشئ الطلب بسعر مجمَّد مطابق للسعر المحسوب حياً، وينشئ مستخدماً جديداً، ويُفرغ السلة', async () => {
    mockCartItems([makeItem({ quantity: 2, selection: { sizeId: 'small' } })]);

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
    expect(ordersRepository.insertStatusHistory).toHaveBeenCalledWith({
      orderId: 'order-1',
      fromStatus: null,
      toStatus: 'pending',
      actorRole: 'system',
    });
  });

  it('لا يُنشئ مستخدماً جديداً إذا وُجد مستخدم مطابق بالهاتف مسبقاً', async () => {
    mockCartItems([makeItem()]);
    vi.mocked(khalilRepository.findUserByPhoneAdmin).mockResolvedValueOnce(testUser);

    await ordersService.checkout(checkoutInput);

    expect(khalilRepository.createUser).not.toHaveBeenCalled();
  });
});

function makeOrder(overrides: Partial<{ status: string }> = {}) {
  return {
    id: 'order-1',
    userId: 'user-1',
    tenantId: 'tenant-a',
    status: 'pending',
    paymentMethod: 'cash_on_delivery',
    deliveryAddress: { line1: 'شارع 1', city: 'القاهرة' },
    total: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('OrdersService.transitionStatus', () => {
  it('يرفض إذا كان الطلب غير موجود', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(null);

    await expect(
      ordersService.transitionStatus({ orderId: 'missing', toStatus: 'confirmed', actorRole: 'merchant_owner' })
    ).rejects.toThrow(/غير موجود/);
    expect(ordersRepository.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('يرفض انتقالاً غير مسموح في آلة الحالات (pending → delivered مباشرة)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }) as never);

    await expect(
      ordersService.transitionStatus({ orderId: 'order-1', toStatus: 'delivered', actorRole: 'merchant_owner', tenantId: 'tenant-a' })
    ).rejects.toThrow(/لا يمكن الانتقال/);
    expect(ordersRepository.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('يرفض انتقالاً من حالة نهائية (delivered → أي شيء)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'delivered' }) as never);

    await expect(
      ordersService.transitionStatus({ orderId: 'order-1', toStatus: 'cancelled', actorRole: 'platform_admin' })
    ).rejects.toThrow(/لا يمكن الانتقال/);
  });

  it('يرفض فاعلاً غير مخوَّل (customer لا يملك حق تأكيد الطلب)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }) as never);

    await expect(
      ordersService.transitionStatus({ orderId: 'order-1', toStatus: 'confirmed', actorRole: 'customer' })
    ).rejects.toThrow(/غير مخوَّل/);
    expect(ordersRepository.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('ينجح: pending → confirmed بفاعل تاجر مخوَّل يملك نفس tenantId، ويسجّل قيداً في السجل بالحالتين والفاعل', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }) as never);
    vi.mocked(ordersRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);

    const order = await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'confirmed',
      actorRole: 'merchant_owner',
      actorId: 'merchant-user-1',
      tenantId: 'tenant-a',
      note: 'تأكيد يدوي',
    });

    expect(order.status).toBe('confirmed');
    expect(ordersRepository.updateOrderStatus).toHaveBeenCalledWith('order-1', 'pending', 'confirmed');
    expect(ordersRepository.insertStatusHistory).toHaveBeenCalledWith({
      orderId: 'order-1',
      fromStatus: 'pending',
      toStatus: 'confirmed',
      actorRole: 'merchant_owner',
      actorId: 'merchant-user-1',
      note: 'تأكيد يدوي',
    });
  });

  it('ينجح: يمكن الإلغاء من preparing (وليس فقط من pending)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'preparing' }) as never);
    vi.mocked(ordersRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'cancelled' }) as never);
    vi.mocked(ordersRepository.findOrderItems).mockResolvedValue([]);

    const order = await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'cancelled',
      actorRole: 'platform_admin',
    });

    expect(order.status).toBe('cancelled');
  });

  // TASK-08 — الإصلاح الأساسي: الانتقال إلى cancelled يجب أن يسترجع مخزون كل بند فعلياً عبر
  // InventoryService.release() الموجودة أصلاً (لا منطق استرجاع جديد)، لا أن يُترك المخزون محجوزاً.
  it('TASK-08: يسترجع مخزون كل بند من order_items عند الإلغاء (* → cancelled)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);
    vi.mocked(ordersRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'cancelled' }) as never);
    vi.mocked(ordersRepository.findOrderItems).mockResolvedValue([
      { id: 'oi-1', orderId: 'order-1', productId: chicken.id, quantity: 2, selection: {}, unitPriceSnapshot: 100, createdAt: new Date().toISOString() },
      { id: 'oi-2', orderId: 'order-1', productId: fish.id, quantity: 3, selection: {}, unitPriceSnapshot: 50, createdAt: new Date().toISOString() },
    ] as never);
    const { inventoryRepository } = await import('../inventory/inventory.repository');

    const order = await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'cancelled',
      actorRole: 'merchant_owner',
      tenantId: 'tenant-a',
    });

    expect(order.status).toBe('cancelled');
    expect(inventoryRepository.restore).toHaveBeenCalledWith(chicken.id, 2);
    expect(inventoryRepository.restore).toHaveBeenCalledWith(fish.id, 3);
  });

  // TASK-08، §4 — الانتقال إلى cancelled لا يستدعي أي استرجاع لطلب لم يُلغَ (تحقّق سلبي: لا استرجاع
  // مخزون غير مبرَّر عند انتقالات أخرى غير الإلغاء).
  it('TASK-08: لا يستدعي استرجاع المخزون عند انتقال غير الإلغاء', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }) as never);
    vi.mocked(ordersRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);
    const { inventoryRepository } = await import('../inventory/inventory.repository');

    await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'confirmed',
      actorRole: 'merchant_owner',
      tenantId: 'tenant-a',
    });

    expect(ordersRepository.findOrderItems).not.toHaveBeenCalled();
    expect(inventoryRepository.restore).not.toHaveBeenCalled();
  });

  // TASK-08، §4 — التحقق من الحالة الحرجة "استرجاع مضاعف": قفل orders.repository.ts التفاؤلي
  // (updateOrderStatus يعيد null عند تعارض) يجب أن يمنع تنفيذ الانتقال + الاسترجاع، لا فقط يفشل
  // بصمت — استدعاء transitionStatus عندما يُغيّر طرف آخر الحالة فعلياً بين القراءة والكتابة (محاكى
  // هنا بجعل updateOrderStatus يعيد null، وهو ما تعيده هذه الدالة فعلياً عند فشل القفل التفاؤلي حياً).
  it('TASK-08: يرفض الانتقال ولا يسترجع مخزوناً عند تعارض تزامن (updateOrderStatus يعيد null)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);
    vi.mocked(ordersRepository.updateOrderStatus).mockResolvedValue(null);
    const { inventoryRepository } = await import('../inventory/inventory.repository');

    await expect(
      ordersService.transitionStatus({
        orderId: 'order-1',
        toStatus: 'cancelled',
        actorRole: 'merchant_owner',
        tenantId: 'tenant-a',
      })
    ).rejects.toThrow(/تعارض تزامن/);

    expect(ordersRepository.insertStatusHistory).not.toHaveBeenCalled();
    expect(ordersRepository.findOrderItems).not.toHaveBeenCalled();
    expect(inventoryRepository.restore).not.toHaveBeenCalled();
  });

  it('يرفض تاجراً يحاول تغيير حالة طلب تاجر آخر (عزل المستأجرين، اليوم 10)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }) as never); // tenant-a

    await expect(
      ordersService.transitionStatus({
        orderId: 'order-1',
        toStatus: 'confirmed',
        actorRole: 'merchant_owner',
        actorId: 'merchant-user-2',
        tenantId: 'tenant-b', // تاجر مختلف
      })
    ).rejects.toThrow(/لا يخص تاجرك/);
    expect(ordersRepository.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('لا يفرض تطابق tenantId على platform_admin (يرى/يُغيّر كل شيء)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }) as never);
    vi.mocked(ordersRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);

    const order = await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'confirmed',
      actorRole: 'platform_admin',
      // بلا tenantId إطلاقاً — يجب أن ينجح رغم ذلك
    });

    expect(order.status).toBe('confirmed');
  });
});

// CRITICAL-FIXES-FROM-AUDIT-001، بند 4 — أول اختبار وحدة على الإطلاق لهاتين الدالتين (لم يكن
// لهما أي اختبار وحدة قبل هذا الإصلاح، فقط تكامل حي). يثبت أن الإصلاح يعمل حتى بلا اتصال Supabase
// حقيقي — منطق التخويل نفسه (assertActorCanAccessOrder) لا يعتمد على قاعدة البيانات إطلاقاً.
describe('OrdersService.getOrderWithItems (بند 4 — عزل المستأجرين على القراءة)', () => {
  it('يرفض فاعل تاجر لا يخص طلبه (tenant-a مقابل tenant-b)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);

    await expect(
      ordersService.getOrderWithItems({ role: 'merchant_owner', tenantId: 'tenant-b' }, 'order-1')
    ).rejects.toThrow(/لا يخص تاجرك/);
    expect(ordersRepository.findOrderItems).not.toHaveBeenCalled();
  });

  it('يسمح لفاعل التاجر الصحيح (نفس tenantId الطلب)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);
    vi.mocked(ordersRepository.findOrderItems).mockResolvedValue([]);

    const result = await ordersService.getOrderWithItems({ role: 'merchant_owner', tenantId: 'tenant-a' }, 'order-1');
    expect(result!.order.status).toBe('confirmed');
  });

  it('يسمح لـplatform_admin بلا حاجة لمطابقة tenantId إطلاقاً', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);
    vi.mocked(ordersRepository.findOrderItems).mockResolvedValue([]);

    const result = await ordersService.getOrderWithItems({ role: 'platform_admin' }, 'order-1');
    expect(result!.order.status).toBe('confirmed');
  });

  it('يعيد null لطلب غير موجود قبل أي فحص تخويل', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(null);
    const result = await ordersService.getOrderWithItems({ role: 'merchant_owner', tenantId: 'tenant-b' }, 'missing');
    expect(result).toBeNull();
  });
});

describe('OrdersService.getStatusHistory (بند 4 — عزل المستأجرين على القراءة)', () => {
  it('يرفض فاعل تاجر لا يخص طلبه', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);

    await expect(
      ordersService.getStatusHistory({ role: 'merchant_owner', tenantId: 'tenant-b' }, 'order-1')
    ).rejects.toThrow(/لا يخص تاجرك/);
    expect(ordersRepository.findStatusHistory).not.toHaveBeenCalled();
  });

  it('يرمي خطأ صريحاً لطلب غير موجود (لا مصفوفة فارغة صامتة)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(null);
    await expect(ordersService.getStatusHistory({ role: 'platform_admin' }, 'missing')).rejects.toThrow(/غير موجود/);
  });

  it('يسمح لفاعل التاجر الصحيح ويعيد السجل', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);
    vi.mocked(ordersRepository.findStatusHistory).mockResolvedValue([]);

    const result = await ordersService.getStatusHistory({ role: 'merchant_owner', tenantId: 'tenant-a' }, 'order-1');
    expect(result).toEqual([]);
  });
});

describe('OrdersService.getOrderForCustomerView', () => {
  it('يعيد null لطلب غير موجود بلا محاولة جلب بنود', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(null);

    const result = await ordersService.getOrderForCustomerView('missing');

    expect(result).toBeNull();
    expect(ordersRepository.findOrderItems).not.toHaveBeenCalled();
  });

  it('يُثري كل بند باسم المنتج الحقيقي عبر catalogService', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);
    vi.mocked(ordersRepository.findOrderItems).mockResolvedValue([
      { id: 'oi-1', orderId: 'order-1', productId: chicken.id, quantity: 2, selection: { sizeId: 'small' }, unitPriceSnapshot: 100, createdAt: new Date().toISOString() },
    ]);

    const result = await ordersService.getOrderForCustomerView('order-1');

    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].productName).toBe('دجاجة اختبار');
    expect(result!.items[0].item.unitPriceSnapshot).toBe(100);
  });

  it('يعيد productName: null لو حُذف المنتج (لا يفشل الاستعلام)', async () => {
    vi.mocked(ordersRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }) as never);
    vi.mocked(ordersRepository.findOrderItems).mockResolvedValue([
      { id: 'oi-1', orderId: 'order-1', productId: 'deleted-product', quantity: 1, selection: {}, unitPriceSnapshot: 50, createdAt: new Date().toISOString() },
    ]);

    const result = await ordersService.getOrderForCustomerView('order-1');

    expect(result!.items[0].productName).toBeNull();
  });
});

describe('OrdersService.getOrdersForTenant', () => {
  it('يعيد طلبات التاجر المطلوب فقط عبر findOrdersByTenantId', async () => {
    const tenantOrders = [makeOrder({ status: 'pending' }), makeOrder({ status: 'confirmed' })];
    vi.mocked(ordersRepository.findOrdersByTenantId).mockResolvedValue(tenantOrders as never);

    const result = await ordersService.getOrdersForTenant('tenant-a');

    expect(ordersRepository.findOrdersByTenantId).toHaveBeenCalledWith('tenant-a');
    expect(result).toEqual(tenantOrders);
  });
});

describe('OrdersService.getAllOrders', () => {
  it('يعيد كل الطلبات بلا أي تصفية تاجر عبر findAll (اليوم 11، لوحة الإدارة)', async () => {
    const allOrders = [makeOrder({ status: 'pending' }), makeOrder({ status: 'delivered' })];
    vi.mocked(ordersRepository.findAll).mockResolvedValue(allOrders as never);

    const result = await ordersService.getAllOrders();

    expect(ordersRepository.findAll).toHaveBeenCalled();
    expect(result).toEqual(allOrders);
  });
});

describe('OrdersService.getRecentStatusHistory', () => {
  it('يعيد سجل التدقيق العام عبر findAllStatusHistory بحد افتراضي 50', async () => {
    await ordersService.getRecentStatusHistory();

    expect(ordersRepository.findAllStatusHistory).toHaveBeenCalledWith(50);
  });

  it('يحترم حداً مخصَّصاً عند تمريره', async () => {
    await ordersService.getRecentStatusHistory(10);

    expect(ordersRepository.findAllStatusHistory).toHaveBeenCalledWith(10);
  });
});
