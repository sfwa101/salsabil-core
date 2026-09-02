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
  let seededInventory = false;

  beforeAll(async () => {
    const product = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!product) throw new Error('منتج الاختبار "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    productId = product.id;

    const { data: existing } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (!existing) {
      const { error } = await supabaseAdmin.from('inventory').insert({ product_id: productId, quantity_available: 10 });
      if (error) throw error;
      seededInventory = true;
    } else {
      const { error } = await supabaseAdmin.from('inventory').update({ quantity_available: 10 }).eq('product_id', productId);
      if (error) throw error;
    }

    sessionToken = randomUUID();
  });

  afterAll(async () => {
    if (cartId) {
      await supabaseAdmin.from('carts').delete().eq('id', cartId); // cart_items تُحذف تلقائياً (on delete cascade)
    }
    if (seededInventory) {
      await supabaseAdmin.from('inventory').delete().eq('product_id', productId);
    }
  });

  it('getOrCreateCart بنفس session_token يُعيد نفس السلة في المرة الثانية (idempotent)', async () => {
    const first = await cartService.getOrCreateCart({ sessionToken });
    const second = await cartService.getOrCreateCart({ sessionToken });
    expect(second.id).toBe(first.id);
    cartId = first.id;
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
    const product = await catalogRepository.findProductByName('دجاجة كاملة طازجة');
    if (!product) throw new Error('منتج الاختبار "دجاجة كاملة طازجة" غير موجود في قاعدة البيانات الحقيقية');
    productId = product.id;
    await supabaseAdmin.from('inventory').update({ quantity_available: 10 }).eq('product_id', productId);

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
  });

  it('اختبار أمني حاسم: ترفض حياً حذف بند ينتمي لسلة أخرى عبر cartId مختلف، بلا حذف صامت', async () => {
    await expect(cartService.removeItem(cartAId, itemInCartBId)).rejects.toThrow(/غير موجود/);

    const itemsStillInCartB = await cartService.getSummary(cartBId);
    expect(itemsStillInCartB.lines.some((l) => l.item.id === itemInCartBId)).toBe(true);
  });
});
