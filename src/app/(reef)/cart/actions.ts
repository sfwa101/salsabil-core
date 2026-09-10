'use server';
// السلة تُعرَّف عبر session_token في cookie httpOnly — لا يُقرأ أي معرّف من قيمة يرسلها العميل
// مباشرة (ADR-008 في docs/DECISIONS.md). كل الوصول لبيانات السلة يمر عبر cartService.

import { revalidatePath } from 'next/cache';
import { cartService } from '@/core/modules/cart/cart.service';
import { getCartIdentity, getExistingCartIdentity } from '@/core/modules/cart/cart-session';
import type { AddItemInput, CartSummary } from '@/core/modules/cart/types';

type ActionResult = { summary: CartSummary } | { error: string };

export async function getCartSummaryAction(): Promise<CartSummary> {
  const identity = await getCartIdentity();
  const cart = await cartService.getOrCreateCart(identity);
  // getSummaryForCart لا getSummary(cart.id) — نملك cart كاملاً بالفعل، لا داعٍ لإعادة جلبه
  // بمعرّفه (REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 2).
  return cartService.getSummaryForCart(cart);
}

// للـHeader (اليوم 14) — يُستدعى من كل صفحات (reef)، بما فيها صفحات لا تمس السلة إطلاقاً
// (الرئيسية، الأقسام، المنتج). يقرأ الكوكي بلا إنشائها (getExistingCartIdentity) عمداً: لا
// كتابة كوكي أثناء عرض RSC (نفس مشكلة اليوم 14 الأصلية)، ولا داعٍ لإنشاء سلة لزائر لم يلمسها.
// CUSTOMER-IDENTITY-PHASE-1: getExistingCartIdentity تفحص جلسة عميل مسجَّل أولاً — بلا هذا كان
// عدّاد الهيدر سيبقى صفراً دائماً لعميل مسجَّل دخوله فعلياً.
export async function getCartItemCountAction(): Promise<number> {
  const identity = await getExistingCartIdentity();
  if (!identity) return 0;
  return cartService.getItemCountForIdentity(identity);
}

// FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 1ب) — للهيدر (CartCapsule.tsx)، يعرض الآن الإجمالي بالجنيه
// لا عدد القطع. نفس نمط getCartItemCountAction حرفياً.
export async function getCartTotalAction(): Promise<number> {
  const identity = await getExistingCartIdentity();
  if (!identity) return 0;
  return cartService.getTotalForIdentity(identity);
}

// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 2) — لصفحة الحي ([category]/
// page.tsx): تحتاج الملخّص الكامل (لمعرفة كمية كل منتج مُضافة مسبقاً)، لا الإجمالي فقط. **لا تستخدم
// getCartSummaryAction أعلاه هنا** — تلك تستدعي getCartIdentity() (تكتب كوكي عند غيابه)، وهذا يفشل
// فعلياً (خطأ Next.js حقيقي، مُتحقَّق منه حياً: "Cookies can only be modified in a Server Action or
// Route Handler") عند أول عرض RSC لزائر بلا أي كوكي سلة سابق. نفس نمط getCartItemCountAction حرفياً
// (قراءة فقط، بلا سلة = null).
export async function getCartSummaryIfExistsAction(): Promise<CartSummary | null> {
  const identity = await getExistingCartIdentity();
  if (!identity) return null;
  return cartService.getSummaryForIdentityIfExists(identity);
}

export async function addToCartAction(input: AddItemInput): Promise<ActionResult> {
  const identity = await getCartIdentity();
  const cart = await cartService.getOrCreateCart(identity);
  try {
    const summary = await cartService.addItem(cart.id, input);
    revalidatePath('/cart');
    // CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01: استثناء صريح مُوافَق عليه من المؤسس —
    // Header.tsx (layout.tsx مشترك عبر (reef) بالكامل) يعرض عدّاد السلة (CartCapsule.tsx) وبلا هذا
    // السطر لا يُعاد جلبه بعد الإضافة (revalidatePath('/cart') وحده لا يمس الطبقة المشتركة). لا
    // تعديل آخر على منطق السلة نفسه.
    revalidatePath('/');
    return { summary };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult> {
  const identity = await getCartIdentity();
  const cart = await cartService.getOrCreateCart(identity);
  try {
    const summary = await cartService.updateItemQuantity(cart.id, itemId, quantity);
    revalidatePath('/cart');
    return { summary };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'حدث خطأ غير متوقع' };
  }
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const identity = await getCartIdentity();
  const cart = await cartService.getOrCreateCart(identity);
  const summary = await cartService.removeItem(cart.id, itemId);
  revalidatePath('/cart');
  return { summary };
}
