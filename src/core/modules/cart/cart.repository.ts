// src/core/modules/cart/cart.repository.ts
// الاتصال بقاعدة البيانات الخاص بالسلة — لا منطق أعمال هنا، فقط قراءة/كتابة
// يستخدم عميل service_role (لا العميل العام) — RLS يمنع anon بالكامل على carts/cart_items (ADR-008)

import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { Cart, CartItem } from './types';
import type { Product, ProductOption, ProductSelection } from '../catalog/types';

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

// نفس أعمدة ProductRow في catalog.repository.ts حرفياً — مُكرَّرة عمداً هنا لا مستوردة منها
// (dependency-cruiser يمنع أي repository.ts من استيراد repository.ts نطاق آخر،
// no-repository-cross-import، docs/ARCHITECTURE.md §3.1). القراءة نفسها عبر JOIN مستوى قاعدة
// البيانات (علاقة FK حقيقية cart_items.product_id → products.id، لا استيراد TS) — راجع REBUILD-
// CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 2 لتفصيل القياس الذي برَّر هذا (يدمج رحلتي شبكة
// متتاليتين في واحدة). SELECT * هنا آمن — تحقَّق صراحة أن كل أعمدة products عرض عام أصلاً
// (لا phone/owner_id ونحوه، تلك محصورة في merchants فقط).
interface EmbeddedProductRow {
  id: string;
  category_id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  unit: string;
  image_url: string | null;
  options: ProductOption[];
  is_active: boolean;
  created_at: string;
}

interface CartItemWithProductRow extends CartItemRow {
  products: EmbeddedProductRow;
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

// Postgres unique_violation — نفس الفحص المستخدَم في catalog.service.ts (rethrowFriendlySlugError).
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === '23505';
}

function toEmbeddedProduct(row: EmbeddedProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? undefined,
    basePrice: row.base_price,
    unit: row.unit,
    imageUrl: row.image_url ?? undefined,
    options: row.options ?? [],
    isActive: row.is_active,
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

  // DECISION-DEBT-004: getOrCreateCart (cart.service.ts) ليست ذرّية (SELECT ثم INSERT منفصلين) —
  // layout.tsx وcart/page.tsx (أو checkout/page.tsx) عنصرا RSC مستقلان يُنفَّذان بالتوازي لنفس
  // الطلب الأول لزائر جديد، كلاهما يستدعي getOrCreateCart بنفس session_token (موحَّد فعلياً عبر
  // proxy.ts قبل وصول أي منهما) فيتسابقان على INSERT نفس القيمة الفريدة. بدل منع السباق من الجذر
  // (كلا نقطتي الكتابة مشروعتان فعلياً هذه المرة، بعكس حالة الـHeader القديمة في ADR-016) — يُعالَج
  // هنا بإعادة قراءة عند فشل القيد الفريد (23505) بدل رميه كخطأ غير مُعالَج (500). أي خطأ آخر يُعاد
  // رمياً كما هو — لا ابتلاع صامت. نفس نمط rethrowFriendlySlugError في catalog.service.ts.
  //
  // ⚠️ لماذا إعادة القراءة هنا لا تستخدم findCartByUserId/findCartBySessionToken أعلاه: Next.js
  // "Request Memoization" (node_modules/next/dist/docs/.../04-functions/fetch.md §Memoization)
  // يُذكّر طلبات fetch المتطابقة (نفس URL) طوال جولة عرض الطلب الواحدة بالكامل، لا فقط طلبات
  // متزامنة فعلياً — القراءة الأولى (قبل الإدراج، داخل getOrCreateCart، لم تجد شيئاً وقتها بحق) لها
  // نفس URL الاستعلام تماماً، فتُعيد Next.js نتيجتها المخزَّنة "غير موجود" هنا بدل استعلام حقيقي —
  // تحقُّق حي مباشر على staging.reefam.com (لا محلياً، Vitest لا يُشغِّل بيئة Next.js فيُخفي هذا كلياً؛
  // احتمال 20/20 نجاح في اختبار Node مباشر بلا Next.js أيضاً — راجع Task Report للتفصيل الكامل).
  // AbortSignal جديد لكل استدعاء هو الآلية الرسمية الوحيدة الموثَّقة لتجاوز الذاكرة المؤقتة لهذه
  // القراءة تحديداً بلا المساس بالتذكّر المفيد في بقية القراءات (findCartById وغيرها).
  async createCartForUser(userId: string): Promise<Cart> {
    const { data, error } = await supabaseAdmin.from('carts').insert({ user_id: userId }).select('*').single();
    if (error) {
      if (isUniqueViolation(error)) {
        const { data: existing, error: retryError } = await supabaseAdmin
          .from('carts')
          .select('*')
          .eq('user_id', userId)
          .abortSignal(new AbortController().signal)
          .maybeSingle();
        if (retryError) throw retryError;
        if (existing) return toCart(existing as CartRow);
      }
      throw error;
    }
    return toCart(data as CartRow);
  }

  async createCartForSession(sessionToken: string): Promise<Cart> {
    const { data, error } = await supabaseAdmin.from('carts').insert({ session_token: sessionToken }).select('*').single();
    if (error) {
      if (isUniqueViolation(error)) {
        const { data: existing, error: retryError } = await supabaseAdmin
          .from('carts')
          .select('*')
          .eq('session_token', sessionToken)
          .abortSignal(new AbortController().signal)
          .maybeSingle();
        if (retryError) throw retryError;
        if (existing) return toCart(existing as CartRow);
      }
      throw error;
    }
    return toCart(data as CartRow);
  }

  async findItems(cartId: string): Promise<CartItem[]> {
    const { data, error } = await supabaseAdmin.from('cart_items').select('*').eq('cart_id', cartId);
    if (error) throw error;
    return (data as CartItemRow[]).map(toCartItem);
  }

  // استعلام واحد مُجمَّع (بدل findItems ثم استعلام منتج منفصل لكل بند) — راجع REBUILD-CART-
  // CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 2: قياس حي أثبت أن هذا يدمج رحلتي شبكة متتاليتين
  // (~85-150ms لكل منهما) في رحلة واحدة (~85-115ms) عبر JOIN حقيقي على FK قائم أصلاً
  // (cart_items.product_id → products.id، docs/DATABASE.md §3).
  async findItemsWithProducts(cartId: string): Promise<Array<{ item: CartItem; product: Product }>> {
    const { data, error } = await supabaseAdmin.from('cart_items').select('*, products(*)').eq('cart_id', cartId);
    if (error) throw error;
    return (data as CartItemWithProductRow[]).map((row) => ({
      item: toCartItem(row),
      product: toEmbeddedProduct(row.products),
    }));
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

  // CUSTOMER-IDENTITY-PHASE-1 — تُستهلَك بعد دمج سلة ضيف داخل سلة عميل مسجَّل (cartService.
  // mergeGuestCartIntoUser) لحذف صف السلة الفارغ الآن. cart_items تُحذف تلقائياً (on delete cascade).
  async deleteCart(cartId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('carts').delete().eq('id', cartId);
    if (error) throw error;
  }
}

export const cartRepository = new CartRepository();
