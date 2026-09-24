// src/core/modules/cart/cart.integration.test.ts
// اختبار تكامل يعمل ضد Supabase الحقيقي (.env.local) — لا Mocks لقاعدة البيانات،
// بنفس فلسفة المشروع المتّبعة منذ اليوم 2. ينظّف كل بياناته في afterAll.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import { catalogRepository } from '../catalog/catalog.repository';
import { cartService } from './cart.service';

describe('Cart integration (Supabase حقيقي)', () => {
  let productId: string;
  let sessionToken: string;
  let cartId: string;

  beforeAll(async () => {
    // DD-011 — منتج مخصَّص لهذا الوصف (Describe) بدل الاعتماد على صف "دجاجة كاملة طازجة" الحقيقي
    // المشترك: كان يسبِّب تعارضاً حقيقياً (مخزون يُقرَأ/يُكتَب من عدة ملفات integration في آنٍ واحد)
    // بين هذا الملف وadmin/orders.integration.test.ts. نفس خيارات/سعر المنتج المرجعي حرفياً — لا
    // تغيير في القيم المتوقَّعة (لا تزال "= 100" صحيحة أدناه).
    const reference = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!reference) throw new Error('منتج مرجعي "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    if (!reference.tenantId) throw new Error('المنتج المرجعي غير مرتبط بتاجر');

    const { data: productRow, error } = await supabaseAdmin
      .from('products')
      .insert({
        category_id: reference.categoryId,
        tenant_id: reference.tenantId,
        name: `منتج اختبار السلة — ${randomUUID().slice(0, 8)}`,
        base_price: reference.basePrice,
        unit: reference.unit,
        options: reference.options,
        is_active: true,
      })
      .select('*')
      .single();
    if (error) throw error;
    productId = productRow.id as string;

    const { error: invError } = await supabaseAdmin.from('inventory').insert({ product_id: productId, quantity_available: 10 });
    if (invError) throw invError;

    sessionToken = randomUUID();
  });

  afterAll(async () => {
    if (cartId) {
      await supabaseAdmin.from('carts').delete().eq('id', cartId); // cart_items تُحذف تلقائياً (on delete cascade)
    }
    await supabaseAdmin.from('inventory').delete().eq('product_id', productId);
    await supabaseAdmin.from('products').delete().eq('id', productId);
  });

  it('getOrCreateCart بنفس session_token يُعيد نفس السلة في المرة الثانية (idempotent)', async () => {
    const first = await cartService.getOrCreateCart({ sessionToken });
    const second = await cartService.getOrCreateCart({ sessionToken });
    expect(second.id).toBe(first.id);
    cartId = first.id;
  });

  // DECISION-DEBT-004 — تحقُّق تراجع حي (لا Mock) ضد القيد الفريد الحقيقي carts_session_token_key:
  // layout.tsx وcart/page.tsx (أو checkout/page.tsx) يستدعيان getOrCreateCart بالتوازي لنفس
  // session_token عند أول زيارة لزائر جديد (RSC تُحلّل عنصرين مستقلين بالتوازي في نفس الجولة).
  // قبل الإصلاح: أحد الطلبين المتزامنين يفشل بخطأ Postgres 23505 غير مُعالَج (500 حي على staging).
  // بعد الإصلاح: كل الطلبات المتزامنة تنجح وتتقارب على نفس السلة، بلا استثناء.
  it('طلبات getOrCreateCart متزامنة بنفس session_token جديد لا تفشل بخطأ قيد فريد (سباق layout+page)', async () => {
    const freshToken = randomUUID();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => cartService.getOrCreateCart({ sessionToken: freshToken }))
    );

    const uniqueCartIds = new Set(results.map((cart) => cart.id));
    expect(uniqueCartIds.size).toBe(1);

    await supabaseAdmin.from('carts').delete().eq('session_token', freshToken);
  });

  it('إضافة "دجاجة كاملة طازجة" بحجم صغير فعلياً تُعيد سعراً محسوباً حياً = 100', async () => {
    const summary = await cartService.addItem(cartId, {
      productId,
      quantity: 1,
      selection: { sizeId: 'small' },
    });
    expect(summary.lines).toHaveLength(1);
    expect(summary.total).toBe(100);
  });

  it('ترفض إضافة كمية تتجاوز المخزون المتاح فعلياً في القاعدة', async () => {
    await expect(
      cartService.addItem(cartId, { productId, quantity: 999, selection: { sizeId: 'small' } })
    ).rejects.toThrow(/غير متوفرة/);
  });
});

describe('Cart IDOR (اليوم 12، ADR-014، Supabase حقيقي)', () => {
  let productId: string;
  let cartAId: string;
  let cartBId: string;
  let itemInCartBId: string;

  beforeAll(async () => {
    // DD-011 — منتج مخصَّص لهذا الوصف أيضاً، نفس مبرِّر الوصف أعلاه بالضبط.
    const reference = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!reference) throw new Error('منتج مرجعي "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    if (!reference.tenantId) throw new Error('المنتج المرجعي غير مرتبط بتاجر');

    const { data: productRow, error } = await supabaseAdmin
      .from('products')
      .insert({
        category_id: reference.categoryId,
        tenant_id: reference.tenantId,
        name: `منتج اختبار IDOR — ${randomUUID().slice(0, 8)}`,
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

    const cartA = await cartService.getOrCreateCart({ sessionToken: randomUUID() });
    cartAId = cartA.id;
    const cartB = await cartService.getOrCreateCart({ sessionToken: randomUUID() });
    cartBId = cartB.id;

    const summaryB = await cartService.addItem(cartBId, { productId, quantity: 1, selection: { sizeId: 'small' } });
    itemInCartBId = summaryB.lines[0].item.id;
  });

  afterAll(async () => {
    await supabaseAdmin.from('carts').delete().eq('id', cartAId);
    await supabaseAdmin.from('carts').delete().eq('id', cartBId);
    await supabaseAdmin.from('inventory').delete().eq('product_id', productId);
    await supabaseAdmin.from('products').delete().eq('id', productId);
  });

  it('اختبار أمني حاسم: ترفض حياً حذف بند ينتمي لسلة أخرى عبر cartId مختلف، بلا حذف صامت', async () => {
    await expect(cartService.removeItem(cartAId, itemInCartBId)).rejects.toThrow(/غير موجود/);

    const itemsStillInCartB = await cartService.getSummary(cartBId);
    expect(itemsStillInCartB.lines.some((l) => l.item.id === itemInCartBId)).toBe(true);
  });
});
