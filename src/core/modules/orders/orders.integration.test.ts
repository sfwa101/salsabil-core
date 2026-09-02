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
