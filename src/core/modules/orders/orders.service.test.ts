// src/core/modules/orders/orders.service.test.ts
// اختبارات وحدة — تُموّه فقط طبقة الوصول لقاعدة البيانات (*.repository.ts)؛
// منطق catalogService (calculatePrice/validateSelection) وcartService الحقيقيان يعملان بلا تمويه
//
// TASK-13 — checkout() لم يعد يكتب في orders/order_items (orders.repository.ts القديم، مُستخدَم
// الآن فقط من getMostOrderedProductIds غير المُختبَرة هنا) بل في customer_orders/merchant_suborders
// عبر customerOrder.repository.ts الجديد. اختبار "يرفض عند تعدد التجار" (ADR-009 القديم) تحوَّل هنا
// إلى مجموعة اختبارات "ينجح ويُقسِّم" — بوابة الإغلاق المذكورة صراحة في خطة التنفيذ الرئيسية.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Product } from '../catalog/types';
import type { Cart, CartItem } from '../cart/types';
import type { User } from '../../kernel/khalil/types';
import type { Merchant } from '../merchant/types';
import type { Order } from './types';

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

const soap: Product = {
  id: 'prod-soap',
  categoryId: 'cat-2',
  tenantId: 'tenant-c',
  name: 'منظف اختبار',
  basePrice: 30,
  unit: 'piece',
  options: [],
  isActive: true,
  createdAt: new Date().toISOString(),
};

const products: Record<string, Product> = { [chicken.id]: chicken, [fish.id]: fish, [soap.id]: soap };

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

// TASK-13 — orders.repository.ts (القديم) لم يعد يُستهلَك من checkout()/transitionStatus/الخ —
// يبقى مستورَداً فقط لـgetMostOrderedProductIds (ميزة توصية منفصلة، غير مُختبَرة هنا). مموَّه
// بحد أدنى لمنع أي محاولة اتصال Supabase حقيقي لو استُدعيت الدالة صدفة.
vi.mock('./orders.repository', () => ({
  ordersRepository: {
    findMostOrderedProductIds: vi.fn(async () => []),
  },
}));

const defaultDeliveryAddress = { line1: 'شارع 1', city: 'القاهرة' };

// customer_orders.id ثابت هنا عمداً — كل اختبار Checkout في هذا الملف يبدأ سلة/طلباً جديداً
// (beforeEach يُصفّر الـmocks)، فلا تعارض بين اختبارات مختلفة رغم ثبات القيمة.
const customerOrderId = 'customer-order-1';

vi.mock('./customerOrder.repository', () => ({
  customerOrderRepository: {
    createCustomerOrder: vi.fn(async (input) => ({
      id: customerOrderId,
      userId: input.userId,
      deliveryAddress: input.deliveryAddress,
      paymentMethod: input.paymentMethod,
      subtotalSnapshot: input.subtotalSnapshot,
      deliveryFeeSnapshot: input.deliveryFeeSnapshot,
      totalSnapshot: input.totalSnapshot,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    deleteCustomerOrder: vi.fn(async () => undefined),
    // معرّف حتمي حسب tenantId — يسهّل تتبّع/تمييز كل suborder في تأكيدات الاختبار (isolation)
    createMerchantSuborder: vi.fn(async (input) => ({
      id: `suborder-${input.tenantId}`,
      customerOrderId: input.customerOrderId,
      userId: input.userId,
      tenantId: input.tenantId,
      status: 'pending',
      paymentMethod: input.paymentMethod,
      deliveryAddress: defaultDeliveryAddress,
      total: input.total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    deleteMerchantSuborder: vi.fn(async () => undefined),
    createMerchantSuborderItems: vi.fn(async () => []),
    findOrderById: vi.fn(),
    findOrderItems: vi.fn(),
    findOrdersByCustomerOrderId: vi.fn(async () => []),
    findCustomerOrderById: vi.fn(async () => null),
    findOrdersByTenantId: vi.fn(async () => []),
    findAll: vi.fn(async () => []),
    updateOrderStatus: vi.fn(),
    insertStatusHistory: vi.fn(async () => ({})),
    findStatusHistory: vi.fn(async () => []),
    findAllStatusHistory: vi.fn(async () => []),
  },
}));

// merchants.default_settlement_model — كل تاجر NULL افتراضياً هنا (وضع كل التجار الحقيقيين فعلياً
// بعد TASK-12) لاختبار الافتراض الصريح 'reef_collected' (قرار مؤسس، §7.3). اختبار مخصَّص أدناه
// يُثبت أن قيمة صريحة (driver_fronted) تُمرَّر كما هي، بلا استبدال.
const merchantA: Merchant = {
  id: 'tenant-a',
  ownerId: 'owner-a',
  businessName: 'تاجر أ',
  phone: '01000000001',
  slug: 'tenant-a',
  commissionRate: 10,
  isActive: true,
  createdAt: new Date().toISOString(),
  defaultSettlementModel: null,
};
const merchantB: Merchant = { ...merchantA, id: 'tenant-b', slug: 'tenant-b', businessName: 'تاجر ب' };
const merchantC: Merchant = { ...merchantA, id: 'tenant-c', slug: 'tenant-c', businessName: 'تاجر ج' };
const merchantsById: Record<string, Merchant> = { [merchantA.id]: merchantA, [merchantB.id]: merchantB, [merchantC.id]: merchantC };

vi.mock('../merchant/merchant.service', () => ({
  merchantService: {
    getByIds: vi.fn(async (ids: string[]) => ids.map((id) => merchantsById[id]).filter((m): m is Merchant => !!m)),
  },
}));

const { ordersService } = await import('./orders.service');
const { cartRepository } = await import('../cart/cart.repository');
const { customerOrderRepository } = await import('./customerOrder.repository');
const { khalilRepository } = await import('../../kernel/khalil/khalil.repository');
const { merchantService } = await import('../merchant/merchant.service');

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
  deliveryAddress: defaultDeliveryAddress,
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
    expect(customerOrderRepository.createCustomerOrder).not.toHaveBeenCalled();
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
    expect(customerOrderRepository.createCustomerOrder).not.toHaveBeenCalled();
  });

  it('يستعيد (release) كل مخزون خُصم في نفس المحاولة عند فشل خطوة لاحقة (تعويض، بند 3)', async () => {
    const { inventoryRepository } = await import('../inventory/inventory.repository');
    mockCartItems([makeItem({ quantity: 2 })]);
    // ينجح خصم المخزون، ثم يفشل إنشاء customer_order نفسه (خطأ DB افتراضي) — يجب استرجاع الكمية
    vi.mocked(customerOrderRepository.createCustomerOrder).mockRejectedValueOnce(new Error('فشل DB افتراضي'));

    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/فشل DB افتراضي/);

    expect(inventoryRepository.decrementIfAvailable).toHaveBeenCalledWith(chicken.id, 2);
    expect(inventoryRepository.restore).toHaveBeenCalledWith(chicken.id, 2);
    expect(customerOrderRepository.createMerchantSuborder).not.toHaveBeenCalled();
  });

  it('ينجح: يُنشئ الطلب بسعر مجمَّد مطابق للسعر المحسوب حياً، وينشئ مستخدماً جديداً، ويُفرغ السلة (سلة أحادية التاجر — بلا تغيير سلوك)', async () => {
    mockCartItems([makeItem({ quantity: 2, selection: { sizeId: 'small' } })]);

    const order = await ordersService.checkout(checkoutInput);

    expect(order.total).toBe(200); // (120 - 20) * 2
    expect(order.tenantId).toBe('tenant-a');
    expect(order.customerOrderId).toBe(customerOrderId);
    expect(khalilRepository.createUser).toHaveBeenCalledWith({
      fullName: 'زبون اختبار',
      phone: '01099999999',
      role: 'customer',
    });
    expect(customerOrderRepository.createCustomerOrder).toHaveBeenCalledWith(
      expect.objectContaining({ subtotalSnapshot: 200, deliveryFeeSnapshot: 0, totalSnapshot: 200 })
    );
    expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledTimes(1);
    expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a', total: 200, settlementModel: 'reef_collected' })
    );
    expect(customerOrderRepository.createMerchantSuborderItems).toHaveBeenCalledWith(
      'suborder-tenant-a',
      expect.arrayContaining([expect.objectContaining({ unitPriceSnapshot: 100, quantity: 2 })])
    );
    expect(cartRepository.deleteItem).toHaveBeenCalledWith('item-1');
    expect(customerOrderRepository.insertStatusHistory).toHaveBeenCalledWith({
      orderId: 'suborder-tenant-a',
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

  // ==========================================================================
  // TASK-13 — بوابة الإغلاق: تحويل ADR-009 (رفض تعدد التجار) إلى تقسيم حقيقي حسب tenant_id
  // ==========================================================================

  it('ينجح عند سلة بتاجرين: customer_order واحد + merchant_suborder لكل تاجر، ببنود معزولة تماماً (لا تسريب بين التاجرين)', async () => {
    mockCartItems([
      makeItem({ id: 'a', productId: chicken.id, quantity: 2, selection: { sizeId: 'small' } }), // tenant-a، 200
      makeItem({ id: 'b', productId: fish.id, quantity: 3, selection: {} }), // tenant-b، 150
    ]);

    const order = await ordersService.checkout(checkoutInput);

    // customer_order واحد فقط، بمجموع الكل (350)
    expect(customerOrderRepository.createCustomerOrder).toHaveBeenCalledTimes(1);
    expect(customerOrderRepository.createCustomerOrder).toHaveBeenCalledWith(
      expect.objectContaining({ subtotalSnapshot: 350, totalSnapshot: 350 })
    );

    // اثنتان merchant_suborder بالضبط، كل واحدة بإجمالي تاجرها فقط
    expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledTimes(2);
    expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a', total: 200, customerOrderId })
    );
    expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-b', total: 150, customerOrderId })
    );

    // عزل البنود — اختبار حرج: بند تاجر أ لا يظهر إطلاقاً في استدعاء إنشاء بنود تاجر ب، والعكس
    expect(customerOrderRepository.createMerchantSuborderItems).toHaveBeenCalledWith(
      'suborder-tenant-a',
      [expect.objectContaining({ productId: chicken.id, quantity: 2, unitPriceSnapshot: 100 })]
    );
    expect(customerOrderRepository.createMerchantSuborderItems).toHaveBeenCalledWith(
      'suborder-tenant-b',
      [expect.objectContaining({ productId: fish.id, quantity: 3, unitPriceSnapshot: 50 })]
    );

    // الطلب المُعاد (الأساسي) هو أول suborder أُنشئت — تاجر أ (أول بند في السلة)
    expect(order.tenantId).toBe('tenant-a');
    expect(order.customerOrderId).toBe(customerOrderId);

    // مخزون كل بند خُصم مرة واحدة فقط، عبر التاجرين معاً
    const { inventoryRepository } = await import('../inventory/inventory.repository');
    expect(inventoryRepository.decrementIfAvailable).toHaveBeenCalledWith(chicken.id, 2);
    expect(inventoryRepository.decrementIfAvailable).toHaveBeenCalledWith(fish.id, 3);
  });

  it('ينجح عند سلة بثلاثة تجار من فئات مختلفة (لحوم/أسماك/منظفات — سيناريو الإطلاق الحقيقي): ثلاث merchant_suborder معزولة تماماً', async () => {
    mockCartItems([
      makeItem({ id: 'a', productId: chicken.id, quantity: 1, selection: { sizeId: 'small' } }), // tenant-a، 100
      makeItem({ id: 'b', productId: fish.id, quantity: 1, selection: {} }), // tenant-b، 50
      makeItem({ id: 'c', productId: soap.id, quantity: 2, selection: {} }), // tenant-c، 60
    ]);

    await ordersService.checkout(checkoutInput);

    expect(customerOrderRepository.createCustomerOrder).toHaveBeenCalledWith(
      expect.objectContaining({ subtotalSnapshot: 210, totalSnapshot: 210 })
    );
    expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledTimes(3);
    for (const [tenantId, total] of [
      ['tenant-a', 100],
      ['tenant-b', 50],
      ['tenant-c', 60],
    ] as const) {
      expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledWith(expect.objectContaining({ tenantId, total }));
    }

    // عزل تام لكل تاجر — كل استدعاء إنشاء بنود يحمل بند تاجره فقط
    expect(customerOrderRepository.createMerchantSuborderItems).toHaveBeenCalledWith(
      'suborder-tenant-a',
      [expect.objectContaining({ productId: chicken.id })]
    );
    expect(customerOrderRepository.createMerchantSuborderItems).toHaveBeenCalledWith(
      'suborder-tenant-b',
      [expect.objectContaining({ productId: fish.id })]
    );
    expect(customerOrderRepository.createMerchantSuborderItems).toHaveBeenCalledWith(
      'suborder-tenant-c',
      [expect.objectContaining({ productId: soap.id })]
    );
  });

  it('يستخدم settlement_model الصريح للتاجر بدل الافتراض لو كان محدَّداً', async () => {
    merchantsById['tenant-a'] = { ...merchantA, defaultSettlementModel: 'driver_fronted' };
    mockCartItems([makeItem({ quantity: 1 })]);

    await ordersService.checkout(checkoutInput);

    expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a', settlementModel: 'driver_fronted' })
    );

    merchantsById['tenant-a'] = merchantA; // إعادة الحالة لبقية الاختبارات
  });

  it('يفترض reef_collected لتاجر لم يحدّد default_settlement_model بعد (NULL — قرار مؤسس صريح)', async () => {
    mockCartItems([makeItem({ quantity: 1 })]); // merchantA.defaultSettlementModel = null

    await ordersService.checkout(checkoutInput);

    expect(customerOrderRepository.createMerchantSuborder).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-a', settlementModel: 'reef_collected' })
    );
  });

  it('§3 حالة 4 (فشل ذرّي أثناء الإنشاء): فشل إنشاء بنود suborder الثانية بعد نجاح الأولى ينظّف كل شيء — الـsuborder الناجحة تُحذَف، customer_order يُحذَف، وكل مخزون التاجرين يُسترجَع', async () => {
    mockCartItems([
      makeItem({ id: 'a', productId: chicken.id, quantity: 2, selection: { sizeId: 'small' } }), // tenant-a — تنجح
      makeItem({ id: 'b', productId: fish.id, quantity: 3, selection: {} }), // tenant-b — بنودها تفشل
    ]);
    vi.mocked(customerOrderRepository.createMerchantSuborderItems).mockImplementation(async (suborderId) => {
      if (suborderId === 'suborder-tenant-b') throw new Error('فشل DB افتراضي عند إدراج بنود تاجر ب');
      return [];
    });

    await expect(ordersService.checkout(checkoutInput)).rejects.toThrow(/فشل DB افتراضي عند إدراج بنود تاجر ب/);

    // الـsuborder التي فشلت بنودها تُحذَف فوراً من داخل حلقة الإنشاء نفسها
    expect(customerOrderRepository.deleteMerchantSuborder).toHaveBeenCalledWith('suborder-tenant-b');
    // الـsuborder الناجحة (تاجر أ) تُحذَف أيضاً ضمن التعويض الشامل — لا يبقى نصف طلب معلَّق
    expect(customerOrderRepository.deleteMerchantSuborder).toHaveBeenCalledWith('suborder-tenant-a');
    // customer_order الأب يُحذَف كذلك
    expect(customerOrderRepository.deleteCustomerOrder).toHaveBeenCalledWith(customerOrderId);

    // مخزون كلا التاجرين يُسترجَع — لا فقط تاجر ب الذي فشل
    const { inventoryRepository } = await import('../inventory/inventory.repository');
    expect(inventoryRepository.restore).toHaveBeenCalledWith(chicken.id, 2);
    expect(inventoryRepository.restore).toHaveBeenCalledWith(fish.id, 3);

    // السلة لا تُفرَغ عند فشل Checkout بالكامل
    expect(cartRepository.deleteItem).not.toHaveBeenCalled();
  });
});

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerOrderId,
    userId: 'user-1',
    tenantId: 'tenant-a',
    status: 'pending',
    paymentMethod: 'cash_on_delivery',
    deliveryAddress: defaultDeliveryAddress,
    total: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('OrdersService.transitionStatus', () => {
  it('يرفض إذا كان الطلب غير موجود', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(null);

    await expect(
      ordersService.transitionStatus({ orderId: 'missing', toStatus: 'confirmed', actorRole: 'merchant_owner' })
    ).rejects.toThrow(/غير موجود/);
    expect(customerOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('يرفض انتقالاً غير مسموح في آلة الحالات (pending → delivered مباشرة)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }));

    await expect(
      ordersService.transitionStatus({ orderId: 'order-1', toStatus: 'delivered', actorRole: 'merchant_owner', tenantId: 'tenant-a' })
    ).rejects.toThrow(/لا يمكن الانتقال/);
    expect(customerOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('يرفض انتقالاً من حالة نهائية (delivered → أي شيء)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'delivered' }));

    await expect(
      ordersService.transitionStatus({ orderId: 'order-1', toStatus: 'cancelled', actorRole: 'platform_admin' })
    ).rejects.toThrow(/لا يمكن الانتقال/);
  });

  // TASK-13 — merchant_suborder_status_history يفرض CHECK جديد لم يكن موجوداً على
  // order_status_history القديم: note إلزامي عند to_status='cancelled' (§2.6/§10.1 بند 5 من
  // PHASE_2_DOMAIN_DESIGN.md). يُفحَص هنا في طبقة التطبيق قبل أي كتابة DB — راجع التعليق المرافق
  // في orders.service.ts.transitionStatus لشرح لماذا (حالة غير متسقة لو تُرك للقيد وحده).
  it('TASK-13: يرفض إلغاء طلب بلا سبب (note) صراحةً قبل أي كتابة DB', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }));

    await expect(
      ordersService.transitionStatus({ orderId: 'order-1', toStatus: 'cancelled', actorRole: 'merchant_owner', tenantId: 'tenant-a' })
    ).rejects.toThrow(/سبب الإلغاء/);
    expect(customerOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
    expect(customerOrderRepository.insertStatusHistory).not.toHaveBeenCalled();
  });

  it('يرفض فاعلاً غير مخوَّل (customer لا يملك حق تأكيد الطلب)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }));

    await expect(
      ordersService.transitionStatus({ orderId: 'order-1', toStatus: 'confirmed', actorRole: 'customer' })
    ).rejects.toThrow(/غير مخوَّل/);
    expect(customerOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('ينجح: pending → confirmed بفاعل تاجر مخوَّل يملك نفس tenantId، ويسجّل قيداً في السجل بالحالتين والفاعل', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }));
    vi.mocked(customerOrderRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'confirmed' }));

    const order = await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'confirmed',
      actorRole: 'merchant_owner',
      actorId: 'merchant-user-1',
      tenantId: 'tenant-a',
      note: 'تأكيد يدوي',
    });

    expect(order.status).toBe('confirmed');
    expect(customerOrderRepository.updateOrderStatus).toHaveBeenCalledWith('order-1', 'pending', 'confirmed');
    expect(customerOrderRepository.insertStatusHistory).toHaveBeenCalledWith({
      orderId: 'order-1',
      fromStatus: 'pending',
      toStatus: 'confirmed',
      actorRole: 'merchant_owner',
      actorId: 'merchant-user-1',
      note: 'تأكيد يدوي',
    });
  });

  it('ينجح: يمكن الإلغاء من preparing (وليس فقط من pending)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'preparing' }));
    vi.mocked(customerOrderRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'cancelled' }));
    vi.mocked(customerOrderRepository.findOrderItems).mockResolvedValue([]);

    const order = await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'cancelled',
      actorRole: 'platform_admin',
      note: 'نفاد مخزون',
    });

    expect(order.status).toBe('cancelled');
  });

  // TASK-08 — الإصلاح الأساسي: الانتقال إلى cancelled يجب أن يسترجع مخزون كل بند فعلياً عبر
  // InventoryService.release() الموجودة أصلاً (لا منطق استرجاع جديد)، لا أن يُترك المخزون محجوزاً.
  it('TASK-08: يسترجع مخزون كل بند من merchant_suborder_items عند الإلغاء (* → cancelled)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }));
    vi.mocked(customerOrderRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'cancelled' }));
    vi.mocked(customerOrderRepository.findOrderItems).mockResolvedValue([
      { id: 'oi-1', orderId: 'order-1', productId: chicken.id, quantity: 2, selection: {}, unitPriceSnapshot: 100, createdAt: new Date().toISOString() },
      { id: 'oi-2', orderId: 'order-1', productId: fish.id, quantity: 3, selection: {}, unitPriceSnapshot: 50, createdAt: new Date().toISOString() },
    ]);
    const { inventoryRepository } = await import('../inventory/inventory.repository');

    const order = await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'cancelled',
      actorRole: 'merchant_owner',
      tenantId: 'tenant-a',
      note: 'نفاد مخزون',
    });

    expect(order.status).toBe('cancelled');
    expect(inventoryRepository.restore).toHaveBeenCalledWith(chicken.id, 2);
    expect(inventoryRepository.restore).toHaveBeenCalledWith(fish.id, 3);
  });

  // TASK-08، §4 — الانتقال إلى cancelled لا يستدعي أي استرجاع لطلب لم يُلغَ (تحقّق سلبي: لا استرجاع
  // مخزون غير مبرَّر عند انتقالات أخرى غير الإلغاء).
  it('TASK-08: لا يستدعي استرجاع المخزون عند انتقال غير الإلغاء', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }));
    vi.mocked(customerOrderRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'confirmed' }));
    const { inventoryRepository } = await import('../inventory/inventory.repository');

    await ordersService.transitionStatus({
      orderId: 'order-1',
      toStatus: 'confirmed',
      actorRole: 'merchant_owner',
      tenantId: 'tenant-a',
    });

    expect(customerOrderRepository.findOrderItems).not.toHaveBeenCalled();
    expect(inventoryRepository.restore).not.toHaveBeenCalled();
  });

  // TASK-08، §4 — التحقق من الحالة الحرجة "استرجاع مضاعف": قفل orders.repository.ts التفاؤلي
  // (updateOrderStatus يعيد null عند تعارض) يجب أن يمنع تنفيذ الانتقال + الاسترجاع، لا فقط يفشل
  // بصمت — استدعاء transitionStatus عندما يُغيّر طرف آخر الحالة فعلياً بين القراءة والكتابة (محاكى
  // هنا بجعل updateOrderStatus يعيد null، وهو ما تعيده هذه الدالة فعلياً عند فشل القفل التفاؤلي حياً).
  it('TASK-08: يرفض الانتقال ولا يسترجع مخزوناً عند تعارض تزامن (updateOrderStatus يعيد null)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }));
    vi.mocked(customerOrderRepository.updateOrderStatus).mockResolvedValue(null);
    const { inventoryRepository } = await import('../inventory/inventory.repository');

    await expect(
      ordersService.transitionStatus({
        orderId: 'order-1',
        toStatus: 'cancelled',
        actorRole: 'merchant_owner',
        tenantId: 'tenant-a',
        note: 'نفاد مخزون',
      })
    ).rejects.toThrow(/تعارض تزامن/);

    expect(customerOrderRepository.insertStatusHistory).not.toHaveBeenCalled();
    expect(customerOrderRepository.findOrderItems).not.toHaveBeenCalled();
    expect(inventoryRepository.restore).not.toHaveBeenCalled();
  });

  it('يرفض تاجراً يحاول تغيير حالة طلب تاجر آخر (عزل المستأجرين، اليوم 10)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' })); // tenant-a

    await expect(
      ordersService.transitionStatus({
        orderId: 'order-1',
        toStatus: 'confirmed',
        actorRole: 'merchant_owner',
        actorId: 'merchant-user-2',
        tenantId: 'tenant-b', // تاجر مختلف
      })
    ).rejects.toThrow(/لا يخص تاجرك/);
    expect(customerOrderRepository.updateOrderStatus).not.toHaveBeenCalled();
  });

  it('لا يفرض تطابق tenantId على platform_admin (يرى/يُغيّر كل شيء)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'pending' }));
    vi.mocked(customerOrderRepository.updateOrderStatus).mockResolvedValue(makeOrder({ status: 'confirmed' }));

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
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }));

    await expect(
      ordersService.getOrderWithItems({ role: 'merchant_owner', tenantId: 'tenant-b' }, 'order-1')
    ).rejects.toThrow(/لا يخص تاجرك/);
    expect(customerOrderRepository.findOrderItems).not.toHaveBeenCalled();
  });

  it('يسمح لفاعل التاجر الصحيح (نفس tenantId الطلب)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }));
    vi.mocked(customerOrderRepository.findOrderItems).mockResolvedValue([]);

    const result = await ordersService.getOrderWithItems({ role: 'merchant_owner', tenantId: 'tenant-a' }, 'order-1');
    expect(result!.order.status).toBe('confirmed');
  });

  it('يسمح لـplatform_admin بلا حاجة لمطابقة tenantId إطلاقاً', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }));
    vi.mocked(customerOrderRepository.findOrderItems).mockResolvedValue([]);

    const result = await ordersService.getOrderWithItems({ role: 'platform_admin' }, 'order-1');
    expect(result!.order.status).toBe('confirmed');
  });

  it('يعيد null لطلب غير موجود قبل أي فحص تخويل', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(null);
    const result = await ordersService.getOrderWithItems({ role: 'merchant_owner', tenantId: 'tenant-b' }, 'missing');
    expect(result).toBeNull();
  });
});

describe('OrdersService.getStatusHistory (بند 4 — عزل المستأجرين على القراءة)', () => {
  it('يرفض فاعل تاجر لا يخص طلبه', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }));

    await expect(
      ordersService.getStatusHistory({ role: 'merchant_owner', tenantId: 'tenant-b' }, 'order-1')
    ).rejects.toThrow(/لا يخص تاجرك/);
    expect(customerOrderRepository.findStatusHistory).not.toHaveBeenCalled();
  });

  it('يرمي خطأ صريحاً لطلب غير موجود (لا مصفوفة فارغة صامتة)', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(null);
    await expect(ordersService.getStatusHistory({ role: 'platform_admin' }, 'missing')).rejects.toThrow(/غير موجود/);
  });

  it('يسمح لفاعل التاجر الصحيح ويعيد السجل', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(makeOrder({ status: 'confirmed' }));
    vi.mocked(customerOrderRepository.findStatusHistory).mockResolvedValue([]);

    const result = await ordersService.getStatusHistory({ role: 'merchant_owner', tenantId: 'tenant-a' }, 'order-1');
    expect(result).toEqual([]);
  });
});

describe('OrdersService.getOrderForCustomerView', () => {
  it('يعيد null لطلب غير موجود بلا محاولة جلب بنود', async () => {
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(null);

    const result = await ordersService.getOrderForCustomerView('missing');

    expect(result).toBeNull();
    expect(customerOrderRepository.findOrderItems).not.toHaveBeenCalled();
  });

  it('يُثري كل بند باسم المنتج الحقيقي عبر catalogService (سلة تاجر واحد)', async () => {
    const order = makeOrder({ status: 'confirmed' });
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(order);
    vi.mocked(customerOrderRepository.findOrdersByCustomerOrderId).mockResolvedValue([order]);
    vi.mocked(customerOrderRepository.findOrderItems).mockResolvedValue([
      { id: 'oi-1', orderId: 'order-1', productId: chicken.id, quantity: 2, selection: { sizeId: 'small' }, unitPriceSnapshot: 100, createdAt: new Date().toISOString() },
    ]);

    const result = await ordersService.getOrderForCustomerView('order-1');

    expect(result!.suborders).toHaveLength(1);
    expect(result!.suborders[0].items[0].productName).toBe('دجاجة اختبار');
    expect(result!.suborders[0].items[0].item.unitPriceSnapshot).toBe(100);
    expect(result!.grandTotal).toBe(order.total);
  });

  it('يعيد productName: null لو حُذف المنتج (لا يفشل الاستعلام)', async () => {
    const order = makeOrder({ status: 'confirmed' });
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(order);
    vi.mocked(customerOrderRepository.findOrdersByCustomerOrderId).mockResolvedValue([order]);
    vi.mocked(customerOrderRepository.findOrderItems).mockResolvedValue([
      { id: 'oi-1', orderId: 'order-1', productId: 'deleted-product', quantity: 1, selection: {}, unitPriceSnapshot: 50, createdAt: new Date().toISOString() },
    ]);

    const result = await ordersService.getOrderForCustomerView('order-1');

    expect(result!.suborders[0].items[0].productName).toBeNull();
  });

  // §31 بند 2 — يطابق سيناريو التحقق الحي الموثَّق في REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md
  // §17 (سلة بتاجرين، 11 + 12.75 = 23.75 جنيه) الذي كشف الفجوة أصلاً: قبل هذا الإصلاح كانت هذه
  // الدالة تعيد نصيب أول تاجر فقط (order/items مفردَين)، لا كل الإخوة معاً بإجمالي حقيقي شامل.
  it('يعيد كل merchant_suborders معاً بإجمالي كلي حقيقي لطلب متعدد التجار', async () => {
    const orderA = makeOrder({ id: 'order-a', tenantId: 'tenant-a', total: 11 });
    const orderB = makeOrder({ id: 'order-b', tenantId: 'tenant-b', total: 12.75 });
    vi.mocked(customerOrderRepository.findOrderById).mockResolvedValue(orderA);
    vi.mocked(customerOrderRepository.findOrdersByCustomerOrderId).mockResolvedValue([orderA, orderB]);
    vi.mocked(customerOrderRepository.findOrderItems).mockImplementation(async (suborderId: string) =>
      suborderId === 'order-a'
        ? [{ id: 'oi-a', orderId: 'order-a', productId: chicken.id, quantity: 1, selection: {}, unitPriceSnapshot: 11, createdAt: new Date().toISOString() }]
        : [{ id: 'oi-b', orderId: 'order-b', productId: fish.id, quantity: 1, selection: {}, unitPriceSnapshot: 12.75, createdAt: new Date().toISOString() }]
    );
    vi.mocked(customerOrderRepository.findCustomerOrderById).mockResolvedValue({
      id: customerOrderId,
      userId: testUser.id,
      deliveryAddress: defaultDeliveryAddress,
      paymentMethod: 'cash_on_delivery',
      subtotalSnapshot: 23.75,
      deliveryFeeSnapshot: 0,
      totalSnapshot: 23.75,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const result = await ordersService.getOrderForCustomerView('order-a');

    expect(result!.suborders).toHaveLength(2);
    expect(result!.suborders.map((s) => s.merchantName)).toEqual(['تاجر أ', 'تاجر ب']);
    expect(result!.grandTotal).toBe(23.75);
  });
});

describe('OrdersService.getOrdersForTenant', () => {
  it('يعيد طلبات التاجر المطلوب فقط عبر findOrdersByTenantId', async () => {
    const tenantOrders = [makeOrder({ status: 'pending' }), makeOrder({ status: 'confirmed' })];
    vi.mocked(customerOrderRepository.findOrdersByTenantId).mockResolvedValue(tenantOrders);

    const result = await ordersService.getOrdersForTenant('tenant-a');

    expect(customerOrderRepository.findOrdersByTenantId).toHaveBeenCalledWith('tenant-a');
    expect(result).toEqual(tenantOrders);
  });
});

describe('OrdersService.getAllOrders', () => {
  it('يعيد كل الطلبات بلا أي تصفية تاجر عبر findAll (اليوم 11، لوحة الإدارة)', async () => {
    const allOrders = [makeOrder({ status: 'pending' }), makeOrder({ status: 'delivered' })];
    vi.mocked(customerOrderRepository.findAll).mockResolvedValue(allOrders);

    const result = await ordersService.getAllOrders();

    expect(customerOrderRepository.findAll).toHaveBeenCalled();
    expect(result).toEqual(allOrders);
  });
});

describe('OrdersService.getRecentStatusHistory', () => {
  it('يعيد سجل التدقيق العام عبر findAllStatusHistory بحد افتراضي 50', async () => {
    await ordersService.getRecentStatusHistory();

    expect(customerOrderRepository.findAllStatusHistory).toHaveBeenCalledWith(50);
  });

  it('يحترم حداً مخصَّصاً عند تمريره', async () => {
    await ordersService.getRecentStatusHistory(10);

    expect(customerOrderRepository.findAllStatusHistory).toHaveBeenCalledWith(10);
  });
});

// TASK-13 — merchantService.getByIds مُموَّهة أعلاه؛ تأكيد سلبي أن الدالة الصحيحة استُهلكت
// (لا استيراد مباشر لـmerchant.repository.ts من orders.service.ts — يخالف dependency-cruiser).
describe('OrdersService.checkout — استهلاك merchantService', () => {
  it('يستدعي merchantService.getByIds بمعرّفات التجار المميّزة من السلة فقط', async () => {
    mockCartItems([
      makeItem({ id: 'a', productId: chicken.id }),
      makeItem({ id: 'b', productId: chicken.id, quantity: 1 }), // نفس التاجر مرتين
    ]);

    await ordersService.checkout(checkoutInput);

    expect(merchantService.getByIds).toHaveBeenCalledWith(['tenant-a']);
  });
});
