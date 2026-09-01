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
