// src/core/modules/admin/admin.integration.test.ts
// اختبار تكامل يعمل ضد Supabase الحقيقي (.env.local) — لا Mocks. يستخدم بيانات الاختبار الحية
// القائمة فعلاً: مدير منصة تجريبي (هاتف 01000000001، أُنشئ يدوياً عبر service_role اليوم 11)
// وتاجر تجريبي (هاتف 01000000000، من اليوم 4/10). ينظّف كل جلسة وطلب أنشأه، ويستعيد isActive
// الأصلي للتاجر التجريبي بعد اختبار التبديل.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminService } from './admin.service';
import { merchantService } from '../merchant/merchant.service';
import { khalilService } from '../../kernel/khalil/service';
import { catalogRepository } from '../catalog/catalog.repository';
import { cartService } from '../cart/cart.service';
import { ordersService } from '../orders/orders.service';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';

const TEST_ADMIN_PHONE = '01000000001';
const TEST_MERCHANT_OWNER_PHONE = '01000000000';

describe('Admin login integration (Supabase حقيقي، اليوم 11)', () => {
  const tokensToClean: string[] = [];

  afterAll(async () => {
    for (const token of tokensToClean) {
      await khalilService.destroySession(token);
    }
  });

  it('ينجح: هاتف مدير منصة حقيقي → token وجلسة بـ tenantId: null', async () => {
    const result = await adminService.loginByPhone(TEST_ADMIN_PHONE);
    expect(result).not.toBeNull();
    tokensToClean.push(result!.token);

    expect(result!.session.role).toBe('platform_admin');
    expect(result!.session.tenantId).toBeNull();
  });

  it('يرفض (null) رقم هاتف غير مسجَّل إطلاقاً', async () => {
    const randomPhone = `0198${Math.floor(1000000 + Math.random() * 8999999)}`;
    const result = await adminService.loginByPhone(randomPhone);
    expect(result).toBeNull();
  });

  it('اختبار أمني حاسم: هاتف تاجر حقيقي (merchant_owner) يُرفض من دخول الإدارة رغم كونه مستخدماً حقيقياً وفعالاً', async () => {
    const result = await adminService.loginByPhone(TEST_MERCHANT_OWNER_PHONE);
    expect(result).toBeNull();
  });

  it('اختبار أمني حاسم: جلسة تاجر حقيقية (وليس هاتفاً فقط) لا تُقرَأ أبداً كجلسة platform_admin — نفس الفحص الذي يطبّقه getAdminSession()', async () => {
    // يحاكي بالضبط منطق admin-session.ts → getAdminSession(): جلب الجلسة عبر validateSessionToken
    // ثم التحقق من role === 'platform_admin'. الكوكي نفسها لا تُختبَر هنا (تتطلب سياق طلب Next.js
    // حقيقي، مُتحقَّق منه بمتصفح حقيقي بدلاً من ذلك) — لكن قرار الرفض الفعلي (المنطق الحساس أمنياً)
    // يُختبَر هنا حياً ضد جلسة تاجر حقيقية، لا بيانات وهمية.
    const merchantLogin = await merchantService.loginOwnerByPhone(TEST_MERCHANT_OWNER_PHONE);
    expect(merchantLogin).not.toBeNull();
    tokensToClean.push(merchantLogin!.token);

    const fetchedSession = await khalilService.validateSessionToken(merchantLogin!.token);
    expect(fetchedSession).not.toBeNull();
    expect(fetchedSession!.role).not.toBe('platform_admin'); // هذا بالضبط ما يمنع getAdminSession() من قبولها
  });
});

describe('Admin merchant management integration (Supabase حقيقي، اليوم 11)', () => {
  let originalIsActive: boolean;
  let testMerchantId: string;
  let testActor: { id: string; role: 'platform_admin' };

  beforeAll(async () => {
    const adminUser = await khalilService.findUserByPhone(TEST_ADMIN_PHONE);
    if (!adminUser) throw new Error('مدير المنصة التجريبي غير موجود في قاعدة البيانات الحقيقية');
    testActor = { id: adminUser.id, role: 'platform_admin' };

    const merchants = await adminService.listMerchants();
    const testMerchant = merchants.find((m) => m.phone === '01000000000' || m.businessName.includes('تجريبي'));
    if (!testMerchant) throw new Error('التاجر التجريبي غير موجود في قاعدة البيانات الحقيقية');
    testMerchantId = testMerchant.id;
    originalIsActive = testMerchant.isActive;
  });

  afterAll(async () => {
    await adminService.setMerchantActiveStatus(testMerchantId, originalIsActive, testActor);
  });

  it('listMerchants يعيد التاجر التجريبي الحقيقي ضمن النتائج', async () => {
    const merchants = await adminService.listMerchants();
    expect(merchants.some((m) => m.id === testMerchantId)).toBe(true);
  });

  it('دورة تبديل is_active كاملة تنعكس فعلياً في قراءة لاحقة، بلا تعديل أي حقل آخر', async () => {
    const before = (await adminService.listMerchants()).find((m) => m.id === testMerchantId)!;

    const toggled = await adminService.setMerchantActiveStatus(testMerchantId, !before.isActive, testActor);
    expect(toggled.isActive).toBe(!before.isActive);
    expect(toggled.businessName).toBe(before.businessName); // لم يتغيّر أي حقل آخر
    expect(toggled.phone).toBe(before.phone);

    const afterRead = (await adminService.listMerchants()).find((m) => m.id === testMerchantId)!;
    expect(afterRead.isActive).toBe(!before.isActive);

    // إعادة الحالة الأصلية فوراً (لا الاعتماد على afterAll فقط) — يبقي بقية الاختبارات في هذا
    // الملف متسقة إن اعتمدت على كون التاجر نشطاً
    await adminService.setMerchantActiveStatus(testMerchantId, before.isActive, testActor);
  });

  it('اختبار أمني حاسم (اليوم 12، ADR-014): تفعيل/تعطيل تاجر يُسجَّل فعلياً في audit_log بالفاعل والقيمتين قبل/بعد — الفجوة المذكورة صراحة في ADR-013', async () => {
    const before = (await adminService.listMerchants()).find((m) => m.id === testMerchantId)!;

    await adminService.setMerchantActiveStatus(testMerchantId, !before.isActive, testActor);

    const { data: rows, error } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('entity_type', 'merchant')
      .eq('entity_id', testMerchantId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;

    expect(rows).toHaveLength(1);
    expect(rows![0].actor_id).toBe(testActor.id);
    expect(rows![0].actor_role).toBe('platform_admin');
    expect(rows![0].action).toBe(!before.isActive ? 'merchant.activated' : 'merchant.deactivated');
    expect(rows![0].metadata).toMatchObject({ before: { isActive: before.isActive }, after: { isActive: !before.isActive } });

    // إعادة الحالة الأصلية
    await adminService.setMerchantActiveStatus(testMerchantId, before.isActive, testActor);
  });
});

describe('Admin/Merchant login audit trail integration (اليوم 12، ADR-014، Supabase حقيقي)', () => {
  const tokensToClean: string[] = [];

  afterAll(async () => {
    for (const token of tokensToClean) {
      await khalilService.destroySession(token);
    }
  });

  it('دخول إدارة ناجح يُسجَّل في audit_log كـ auth.login_success', async () => {
    const result = await adminService.loginByPhone(TEST_ADMIN_PHONE);
    tokensToClean.push(result!.token);

    // مفلترة بـ actor_id أيضاً لا الفعل فقط — بلا هذا الفلتر، تسجيل دخول ناجح آخر من ملف اختبار
    // متوازٍ (نفس الحساب أو حساب آخر) قد يسبق هذا الصف في created_at ويجعل limit(1) يلتقط الصف
    // الخطأ (اكتُشف حياً: E2E-DAY13-001 يزيد عدد عمليات الدخول الناجحة المتزامنة على audit_log)
    const { data: rows, error } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('action', 'auth.login_success')
      .eq('entity_type', 'user')
      .eq('actor_id', result!.session.userId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;

    expect(rows).toHaveLength(1);
    expect(rows![0].actor_role).toBe('platform_admin');
  });

  it('محاولة دخول إدارة برقم هاتف غير مسجَّل تُسجَّل في audit_log كـ auth.login_failed بفاعل anonymous', async () => {
    const randomPhone = `0198${Math.floor(1000000 + Math.random() * 8999999)}`;
    await adminService.loginByPhone(randomPhone);

    const { data: rows, error } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('action', 'auth.login_failed')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;

    expect(rows).toHaveLength(1);
    expect(rows![0].actor_role).toBe('anonymous');
    expect(rows![0].metadata).toMatchObject({ phone: randomPhone, attemptedRole: 'platform_admin' });
  });
});

describe('Admin orders integration (Supabase حقيقي، اليوم 11)', () => {
  let productId: string;
  const orderIdsToClean: string[] = [];
  const userIdsToClean: string[] = [];
  const cartIdsToClean: string[] = [];

  beforeAll(async () => {
    const product = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!product) throw new Error('منتج الاختبار غير موجود في قاعدة البيانات الحقيقية');
    productId = product.id;
    await supabaseAdmin.from('inventory').upsert({ product_id: productId, quantity_available: 10 }, { onConflict: 'product_id' });
  });

  afterAll(async () => {
    for (const orderId of orderIdsToClean) {
      await supabaseAdmin.from('orders').delete().eq('id', orderId);
    }
    for (const cartId of cartIdsToClean) {
      await supabaseAdmin.from('carts').delete().eq('id', cartId);
    }
    for (const userId of userIdsToClean) {
      // اليوم 21 (ADR-019): checkout ينشئ شخصية فردية أيضاً الآن — تُحذَف أولاً (بلا cascade على
      // user_personas.user_id)، وإلا يفشل حذف users بقيد FK بصمت.
      await supabaseAdmin.from('user_personas').delete().eq('user_id', userId);
      await supabaseAdmin.from('users').delete().eq('id', userId);
    }
    await supabaseAdmin.from('inventory').update({ quantity_available: 10 }).eq('product_id', productId);
  });

  it('الإدارة تقرأ طلباً حقيقياً بغض النظر عن التاجر، تغيّر حالته بلا tenantId، ويظهر في سجل التدقيق العام', async () => {
    const sessionToken = randomUUID();
    const cart = await cartService.getOrCreateCart({ sessionToken });
    cartIdsToClean.push(cart.id);
    await cartService.addItem(cart.id, { productId, quantity: 1, selection: { sizeId: 'small' } });

    const order = await ordersService.checkout({
      identity: { sessionToken },
      customerName: 'زبون فحص الإدارة',
      customerPhone: `0105${Math.floor(1000000 + Math.random() * 8999999)}`,
      deliveryAddress: { line1: 'شارع الإدارة', city: 'القاهرة' },
    });
    orderIdsToClean.push(order.id);
    userIdsToClean.push(order.userId);

    const allOrders = await ordersService.getAllOrders();
    expect(allOrders.some((o) => o.id === order.id)).toBe(true);

    const updated = await ordersService.transitionStatus({
      orderId: order.id,
      toStatus: 'confirmed',
      actorRole: 'platform_admin',
      // بلا tenantId — نفس ما يفعله transitionOrderAdminAction فعلياً
    });
    expect(updated.status).toBe('confirmed');

    const history = await ordersService.getRecentStatusHistory(50);
    const entry = history.find((h) => h.orderId === order.id && h.toStatus === 'confirmed');
    expect(entry).toBeDefined();
    expect(entry!.actorRole).toBe('platform_admin');
  });
});
