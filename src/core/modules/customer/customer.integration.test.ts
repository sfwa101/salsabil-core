// src/core/modules/customer/customer.integration.test.ts
// اختبار تكامل يعمل ضد Supabase الحقيقي (.env.local) — لا Mocks. Authentication = Guardian Matrix
// DEEP (AGENTS.md §17) — يغطي: تسجيل عميل جديد، رفض هاتف موجود مسبقاً (أي دور)، دخول ناجح/فاشل،
// ودمج سلة الضيف عند أول دخول. منتج اختبار مخصَّص هنا (لا "دجاجة كاملة طازجة" المشتركة) — نفس
// إصلاح DD-011 بالضبط، لتفادي إعادة نفس فئة تعارض الملفات المتوازية.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { customerService } from './customer.service';
import { khalilService } from '../../kernel/khalil/service';
import { cartService } from '../cart/cart.service';
import { catalogRepository } from '../catalog/catalog.repository';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';

const TEST_MERCHANT_OWNER_PHONE = '01000000000'; // دور merchant_owner حقيقي — لاختبار رفض التداخل بين الأدوار

describe('Customer register/login integration (Supabase حقيقي)', () => {
  const userIdsToClean: string[] = [];
  const tokensToClean: string[] = [];
  const cartIdsToClean: string[] = [];

  afterAll(async () => {
    for (const token of tokensToClean) {
      await khalilService.destroySession(token);
    }
    for (const cartId of cartIdsToClean) {
      await supabaseAdmin.from('carts').delete().eq('id', cartId);
    }
    for (const userId of userIdsToClean) {
      await supabaseAdmin.from('user_personas').delete().eq('user_id', userId);
      await supabaseAdmin.from('users').delete().eq('id', userId);
    }
  });

  it('يسجّل عميلاً جديداً فعلياً، وينشئ جلسة role=customer بـtenantId فارغ', async () => {
    const phone = `0107${Math.floor(1000000 + Math.random() * 8999999)}`;
    const result = await customerService.register({ fullName: 'عميل اختبار', phone, password: 'Test-Password-123' });

    expect('error' in result).toBe(false);
    if ('error' in result) return;
    userIdsToClean.push(result.session.userId);
    tokensToClean.push(result.token);

    expect(result.session.role).toBe('customer');
    expect(result.session.tenantId).toBeNull();

    const user = await khalilService.findUserByPhone(phone);
    expect(user?.role).toBe('customer');
    expect(user?.fullName).toBe('عميل اختبار');
  });

  it('يرفض التسجيل بهاتف له صف users موجود مسبقاً — حتى لو دور مختلف تماماً (merchant_owner)', async () => {
    const result = await customerService.register({
      fullName: 'محاولة انتحال',
      phone: TEST_MERCHANT_OWNER_PHONE,
      password: 'Test-Password-123',
    });

    expect(result).toEqual({ error: 'account_exists' });
  });

  it('دخول ناجح: هاتف/كلمة مرور صحيحان لعميل حقيقي مسجَّل حديثاً', async () => {
    const phone = `0108${Math.floor(1000000 + Math.random() * 8999999)}`;
    const registerResult = await customerService.register({ fullName: 'عميل دخول', phone, password: 'Test-Password-123' });
    if ('error' in registerResult) throw new Error('فشل التسجيل التمهيدي');
    userIdsToClean.push(registerResult.session.userId);
    tokensToClean.push(registerResult.token);

    const loginResult = await customerService.login(phone, 'Test-Password-123');
    expect(loginResult).not.toBeNull();
    tokensToClean.push(loginResult!.token);
    expect(loginResult!.session.role).toBe('customer');
    expect(loginResult!.session.userId).toBe(registerResult.session.userId);
  });

  it('يرفض (null) كلمة مرور خاطئة لعميل حقيقي', async () => {
    const phone = `0109${Math.floor(1000000 + Math.random() * 8999999)}`;
    const registerResult = await customerService.register({ fullName: 'عميل خطأ', phone, password: 'Test-Password-123' });
    if ('error' in registerResult) throw new Error('فشل التسجيل التمهيدي');
    userIdsToClean.push(registerResult.session.userId);
    tokensToClean.push(registerResult.token);

    const loginResult = await customerService.login(phone, 'wrong-password-123');
    expect(loginResult).toBeNull();
  });

  it('يرفض (null) دخول عميل بهاتف تاجر حقيقي (merchant_owner) رغم وجود كلمة مرور صحيحة له', async () => {
    // نفس كلمة المرور المشتركة المضبوطة على الحساب التجريبي في ملفات integration الأخرى
    // (merchant/admin.integration.test.ts) — idempotent، لا حاجة لضبطها هنا مجدداً.
    const loginResult = await customerService.login(TEST_MERCHANT_OWNER_PHONE, 'Test-Password-123');
    expect(loginResult).toBeNull();
  });
});

describe('Guest cart merge on customer login/register (Supabase حقيقي)', () => {
  let productId: string;
  const userIdsToClean: string[] = [];
  const tokensToClean: string[] = [];
  const cartIdsToClean: string[] = [];

  beforeAll(async () => {
    // DD-011 — منتج مخصَّص لهذا الملف، لا "دجاجة كاملة طازجة" المشتركة (راجع docs/DECISIONS.md).
    const reference = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!reference) throw new Error('منتج مرجعي غير موجود في قاعدة البيانات الحقيقية');
    if (!reference.tenantId) throw new Error('المنتج المرجعي غير مرتبط بتاجر');

    const { data: productRow, error } = await supabaseAdmin
      .from('products')
      .insert({
        category_id: reference.categoryId,
        tenant_id: reference.tenantId,
        name: `منتج اختبار دمج السلة — ${randomUUID().slice(0, 8)}`,
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
    for (const token of tokensToClean) {
      await khalilService.destroySession(token);
    }
    for (const cartId of cartIdsToClean) {
      await supabaseAdmin.from('carts').delete().eq('id', cartId);
    }
    for (const userId of userIdsToClean) {
      await supabaseAdmin.from('user_personas').delete().eq('user_id', userId);
      await supabaseAdmin.from('users').delete().eq('id', userId);
    }
    await supabaseAdmin.from('inventory').delete().eq('product_id', productId);
    await supabaseAdmin.from('products').delete().eq('id', productId);
  });

  it('يدمج سلة ضيف بها بند واحد داخل سلة عميل جديد عند التسجيل، ويحذف سلة الضيف', async () => {
    const guestSessionToken = randomUUID();
    const guestCart = await cartService.getOrCreateCart({ sessionToken: guestSessionToken });
    await cartService.addItem(guestCart.id, { productId, quantity: 2, selection: { sizeId: 'small' } });

    const phone = `0110${Math.floor(1000000 + Math.random() * 8999999)}`;
    const registerResult = await customerService.register({ fullName: 'عميل دمج السلة', phone, password: 'Test-Password-123' });
    if ('error' in registerResult) throw new Error('فشل التسجيل التمهيدي');
    userIdsToClean.push(registerResult.session.userId);
    tokensToClean.push(registerResult.token);

    await cartService.mergeGuestCartIntoUser(guestSessionToken, registerResult.session.userId);

    const userCart = await cartService.getOrCreateCart({ userId: registerResult.session.userId });
    cartIdsToClean.push(userCart.id);
    const summary = await cartService.getSummary(userCart.id);
    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0].item.quantity).toBe(2);

    // سلة الضيف حُذفت فعلياً (لا مجرَّد إفراغها) — تحقّق مباشر من عدم وجود الصف بمعرّفه الأصلي
    const { data: deletedGuestCart } = await supabaseAdmin.from('carts').select('id').eq('id', guestCart.id).maybeSingle();
    expect(deletedGuestCart).toBeNull();
  });

  it('يجمع الكمية عند نفس المنتج/الاختيار الموجود مسبقاً في سلة العميل، لا يستبدلها', async () => {
    const phone = `0111${Math.floor(1000000 + Math.random() * 8999999)}`;
    const registerResult = await customerService.register({ fullName: 'عميل جمع الكمية', phone, password: 'Test-Password-123' });
    if ('error' in registerResult) throw new Error('فشل التسجيل التمهيدي');
    userIdsToClean.push(registerResult.session.userId);
    tokensToClean.push(registerResult.token);

    const userCart = await cartService.getOrCreateCart({ userId: registerResult.session.userId });
    cartIdsToClean.push(userCart.id);
    await cartService.addItem(userCart.id, { productId, quantity: 3, selection: { sizeId: 'small' } });

    const guestSessionToken = randomUUID();
    const guestCart = await cartService.getOrCreateCart({ sessionToken: guestSessionToken });
    await cartService.addItem(guestCart.id, { productId, quantity: 2, selection: { sizeId: 'small' } });

    await cartService.mergeGuestCartIntoUser(guestSessionToken, registerResult.session.userId);

    const summary = await cartService.getSummary(userCart.id);
    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0].item.quantity).toBe(5); // 3 + 2، لا استبدال
  });
});
