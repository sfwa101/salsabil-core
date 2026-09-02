// src/core/modules/cart/cart.service.ts
// منطق أعمال السلة — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر cartRepository
// السعر يُحسَب دائماً حياً عبر catalogService.calculatePrice — لا تكرار لمنطق التسعير هنا

import { cartRepository } from './cart.repository';
import { catalogService } from '../catalog/catalog.service';
import { inventoryService } from '../inventory/inventory.service';
import type { ProductSelection } from '../catalog/types';
import type { AddItemInput, Cart, CartIdentity, CartSummary } from './types';

function selectionsMatch(a: ProductSelection, b: ProductSelection): boolean {
  if (a.sizeId !== b.sizeId) return false;
  const aAddons = [...(a.addonIds ?? [])].sort();
  const bAddons = [...(b.addonIds ?? [])].sort();
  if (aAddons.length !== bAddons.length) return false;
  return aAddons.every((id, i) => id === bAddons[i]);
}

export class CartService {
  async getOrCreateCart(identity: CartIdentity): Promise<Cart> {
    if ('userId' in identity) {
      const existing = await cartRepository.findCartByUserId(identity.userId);
      return existing ?? cartRepository.createCartForUser(identity.userId);
    }
    const existing = await cartRepository.findCartBySessionToken(identity.sessionToken);
    return existing ?? cartRepository.createCartForSession(identity.sessionToken);
  }

  // TODO(BR-016): لا حد أدنى للطلب مطبَّق بعد — القيمة غير معتمدة رسمياً.
  // راجع docs/BUSINESS_RULES.md → BR-016 (OPEN_QUESTION) قبل الإطلاق.
  async getSummary(cartId: string): Promise<CartSummary> {
    const cart = await cartRepository.findCartById(cartId);
    if (!cart) throw new Error(`السلة غير موجودة: ${cartId}`);

    const items = await cartRepository.findItems(cartId);
    const lines = await Promise.all(
      items.map(async (item) => {
        const product = await catalogService.getProductById(item.productId);
        if (!product) throw new Error(`المنتج غير موجود: ${item.productId}`);
        const unitPrice = catalogService.calculatePrice(product, item.selection);
        return { item, product, unitPrice, lineTotal: unitPrice * item.quantity };
      })
    );

    return { cart, lines, total: lines.reduce((sum, line) => sum + line.lineTotal, 0) };
  }

  async addItem(cartId: string, input: AddItemInput): Promise<CartSummary> {
    if (input.quantity <= 0) {
      throw new Error('الكمية يجب أن تكون أكبر من صفر');
    }

    const product = await catalogService.getProductById(input.productId);
    if (!product || !product.isActive) {
      throw new Error(`المنتج غير متاح: ${input.productId}`);
    }

    const selection = input.selection ?? {};
    if (!catalogService.validateSelection(product, selection)) {
      throw new Error(`اختيار غير صالح للمنتج ${input.productId}`);
    }

    const existingItems = await cartRepository.findItems(cartId);
    const matchingItem = existingItems.find(
      (item) => item.productId === input.productId && selectionsMatch(item.selection, selection)
    );
    const desiredQuantity = (matchingItem?.quantity ?? 0) + input.quantity;

    const available = await inventoryService.isAvailable(input.productId, desiredQuantity);
    if (!available) {
      throw new Error(`الكمية المطلوبة غير متوفرة في المخزون للمنتج ${input.productId}`);
    }

    if (matchingItem) {
      await cartRepository.updateItemQuantity(matchingItem.id, desiredQuantity);
    } else {
      await cartRepository.insertItem(cartId, input.productId, input.quantity, selection);
    }

    return this.getSummary(cartId);
  }

  async updateItemQuantity(cartId: string, itemId: string, quantity: number): Promise<CartSummary> {
    if (quantity <= 0) {
      return this.removeItem(cartId, itemId);
    }

    const items = await cartRepository.findItems(cartId);
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new Error(`بند السلة غير موجود: ${itemId}`);

    const available = await inventoryService.isAvailable(item.productId, quantity);
    if (!available) {
      throw new Error(`الكمية المطلوبة غير متوفرة في المخزون للمنتج ${item.productId}`);
    }

    await cartRepository.updateItemQuantity(itemId, quantity);
    return this.getSummary(cartId);
  }

  async removeItem(cartId: string, itemId: string): Promise<CartSummary> {
    await cartRepository.deleteItem(itemId);
    return this.getSummary(cartId);
  }

  /**
   * تُفرَغ السلة بالكامل بعد تحويلها لطلب ناجح (Orders، اليوم 8) — لا تبقى بنود
   * "شبح" طُلبت بالفعل. يُستدعى عبر طبقة الخدمة من نطاق آخر، لا المستودع مباشرة
   * (docs/ARCHITECTURE.md §7).
   */
  async clearCart(cartId: string): Promise<void> {
    const items = await cartRepository.findItems(cartId);
    await Promise.all(items.map((item) => cartRepository.deleteItem(item.id)));
  }
}

export const cartService = new CartService();
