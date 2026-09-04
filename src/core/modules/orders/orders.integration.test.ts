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
  // اليوم 21 (ADR-019): مصفوفات لا متغيرات مفردة — هذا الوصف يحتوي الآن أكثر من اختبار ينشئ
  // طلباً/مستخدماً، ومتغير مفرد يُعاد تعيينه في كل اختبار كان سيُسرِّب بيانات الاختبار الأول
  // بصمت (afterAll يعمل مرة واحدة فقط بعد كل الاختبارات، لا بعد كل واحد على حدة).
  const orderIdsToClean: string[] = [];
  const userIdsToClean: string[] = [];
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
    for (const orderId of orderIdsToClean) {
      await supabaseAdmin.from('orders').delete().eq('id', orderId); // order_items تُحذف تلقائياً (cascade)
    }
    for (const cartId of cartIdsToClean) {
      await supabaseAdmin.from('carts').delete().eq('id', cartId);
    }
    for (const userId of userIdsToClean) {
      // اليوم 21 (ADR-019): checkout ينشئ الآن شخصية فردية أيضاً (user_personas.user_id بلا
      // on delete cascade) — يجب حذفها أولاً، وإلا يفشل حذف users بقيد FK (23503) بصمت (لا خطأ
      // مُتحقَّق منه هنا أصلاً، فيبقى المستخدم/الشخصية متسرّبين للأبد دون أي فشل ظاهر في الاختبار).
      await supabaseAdmin.from('user_personas').delete().eq('user_id', userId);
      await supabaseAdmin.from('users').delete().eq('id', userId);
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
    orderIdsToClean.push(order.id);
    userIdsToClean.push(order.userId);

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

  // اليوم 21 (ADR-019) — يثبت حياً أن Checkout الحقيقي (لا استدعاء khalilService منعزل) ينشئ
  // user + شخصية فردية معاً على نفس قاعدة البيانات، لا نظرياً فقط
  it('ينشئ Checkout حقيقي شخصية افتراضية في عالم individuals لنفس المستخدم الجديد', async () => {
    const sessionToken = randomUUID();
    const cart = await cartService.getOrCreateCart({ sessionToken });
    cartIdsToClean.push(cart.id);
    await cartService.addItem(cart.id, { productId, quantity: 1, selection: { sizeId: 'small' } });

    const personaPhone = `0109${Math.floor(1000000 + Math.random() * 8999999)}`;
    const order = await ordersService.checkout({
      identity: { sessionToken },
      customerName: 'زبون اختبار الشخصية',
      customerPhone: personaPhone,
      deliveryAddress: { line1: 'شارع اختبار الشخصية', city: 'القاهرة' },
    });
    orderIdsToClean.push(order.id);
    userIdsToClean.push(order.userId);

    const { data: world, error: worldError } = await supabaseAdmin.from('worlds').select('id').eq('slug', 'individuals').single();
    if (worldError) throw worldError;

    const { data: persona, error: personaError } = await supabaseAdmin
      .from('user_personas')
      .select('*')
      .eq('user_id', order.userId)
      .eq('world_id', world.id)
      .maybeSingle();
    if (personaError) throw personaError;

    expect(persona).not.toBeNull();
    expect(persona!.is_default).toBe(true);

    // idempotency حية: خليل نفسه يمنع التكرار (الفهرس الجزئي، ADR-018) — Checkout ثانٍ بنفس
    // الهاتف يجب ألا يُنشئ شخصية ثانية ولا يفشل
    const secondSessionToken = randomUUID();
    const secondCart = await cartService.getOrCreateCart({ sessionToken: secondSessionToken });
    cartIdsToClean.push(secondCart.id);
    await cartService.addItem(secondCart.id, { productId, quantity: 1, selection: { sizeId: 'small' } });
    const secondOrder = await ordersService.checkout({
      identity: { sessionToken: secondSessionToken },
      customerName: 'زبون اختبار الشخصية',
      customerPhone: personaPhone, // نفس الهاتف — نفس المستخدم بالضبط
      deliveryAddress: { line1: 'شارع اختبار الشخصية', city: 'القاهرة' },
    });
    orderIdsToClean.push(secondOrder.id);
    expect(secondOrder.userId).toBe(order.userId); // نفس المستخدم، لا مستخدم مكرَّر

    const { data: personasAfterSecond, error: countError } = await supabaseAdmin
      .from('user_personas')
      .select('id')
      .eq('user_id', order.userId)
      .eq('world_id', world.id);
    if (countError) throw countError;
    expect(personasAfterSecond).toHaveLength(1); // لا تكرار
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
  let tenantId: string;
  const orderIdsToClean: string[] = [];
  const userIdsToClean: string[] = [];
  const cartIdsToClean: string[] = [];

  beforeAll(async () => {
    const product = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!product) throw new Error('منتج الاختبار "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    productId = product.id;
    if (!product.tenantId) throw new Error('المنتج التجريبي غير مرتبط بتاجر');
    tenantId = product.tenantId;
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
      // نفس ملاحظة الوصف أعلاه (ADR-019) — user_personas قبل users دائماً.
      await supabaseAdmin.from('user_personas').delete().eq('user_id', userId);
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
        const updated = await ordersService.transitionStatus({ orderId: order.id, toStatus, actorRole: 'merchant_owner', tenantId });
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
      await ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'merchant_owner', tenantId });
      // نمر بأقصر مسار ممكن إلى delivered عبر الحالات الوسيطة (لا قفز مسموح)
      for (const toStatus of ['preparing', 'ready', 'out_for_delivery', 'delivered'] as const) {
        await ordersService.transitionStatus({ orderId: order.id, toStatus, actorRole: 'merchant_owner', tenantId });
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
    await ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'merchant_owner', tenantId });
    await ordersService.transitionStatus({ orderId: order.id, toStatus: 'preparing', actorRole: 'merchant_owner', tenantId });

    const cancelled = await ordersService.transitionStatus({ orderId: order.id, toStatus: 'cancelled', actorRole: 'merchant_owner', tenantId });
    expect(cancelled.status).toBe('cancelled');

    await expect(
      ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'merchant_owner', tenantId })
    ).rejects.toThrow(/لا يمكن الانتقال/);
  });

  it('ترفض حياً تاجراً يحاول تغيير حالة طلب تاجر آخر (عزل المستأجرين، اليوم 10)', async () => {
    const order = await createTestOrder();

    await expect(
      ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'merchant_owner', tenantId: randomUUID() })
    ).rejects.toThrow(/لا يخص تاجرك/);
  });

  it('getOrdersForTenant يعيد طلبات هذا التاجر فقط ضمن نتائج حقيقية من قاعدة البيانات', async () => {
    const order = await createTestOrder();

    const orders = await ordersService.getOrdersForTenant(tenantId);

    expect(orders.some((o) => o.id === order.id)).toBe(true);
    expect(orders.every((o) => o.tenantId === tenantId)).toBe(true);
  });
});
