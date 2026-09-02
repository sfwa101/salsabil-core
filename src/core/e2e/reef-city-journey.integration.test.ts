// src/core/e2e/reef-city-journey.integration.test.ts
// E2E-DAY13-001 — اختبار تكامل شامل يعمل ضد Supabase الحقيقي (لا Mocks)، يحاكي القطعة الرأسية
// الكاملة لرحلة "ريف المدينة": زائر → سلة (رفض سعر مخادع) → Checkout → تاجر أ يقدّم الطلب →
// تاجر ب يُرفَض (IDOR/عزل مستأجرين، على مستوى التطبيق وRLS الحقيقي معاً) → تاجر أ يكمل → إدارة
// تُسلِّم → التحقق من order_status_history وaudit_log. ينظّف كل بياناته في afterAll.
//
// ملاحظة معمارية (راجع docs/DECISIONS.md → ADR-014، البديل ب): تغييرات حالة الطلب تُسجَّل في
// order_status_history حصرياً، لا audit_log — الدمج بينهما رُفض صراحة في ADR-014. هذا الملف يتحقق
// من كليهما: التسلسل الكامل في order_status_history، وأن audit_log يبقى خالياً من أي entity_type
// 'order' (حارس انحدار موثَّق، لا افتراض غير مُتحقَّق منه).
//
// ملاحظة عزل الاختبارات: التاجر أ هنا حساب مُنشأ حياً خصيصاً لهذا الملف (وكذا منتجه)، لا الحساب
// التجريبي المشترك "01000000000"/"دجاجة كاملة طازجة" — اكتُشف فعلياً أن ملفات تكامل أخرى
// (admin.integration.test.ts) تُبدِّل is_active لذلك التاجر المشترك أثناء تشغيلها، وVitest يشغّل
// ملفات الاختبار بالتوازي افتراضياً؛ اعتماد هذا الملف على نفس الحساب المشترك سبَّب فشلاً متقطعاً
// حقيقياً (loginOwnerByPhone يعيد null إن صادف التاجر معطَّلاً مؤقتاً من ملف آخر). الحل هنا هو
// عزل بيانات هذا الملف بالكامل (تاجر أ + منتج مخصَّص + تاجر ب) بدل تعديل ملفات أخرى أو إعدادات
// Vitest العامة — لا علاقة له بأي ثغرة في كود Core/Services.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { supabase } from '../kernel/database/supabase-client';
import { supabaseAdmin } from '../kernel/database/supabase-admin-client';
import { khalilService } from '../kernel/khalil/service';
import { cartService } from '../modules/cart/cart.service';
import { ordersService } from '../modules/orders/orders.service';
import { merchantService } from '../modules/merchant/merchant.service';
import { adminService } from '../modules/admin/admin.service';
import type { AddItemInput } from '../modules/cart/types';

const TEST_ADMIN_PHONE = '01000000001';
const TEST_PRODUCT_BASE_PRICE = 120;

describe('رحلة ريف المدينة الكاملة (E2E-DAY13-001، Supabase حقيقي)', () => {
  // تاجر أ ومنتجه — يُنشآن حياً خصيصاً لهذا الملف (راجع ملاحظة عزل الاختبارات أعلاه)
  let merchantAUserId: string | undefined;
  let merchantAId: string | undefined;
  const merchantAPhone = `0107${Math.floor(1000000 + Math.random() * 8999999)}`;
  let productId: string;

  // تاجر ب — يُنشأ حياً لهذا الاختبار لإثبات عزل مستأجرين حقيقي بين تاجرَين فعليَّين
  let merchantBUserId: string | undefined;
  let merchantBId: string | undefined;
  const merchantBPhone = `0106${Math.floor(1000000 + Math.random() * 8999999)}`;

  // حالة الرحلة المشتركة عبر السيناريوهات
  let visitorCartId: string | undefined;
  let orderId: string | undefined;
  let customerUserId: string | undefined;
  let merchantALoginUserId: string;
  let merchantBLoginUserId: string;
  let adminUserId: string;
  const tokensToClean: string[] = [];

  beforeAll(async () => {
    const { data: category, error: categoryError } = await supabaseAdmin.from('categories').select('id').limit(1).single();
    if (categoryError) throw categoryError;

    // تاجر أ حقيقي (مالك + صف merchants) — إدراج مباشر عبر service_role، نفس نمط إنشاء
    // حساب platform_admin التجريبي الأول يدوياً (راجع docs/DATABASE.md §3 sessions)
    const { data: userARow, error: userAError } = await supabaseAdmin
      .from('users')
      .insert({ full_name: 'مالك تاجر أ — اختبار E2E', phone: merchantAPhone, role: 'merchant_owner' })
      .select('*')
      .single();
    if (userAError) throw userAError;
    merchantAUserId = userARow.id as string;

    const { data: merchantARow, error: merchantAError } = await supabaseAdmin
      .from('merchants')
      .insert({
        owner_id: merchantAUserId,
        business_name: 'تاجر أ — اختبار E2E',
        phone: merchantAPhone,
        slug: `merchant-a-e2e-${randomUUID().slice(0, 8)}`,
        commission_rate: 10,
        is_active: true,
      })
      .select('*')
      .single();
    if (merchantAError) throw merchantAError;
    merchantAId = merchantARow.id as string;

    // منتج مخصَّص لهذا الملف — بلا خيارات (سعر أساسي مباشر)، لعزل كامل عن أي منتج/مخزون تستهلكه
    // ملفات اختبار أخرى بالتوازي
    const { data: productRow, error: productError } = await supabaseAdmin
      .from('products')
      .insert({
        category_id: category.id,
        tenant_id: merchantAId,
        name: 'منتج اختبار رحلة ريف E2E',
        base_price: TEST_PRODUCT_BASE_PRICE,
        unit: 'piece',
        options: [],
        is_active: true,
      })
      .select('*')
      .single();
    if (productError) throw productError;
    productId = productRow.id as string;

    await supabaseAdmin.from('inventory').insert({ product_id: productId, quantity_available: 10 });

    // تاجر ب حقيقي — نفس نمط تاجر أ أعلاه
    const { data: userBRow, error: userBError } = await supabaseAdmin
      .from('users')
      .insert({ full_name: 'مالك تاجر ب — اختبار E2E', phone: merchantBPhone, role: 'merchant_owner' })
      .select('*')
      .single();
    if (userBError) throw userBError;
    merchantBUserId = userBRow.id as string;

    const { data: merchantBRow, error: merchantBError } = await supabaseAdmin
      .from('merchants')
      .insert({
        owner_id: merchantBUserId,
        business_name: 'تاجر ب — اختبار E2E',
        phone: merchantBPhone,
        slug: `merchant-b-e2e-${randomUUID().slice(0, 8)}`,
        commission_rate: 10,
        is_active: true,
      })
      .select('*')
      .single();
    if (merchantBError) throw merchantBError;
    merchantBId = merchantBRow.id as string;
  });

  afterAll(async () => {
    if (orderId) {
      await supabaseAdmin.from('orders').delete().eq('id', orderId); // order_items وorder_status_history تُحذفان تلقائياً (cascade)
    }
    if (visitorCartId) {
      await supabaseAdmin.from('carts').delete().eq('id', visitorCartId);
    }
    if (customerUserId) {
      await supabaseAdmin.from('users').delete().eq('id', customerUserId);
    }
    for (const token of tokensToClean) {
      await khalilService.destroySession(token);
    }
    if (productId) {
      await supabaseAdmin.from('inventory').delete().eq('product_id', productId);
      await supabaseAdmin.from('products').delete().eq('id', productId);
    }
    if (merchantBId) {
      await supabaseAdmin.from('merchants').delete().eq('id', merchantBId);
    }
    if (merchantBUserId) {
      await supabaseAdmin.from('users').delete().eq('id', merchantBUserId);
    }
    if (merchantAId) {
      await supabaseAdmin.from('merchants').delete().eq('id', merchantAId);
    }
    if (merchantAUserId) {
      await supabaseAdmin.from('users').delete().eq('id', merchantAUserId);
    }
  });

  it('السيناريو 1 — زائر يتصفح الكتالوج العام (anon)، وRLS تمنعه تماماً من رؤية جداول مقفولة (carts/orders/merchants)', async () => {
    const { data: productRead, error: productError } = await supabase.from('products').select('*').eq('id', productId).maybeSingle();
    expect(productError).toBeNull();
    expect(productRead).not.toBeNull();

    const { data: ordersRead, error: ordersError } = await supabase.from('orders').select('*');
    expect(ordersError).toBeNull();
    expect(ordersRead ?? []).toHaveLength(0);

    const { data: cartsRead, error: cartsError } = await supabase.from('carts').select('*');
    expect(cartsError).toBeNull();
    expect(cartsRead ?? []).toHaveLength(0);

    const { data: merchantsRead, error: merchantsError } = await supabase.from('merchants').select('*');
    expect(merchantsError).toBeNull();
    expect(merchantsRead ?? []).toHaveLength(0);
  });

  it('السيناريو 2 — السلة ترفض سعراً مخادعاً من العميل وتحسب السعر حياً من الخادم دائماً', async () => {
    const sessionToken = randomUUID();
    const cart = await cartService.getOrCreateCart({ sessionToken });
    visitorCartId = cart.id;

    // AddItemInput لا يملك أصلاً حقل سعر — نحقن حقلاً مزوَّراً غير موجود في النوع لنتأكد أن
    // الخادم يتجاهله كلياً ويحسب السعر الحقيقي حياً (docs/SECURITY.md §6/§7)
    const tamperedInput = {
      productId,
      quantity: 1,
      unitPrice: 1,
      price: 1,
    } as unknown as AddItemInput;

    const summary = await cartService.addItem(cart.id, tamperedInput);
    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0].unitPrice).toBe(TEST_PRODUCT_BASE_PRICE); // لا 1 — السعر المزوَّر رُفض صامتاً
    expect(summary.total).toBe(TEST_PRODUCT_BASE_PRICE);
  });

  it('السيناريو 3 — Checkout يحوّل السلة إلى طلب PENDING حقيقي، بسعر مجمَّد صحيح وسجل تدقيق ابتدائي', async () => {
    if (!visitorCartId) throw new Error('السلة من السيناريو السابق غير موجودة');
    const cart = await supabaseAdmin.from('carts').select('session_token').eq('id', visitorCartId).single();
    const sessionToken = cart.data!.session_token as string;

    const customerPhone = `0104${Math.floor(1000000 + Math.random() * 8999999)}`;
    const order = await ordersService.checkout({
      identity: { sessionToken },
      customerName: 'زبون رحلة ريف E2E',
      customerPhone,
      deliveryAddress: { line1: 'شارع الرحلة الكاملة', city: 'القاهرة' },
    });
    orderId = order.id;
    customerUserId = order.userId;

    expect(order.total).toBe(TEST_PRODUCT_BASE_PRICE);
    expect(order.tenantId).toBe(merchantAId);
    expect(order.status).toBe('pending');
    expect(order.paymentMethod).toBe('cash_on_delivery');

    const cartAfter = await cartService.getSummary(visitorCartId);
    expect(cartAfter.lines).toHaveLength(0); // السلة أُفرغت بعد نجاح الطلب

    const history = await ordersService.getStatusHistory(orderId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ fromStatus: null, toStatus: 'pending', actorRole: 'system' });
  });

  it('السيناريو 4 — جلسة التاجر أ الحقيقية ترى الطلب وتؤكّده', async () => {
    if (!orderId) throw new Error('الطلب من السيناريو السابق غير موجود');

    const loginA = await merchantService.loginOwnerByPhone(merchantAPhone);
    expect(loginA).not.toBeNull();
    tokensToClean.push(loginA!.token);
    merchantALoginUserId = loginA!.session.userId;
    expect(loginA!.session.tenantId).toBe(merchantAId);

    const ordersForA = await ordersService.getOrdersForTenant(merchantAId!);
    expect(ordersForA.some((o) => o.id === orderId)).toBe(true);

    const updated = await ordersService.transitionStatus({
      orderId,
      toStatus: 'confirmed',
      actorRole: 'merchant_owner',
      tenantId: merchantAId,
      actorId: merchantALoginUserId,
    });
    expect(updated.status).toBe('confirmed');
  });

  it(
    'السيناريو 5 — اختبار أمني حاسم: جلسة التاجر ب الحقيقية تُرفَض من تغيير طلب التاجر أ (عزل مستأجرين)، وRLS الحقيقية تمنعه أيضاً عند تجاوز طبقة التطبيق كلياً',
    async () => {
      if (!orderId) throw new Error('الطلب من السيناريو السابق غير موجود');

      const loginB = await merchantService.loginOwnerByPhone(merchantBPhone);
      expect(loginB).not.toBeNull();
      tokensToClean.push(loginB!.token);
      merchantBLoginUserId = loginB!.session.userId;
      expect(loginB!.session.tenantId).toBe(merchantBId);

      // (أ) طبقة التطبيق: transitionStatus يرفض صراحة
      await expect(
        ordersService.transitionStatus({
          orderId,
          toStatus: 'preparing',
          actorRole: 'merchant_owner',
          tenantId: merchantBId,
          actorId: merchantBLoginUserId,
        })
      ).rejects.toThrow(/لا يخص تاجرك/);

      const orderAfterAttempt = await ordersService.getOrderWithItems(orderId);
      expect(orderAfterAttempt!.order.status).toBe('confirmed'); // لم يتغيّر

      const historyAfterAttempt = await ordersService.getStatusHistory(orderId);
      expect(historyAfterAttempt).toHaveLength(2); // pending + confirmed فقط — لا قيد جديد من المحاولة المرفوضة

      // (ب) قراءة التاجر ب لطلبات مستأجره لا تُظهر طلب التاجر أ إطلاقاً
      const ordersForB = await ordersService.getOrdersForTenant(merchantBId!);
      expect(ordersForB.some((o) => o.id === orderId)).toBe(false);

      // (ج) RLS الحقيقية: حتى بتجاوز طبقة الخدمة كلياً عبر عميل anon مباشرة، لا قراءة ولا كتابة ممكنة
      const { data: anonRead, error: anonReadError } = await supabase.from('orders').select('*').eq('id', orderId);
      expect(anonReadError).toBeNull();
      expect(anonRead ?? []).toHaveLength(0);

      const { data: anonUpdate, error: anonUpdateError } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId)
        .select();
      expect(anonUpdateError).toBeNull();
      expect(anonUpdate ?? []).toHaveLength(0); // RLS تمنع الصف من التأثر — 0 صفوف مُحدَّثة

      const orderStillConfirmed = await ordersService.getOrderWithItems(orderId);
      expect(orderStillConfirmed!.order.status).toBe('confirmed'); // لم يتأثر بمحاولة anon
    },
    20000
  );

  it(
    'السيناريو 6 — التاجر أ يكمل دورة الحياة حتى "خارج للتوصيل"',
    async () => {
      if (!orderId) throw new Error('الطلب من السيناريو السابق غير موجود');

      for (const toStatus of ['preparing', 'ready', 'out_for_delivery'] as const) {
        const updated = await ordersService.transitionStatus({
          orderId,
          toStatus,
          actorRole: 'merchant_owner',
          tenantId: merchantAId,
          actorId: merchantALoginUserId,
        });
        expect(updated.status).toBe(toStatus);
      }
    },
    20000
  );

  it('السيناريو 7 — إشراف الإدارة: ترى الطلب عبر كل التجار، وتنفّذ التسليم النهائي بلا tenantId (تجاوز مشروع، بعكس محاولة التاجر ب)', async () => {
    if (!orderId) throw new Error('الطلب من السيناريو السابق غير موجود');

    const loginAdmin = await adminService.loginByPhone(TEST_ADMIN_PHONE);
    expect(loginAdmin).not.toBeNull();
    tokensToClean.push(loginAdmin!.token);
    adminUserId = loginAdmin!.session.userId;
    expect(loginAdmin!.session.tenantId).toBeNull();

    const allOrders = await ordersService.getAllOrders();
    expect(allOrders.some((o) => o.id === orderId)).toBe(true);

    const delivered = await ordersService.transitionStatus({
      orderId,
      toStatus: 'delivered',
      actorRole: 'platform_admin',
      actorId: adminUserId,
      // بلا tenantId عمداً — نفس ما يفعله transitionOrderAdminAction فعلياً
    });
    expect(delivered.status).toBe('delivered');
  });

  it('السيناريو 8 — سجل التدقيق الكامل: order_status_history يطابق كل فاعل، audit_log يسجّل الدخول الثلاثة ويبقى خالياً من صفوف الطلب', async () => {
    if (!orderId) throw new Error('الطلب من السيناريو السابق غير موجود');

    const fullHistory = await ordersService.getStatusHistory(orderId);
    expect(fullHistory.map((h) => h.toStatus)).toEqual([
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'out_for_delivery',
      'delivered',
    ]);
    expect(fullHistory.map((h) => h.fromStatus)).toEqual([null, 'pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery']);
    expect(fullHistory.map((h) => h.actorRole)).toEqual([
      'system',
      'merchant_owner',
      'merchant_owner',
      'merchant_owner',
      'merchant_owner',
      'platform_admin',
    ]);
    expect(fullHistory[1].actorId).toBe(merchantALoginUserId); // "confirmed" فعله التاجر أ
    expect(fullHistory[5].actorId).toBe(adminUserId); // "delivered" فعلته الإدارة

    // audit_log: كل عمليات الدخول الثلاث الحقيقية سُجِّلت
    for (const actorId of [merchantALoginUserId, merchantBLoginUserId, adminUserId]) {
      const { data: loginRows, error } = await supabaseAdmin
        .from('audit_log')
        .select('*')
        .eq('action', 'auth.login_success')
        .eq('actor_id', actorId)
        .order('created_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      expect(loginRows).toHaveLength(1);
    }

    // حارس انحدار (ADR-014): audit_log لا يحوي إطلاقاً أي صف لهذا الطلب — التسجيل الوحيد
    // لدورة حياة الطلب هو order_status_history، عمداً، لا audit_log العام
    const { data: orderAuditRows, error: orderAuditError } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('entity_type', 'order')
      .eq('entity_id', orderId);
    if (orderAuditError) throw orderAuditError;
    expect(orderAuditRows ?? []).toHaveLength(0);
  });
});
