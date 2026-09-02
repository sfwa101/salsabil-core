// src/core/modules/orders/orders.integration.test.ts
// اختبار تكامل يعمل ضد Supabase الحقيقي (.env.local) — لا Mocks لقاعدة البيانات.
// ينظّف كل بياناته في afterAll (الطلب، السلة، المستخدم التجريبي إن أُنشئ فعلاً).

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import { catalogRepository } from '../catalog/catalog.repository';
import { cartService } from '../cart/cart.service';
import { ordersService } from './orders.service';

describe('Orders/Checkout integration (Supabase حقيقي)', () => {
  let productId: string;
  let tenantId: string | null;
  const testPhone = `0109${Math.floor(1000000 + Math.random() * 8999999)}`;
  let createdOrderId: string | undefined;
  let createdUserId: string | undefined;
  const cartIdsToClean: string[] = [];

  beforeAll(async () => {
    const product = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!product) throw new Error('منتج الاختبار "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    productId = product.id;
    tenantId = product.tenantId;
    if (!tenantId) throw new Error('المنتج التجريبي غير مرتبط بتاجر — لا يمكن اختبار Checkout');

    await supabaseAdmin.from('inventory').upsert({ product_id: productId, quantity_available: 10 }, { onConflict: 'product_id' });
  });

  afterAll(async () => {
    if (createdOrderId) {
      await supabaseAdmin.from('orders').delete().eq('id', createdOrderId); // order_items تُحذف تلقائياً (cascade)
    }
    for (const cartId of cartIdsToClean) {
      await supabaseAdmin.from('carts').delete().eq('id', cartId);
    }
    if (createdUserId) {
      await supabaseAdmin.from('users').delete().eq('id', createdUserId);
    }
    await supabaseAdmin.from('inventory').update({ quantity_available: 10 }).eq('product_id', productId);
  });

  it('يحوّل سلة حقيقية إلى طلب PENDING بسعر مجمَّد صحيح، وينشئ مستخدماً جديداً بالهاتف، ويُفرغ السلة', async () => {
    const sessionToken = randomUUID();
    const cart = await cartService.getOrCreateCart({ sessionToken });
    cartIdsToClean.push(cart.id);
    await cartService.addItem(cart.id, { productId, quantity: 1, selection: { sizeId: 'small' } });

    const order = await ordersService.checkout({
      identity: { sessionToken },
      customerName: 'زبون اختبار CHECKOUT-001',
      customerPhone: testPhone,
      deliveryAddress: { line1: 'شارع الاختبار', city: 'القاهرة' },
    });
    createdOrderId = order.id;
    createdUserId = order.userId;

    expect(order.total).toBe(100);
    expect(order.tenantId).toBe(tenantId);
    expect(order.status).toBe('pending');
    expect(order.paymentMethod).toBe('cash_on_delivery');

    const { items } = (await ordersService.getOrderWithItems(order.id))!;
    expect(items).toHaveLength(1);
    expect(items[0].unitPriceSnapshot).toBe(100);

    const summaryAfter = await cartService.getSummary(cart.id);
    expect(summaryAfter.lines).toHaveLength(0); // السلة أُفرغت بعد نجاح الطلب
  });

  it('ترفض Checkout عند نفاد المخزون الحقيقي بين الإضافة للسلة والتنفيذ', async () => {
    const sessionToken = randomUUID();
    const cart = await cartService.getOrCreateCart({ sessionToken });
    cartIdsToClean.push(cart.id);
    await cartService.addItem(cart.id, { productId, quantity: 1, selection: { sizeId: 'small' } });

    // ينفد المخزون فعلياً في قاعدة البيانات بعد الإضافة للسلة، قبل تنفيذ الطلب
    await supabaseAdmin.from('inventory').update({ quantity_available: 0 }).eq('product_id', productId);

    await expect(
      ordersService.checkout({
        identity: { sessionToken },
        customerName: 'زبون اختبار آخر',
        customerPhone: `0108${Math.floor(1000000 + Math.random() * 8999999)}`,
        deliveryAddress: { line1: 'شارع آخر', city: 'الجيزة' },
      })
    ).rejects.toThrow(/غير متوفرة في المخزون/);
  });
});

describe('Orders lifecycle integration (Supabase حقيقي، اليوم 9)', () => {
  let productId: string;
  const orderIdsToClean: string[] = [];
  const userIdsToClean: string[] = [];
  const cartIdsToClean: string[] = [];

  beforeAll(async () => {
    const product = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!product) throw new Error('منتج الاختبار "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    productId = product.id;
    await supabaseAdmin.from('inventory').upsert({ product_id: productId, quantity_available: 10 }, { onConflict: 'product_id' });
  });

  afterAll(async () => {
    for (const orderId of orderIdsToClean) {
      await supabaseAdmin.from('orders').delete().eq('id', orderId); // order_status_history تُحذف تلقائياً (cascade)
    }
    for (const cartId of cartIdsToClean) {
      await supabaseAdmin.from('carts').delete().eq('id', cartId);
    }
    for (const userId of userIdsToClean) {
      await supabaseAdmin.from('users').delete().eq('id', userId);
    }
    await supabaseAdmin.from('inventory').update({ quantity_available: 10 }).eq('product_id', productId);
  });

  async function createTestOrder() {
    const sessionToken = randomUUID();
    const cart = await cartService.getOrCreateCart({ sessionToken });
    cartIdsToClean.push(cart.id);
    await cartService.addItem(cart.id, { productId, quantity: 1, selection: { sizeId: 'small' } });
    const order = await ordersService.checkout({
      identity: { sessionToken },
      customerName: 'زبون دورة الحياة',
      customerPhone: `0107${Math.floor(1000000 + Math.random() * 8999999)}`,
      deliveryAddress: { line1: 'شارع دورة الحياة', city: 'القاهرة' },
    });
    orderIdsToClean.push(order.id);
    userIdsToClean.push(order.userId);
    return order;
  }

  it('يسجّل قيد السجل الابتدائي (pending) تلقائياً عند Checkout', async () => {
    const order = await createTestOrder();

    const history = await ordersService.getStatusHistory(order.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ fromStatus: null, toStatus: 'pending', actorRole: 'system' });
  });

  it(
    'ينفّذ دورة الحياة الكاملة PENDING → CONFIRMED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED ضد قاعدة البيانات الحقيقية، ويبني سجلاً كاملاً ومتسلسلاً',
    async () => {
      const order = await createTestOrder();
      const path: Array<Parameters<typeof ordersService.transitionStatus>[0]['toStatus']> = [
        'confirmed',
        'preparing',
        'ready',
        'out_for_delivery',
        'delivered',
      ];

      for (const toStatus of path) {
        const updated = await ordersService.transitionStatus({ orderId: order.id, toStatus, actorRole: 'merchant_owner' });
        expect(updated.status).toBe(toStatus);
      }

      const finalOrder = await ordersService.getOrderWithItems(order.id);
      expect(finalOrder!.order.status).toBe('delivered');

      const history = await ordersService.getStatusHistory(order.id);
      expect(history.map((h) => h.toStatus)).toEqual(['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']);
      expect(history.map((h) => h.fromStatus)).toEqual([null, 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);
      expect(history.every((h) => h.actorRole === 'system' || h.actorRole === 'merchant_owner')).toBe(true);
    },
    20000 // 6 عمليات شبكية متسلسلة ضد Supabase حقيقي (checkout + 5 انتقالات) — تتجاوز مهلة 5 ثوانٍ الافتراضية
  );

  it(
    'ترفض حياً انتقالاً من حالة نهائية (delivered → cancelled) — CHECK constraint + منطق التطبيق متطابقان',
    async () => {
      const order = await createTestOrder();
      await ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'merchant_owner' });
      // نمر بأقصر مسار ممكن إلى delivered عبر الحالات الوسيطة (لا قفز مسموح)
      for (const toStatus of ['preparing', 'ready', 'out_for_delivery', 'delivered'] as const) {
        await ordersService.transitionStatus({ orderId: order.id, toStatus, actorRole: 'merchant_owner' });
      }

      await expect(
        ordersService.transitionStatus({ orderId: order.id, toStatus: 'cancelled', actorRole: 'platform_admin' })
      ).rejects.toThrow(/لا يمكن الانتقال/);
    },
    20000
  );

  it('ترفض حياً فاعلاً غير مخوَّل (customer)، ولا تُنشئ قيد سجل جديداً', async () => {
    const order = await createTestOrder();
    const historyBefore = await ordersService.getStatusHistory(order.id);

    await expect(
      ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'customer' })
    ).rejects.toThrow(/غير مخوَّل/);

    const historyAfter = await ordersService.getStatusHistory(order.id);
    expect(historyAfter).toHaveLength(historyBefore.length);
  });

  it('ينجح الإلغاء من preparing، حالة نهائية لا مزيد من الانتقالات بعدها', async () => {
    const order = await createTestOrder();
    await ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'merchant_owner' });
    await ordersService.transitionStatus({ orderId: order.id, toStatus: 'preparing', actorRole: 'merchant_owner' });

    const cancelled = await ordersService.transitionStatus({ orderId: order.id, toStatus: 'cancelled', actorRole: 'merchant_owner' });
    expect(cancelled.status).toBe('cancelled');

    await expect(
      ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'merchant_owner' })
    ).rejects.toThrow(/لا يمكن الانتقال/);
  });
});
