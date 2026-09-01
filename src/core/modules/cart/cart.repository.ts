// src/core/modules/cart/cart.repository.ts
// الاتصال بقاعدة البيانات الخاص بالسلة — لا منطق أعمال هنا، فقط قراءة/كتابة
// يستخدم عميل service_role (لا العميل العام) — RLS يمنع anon بالكامل على carts/cart_items (ADR-008)

import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { Cart, CartItem } from './types';
import type { ProductSelection } from '../catalog/types';

interface CartRow {
  id: string;
  user_id: string | null;
  session_token: string | null;
  created_at: string;
}

interface CartItemRow {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  selection: ProductSelection;
  created_at: string;
}

function toCart(row: CartRow): Cart {
  return {
    id: row.id,
    userId: row.user_id,
    sessionToken: row.session_token,
    createdAt: row.created_at,
  };
}

function toCartItem(row: CartItemRow): CartItem {
  return {
    id: row.id,
    cartId: row.cart_id,
    productId: row.product_id,
    quantity: row.quantity,
    selection: row.selection ?? {},
    createdAt: row.created_at,
  };
}

export class CartRepository {
  async findCartById(cartId: string): Promise<Cart | null> {
    const { data, error } = await supabaseAdmin.from('carts').select('*').eq('id', cartId).maybeSingle();
    if (error) throw error;
    return data ? toCart(data as CartRow) : null;
  }

  async findCartByUserId(userId: string): Promise<Cart | null> {
    const { data, error } = await supabaseAdmin.from('carts').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? toCart(data as CartRow) : null;
  }

  async findCartBySessionToken(sessionToken: string): Promise<Cart | null> {
    const { data, error } = await supabaseAdmin.from('carts').select('*').eq('session_token', sessionToken).maybeSingle();
    if (error) throw error;
    return data ? toCart(data as CartRow) : null;
  }

  async createCartForUser(userId: string): Promise<Cart> {
    const { data, error } = await supabaseAdmin.from('carts').insert({ user_id: userId }).select('*').single();
    if (error) throw error;
    return toCart(data as CartRow);
  }

  async createCartForSession(sessionToken: string): Promise<Cart> {
    const { data, error } = await supabaseAdmin.from('carts').insert({ session_token: sessionToken }).select('*').single();
    if (error) throw error;
    return toCart(data as CartRow);
  }

  async findItems(cartId: string): Promise<CartItem[]> {
    const { data, error } = await supabaseAdmin.from('cart_items').select('*').eq('cart_id', cartId);
    if (error) throw error;
    return (data as CartItemRow[]).map(toCartItem);
  }

  async insertItem(cartId: string, productId: string, quantity: number, selection: ProductSelection): Promise<CartItem> {
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .insert({ cart_id: cartId, product_id: productId, quantity, selection })
      .select('*')
      .single();
    if (error) throw error;
    return toCartItem(data as CartItemRow);
  }

  async updateItemQuantity(itemId: string, quantity: number): Promise<CartItem> {
    const { data, error } = await supabaseAdmin
      .from('cart_items')
      .update({ quantity, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .select('*')
      .single();
    if (error) throw error;
    return toCartItem(data as CartItemRow);
  }

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('cart_items').delete().eq('id', itemId);
    if (error) throw error;
  }
}

export const cartRepository = new CartRepository();
