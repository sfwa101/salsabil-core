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
    // DD-011 — منتج مخصَّص لهذا الوصف بدل الاعتماد على صف "دجاجة كاملة طازجة" الحقيقي المشترك (كان
    // يسبِّب تعارضاً حقيقياً بين هذا الملف وadmin/cart.integration.test.ts — أحدها يُنزِل المخزون
    // إلى صفر عمداً بينما آخر يفترضه = 10). نفس خيارات/سعر المنتج المرجعي حرفياً — القيم المتوقَّعة
    // أدناه (100 جنيه، إلخ) لا تتغيَّر.
    const reference = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!reference) throw new Error('منتج مرجعي "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    if (!reference.tenantId) throw new Error('المنتج المرجعي غير مرتبط بتاجر — لا يمكن اختبار Checkout');
    tenantId = reference.tenantId;

    const { data: productRow, error } = await supabaseAdmin
      .from('products')
      .insert({
        category_id: reference.categoryId,
        tenant_id: reference.tenantId,
        name: `منتج اختبار Checkout — ${randomUUID().slice(0, 8)}`,
        base_price: reference.basePrice,
        unit: reference.unit,
        options: reference.options,
        is_active: true,
      })
      .select('*')
      .single();
    if (error) throw error;
    productId = productRow.id as string;

    await supabaseAdmin.from('inventory').insert({ product_id: productId, quantity_available: 10 });
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
    await supabaseAdmin.from('inventory').delete().eq('product_id', productId);
    await supabaseAdmin.from('products').delete().eq('id', productId);
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

    const { items } = (await ordersService.getOrderWithItems({ role: 'merchant_owner', tenantId: tenantId! }, order.id))!;
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

  // CRITICAL-FIXES-FROM-AUDIT-001، بند 1 — Idempotency: طلبان متزامنان فعليان (Promise.all) لنفس
  // السلة بالضبط يجب أن يُنتجا نفس الطلب (single-flight)، لا طلبين منفصلين.
  //
  // ⚠️ ملاحظة منهجية مهمة (اكتُشفت أثناء كتابة هذا الاختبار، لا افتراضاً مسبقاً): لو استُخدم رقم
  // هاتف جديد كلياً للعميلَين المتزامنين معاً، يظهر عطل مختلف تماماً — كلا الطلبين يجدان
  // "لا مستخدم بهذا الهاتف" فيحاولان إنشاء صف users بنفس الرقم معاً، فيفشل الخاسر بخطأ Postgres
  // خام (duplicate key value violates unique constraint "users_phone_key") بدل إنشاء طلب مكرَّر
  // — عطل حقيقي أيضاً (رسالة غير مفهومة للعميل) لكنه **ليس** سيناريو "طلبين مكرَّرين" المطلوب هنا.
  // لعزل سيناريو التكرار الحقيقي (عميل **موجود بالفعل**، وهو الحالة الأشيع عملياً) — يُنشأ
  // المستخدم أولاً بشكل متسلسل (سلة/طلب تمهيدي منفصل)، ثم يُطلَق التزامن الفعلي على سلة العميل
  // بنفس هاتفه الموجود مسبقاً.
  it('لا يُنشئ إلا طلباً واحداً عند طلبين متزامنين فعليين لنفس السلة بالضبط (idempotency)', async () => {
    // الاختبار السابق مباشرة يُنزِل المخزون الحقيقي إلى صفر عمداً ولا يُعيده إلا في afterAll
    // الخاص بكل الوصف (describe) — هذا الاختبار لا يعتمد على ترتيب التنفيذ، فيعيد المخزون بنفسه.
    await supabaseAdmin.from('inventory').update({ quantity_available: 10 }).eq('product_id', productId);

    const idempotencyPhone = `0106${Math.floor(1000000 + Math.random() * 8999999)}`;

    // تمهيد: إنشاء العميل مسبقاً عبر سلة/طلب منفصل تماماً — يعزل اختبار التزامن عن سباق
    // إنشاء users غير ذي الصلة (الموثَّق أعلاه في التعليق).
    const setupSessionToken = randomUUID();
    const setupCart = await cartService.getOrCreateCart({ sessionToken: setupSessionToken });
    cartIdsToClean.push(setupCart.id);
    await cartService.addItem(setupCart.id, { productId, quantity: 1, selection: { sizeId: 'small' } });
    const setupOrder = await ordersService.checkout({
      identity: { sessionToken: setupSessionToken },
      customerName: 'زبون اختبار التزامن',
      customerPhone: idempotencyPhone,
      deliveryAddress: { line1: 'شارع تمهيدي', city: 'القاهرة' },
    });
    orderIdsToClean.push(setupOrder.id);
    userIdsToClean.push(setupOrder.userId);

    // الاختبار الفعلي: نفس العميل (موجود مسبقاً الآن)، سلة جديدة، طلبان متزامنان فعليان عليها
    const sessionToken = randomUUID();
    const cart = await cartService.getOrCreateCart({ sessionToken });
    cartIdsToClean.push(cart.id);
    await cartService.addItem(cart.id, { productId, quantity: 1, selection: { sizeId: 'small' } });

    const checkoutOnce = () =>
      ordersService.checkout({
        identity: { sessionToken },
        customerName: 'زبون اختبار التزامن',
        customerPhone: idempotencyPhone,
        deliveryAddress: { line1: 'شارع التزامن', city: 'القاهرة' },
      });

    const [orderA, orderB] = await Promise.all([checkoutOnce(), checkoutOnce()]);
    orderIdsToClean.push(orderA.id);
    if (orderB.id !== orderA.id) orderIdsToClean.push(orderB.id); // تنظيف دفاعي لو فشل الإصلاح

    expect(orderB.id).toBe(orderA.id); // نفس الطلب بالضبط — لا تكرار
  });

  // CRITICAL-FIXES-FROM-AUDIT-001، بند 2 — سباق المخزون (TOCTOU): مخزون = 1، عميلان مختلفان
  // تماماً (سلتان منفصلتان، هاتفان مختلفان) يطلبان القطعة الأخيرة نفسها في نفس اللحظة فعلياً.
  // قبل الإصلاح: كلاهما ينجح (بيع مضاعف لوحدة واحدة فقط). بعد الإصلاح: واحد فقط ينجح، والآخر
  // يُرفَض برسالة واضحة "غير متوفرة"، لا صمتاً ولا بخطأ عام غامض.
  it('يبيع القطعة الأخيرة لعميل واحد فقط عند طلبين متزامنين فعليين لعميلين مختلفين (سباق المخزون)', async () => {
    await supabaseAdmin.from('inventory').update({ quantity_available: 1 }).eq('product_id', productId);

    const sessionTokenA = randomUUID();
    const cartA = await cartService.getOrCreateCart({ sessionToken: sessionTokenA });
    cartIdsToClean.push(cartA.id);
    await cartService.addItem(cartA.id, { productId, quantity: 1, selection: { sizeId: 'small' } });

    const sessionTokenB = randomUUID();
    const cartB = await cartService.getOrCreateCart({ sessionToken: sessionTokenB });
    cartIdsToClean.push(cartB.id);
    await cartService.addItem(cartB.id, { productId, quantity: 1, selection: { sizeId: 'small' } });

    const [resultA, resultB] = await Promise.allSettled([
      ordersService.checkout({
        identity: { sessionToken: sessionTokenA },
        customerName: 'زبون سباق أ',
        customerPhone: `0111${Math.floor(1000000 + Math.random() * 8999999)}`,
        deliveryAddress: { line1: 'شارع السباق أ', city: 'القاهرة' },
      }),
      ordersService.checkout({
        identity: { sessionToken: sessionTokenB },
        customerName: 'زبون سباق ب',
        customerPhone: `0112${Math.floor(1000000 + Math.random() * 8999999)}`,
        deliveryAddress: { line1: 'شارع السباق ب', city: 'القاهرة' },
      }),
    ]);

    for (const result of [resultA, resultB]) {
      if (result.status === 'fulfilled') {
        orderIdsToClean.push(result.value.id);
        userIdsToClean.push(result.value.userId);
      }
    }

    const outcomes = [resultA, resultB];
    const succeeded = outcomes.filter((r) => r.status === 'fulfilled');
    const failed = outcomes.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1); // واحد فقط نجح — لا بيع مضاعف
    expect(failed).toHaveLength(1);
    expect((failed[0] as PromiseRejectedResult).reason.message).toMatch(/غير متوفرة في المخزون/);

    const finalInventory = await supabaseAdmin.from('inventory').select('quantity_available').eq('product_id', productId).single();
    expect(finalInventory.data!.quantity_available).toBe(0); // خُصمت مرة واحدة فقط، لا مرتين ولا صفر مرات
  });
});

describe('Orders lifecycle integration (Supabase حقيقي، اليوم 9)', () => {
  let productId: string;
  let tenantId: string;
  const orderIdsToClean: string[] = [];
  const userIdsToClean: string[] = [];
  const cartIdsToClean: string[] = [];

  beforeAll(async () => {
    // DD-011 — منتج مخصَّص لهذا الوصف أيضاً، نفس مبرِّر الوصف الأول في هذا الملف أعلاه.
    const reference = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!reference) throw new Error('منتج مرجعي "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    if (!reference.tenantId) throw new Error('المنتج المرجعي غير مرتبط بتاجر');
    tenantId = reference.tenantId;

    const { data: productRow, error } = await supabaseAdmin
      .from('products')
      .insert({
        category_id: reference.categoryId,
        tenant_id: reference.tenantId,
        name: `منتج اختبار دورة حياة الطلب — ${randomUUID().slice(0, 8)}`,
        base_price: reference.basePrice,
        unit: reference.unit,
        options: reference.options,
        is_active: true,
      })
      .select('*')
      .single();
    if (error) throw error;
    productId = productRow.id as string;
    await supabaseAdmin.from('inventory').insert({ product_id: productId, quantity_available: 10 });
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
    await supabaseAdmin.from('inventory').delete().eq('product_id', productId);
    await supabaseAdmin.from('products').delete().eq('id', productId);
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

    const history = await ordersService.getStatusHistory({ role: 'merchant_owner', tenantId }, order.id);
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

      const finalOrder = await ordersService.getOrderWithItems({ role: 'platform_admin' }, order.id);
      expect(finalOrder!.order.status).toBe('delivered');

      const history = await ordersService.getStatusHistory({ role: 'platform_admin' }, order.id);
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
    const historyBefore = await ordersService.getStatusHistory({ role: 'merchant_owner', tenantId }, order.id);

    await expect(
      ordersService.transitionStatus({ orderId: order.id, toStatus: 'confirmed', actorRole: 'customer' })
    ).rejects.toThrow(/غير مخوَّل/);

    const historyAfter = await ordersService.getStatusHistory({ role: 'merchant_owner', tenantId }, order.id);
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
