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

  // عدّاد الـHeader (اليوم 14) — مجموع الكميات لا عدد الأصناف (3 وحدات من صنف واحد تُعرَض "3"، لا
  // "1"). يعيد استخدام findItems الموجودة أصلاً بدل إضافة استعلام SQL مخصَّص — لا حاجة فعلية له
  // عند هذا الحجم من البيانات (نفس فلسفة "لا نبني أكثر من المطلوب فعلاً").
  async getItemCount(cartId: string): Promise<number> {
    const items = await cartRepository.findItems(cartId);
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // قراءة فقط — عمداً لا تستدعي getOrCreateCart. الـHeader (اليوم 14) يظهر في كل صفحات (reef)،
  // بما فيها /cart و/checkout حيث تستدعي الصفحة نفسها getOrCreateCart بالتوازي (RSC تُحلّل
  // المكوّنات غير المعتمدة على بعضها بالتوازي في نفس الجولة) — لو استدعى الـHeader أيضاً
  // getOrCreateCart بنفس التوكن الجديد، يتسابق الاثنان على إدراج نفس session_token (UNIQUE)
  // ويفشل الخاسر بخطأ قيد فريد. تجنّب حقيقي للسباق لا معالجة له بعد وقوعه: لا سلة بعد لهذا
  // التوكن يعني حرفياً "لا عناصر"، فالقراءة وحدها صحيحة ومكتملة هنا.
  async getItemCountForSession(sessionToken: string): Promise<number> {
    const cart = await cartRepository.findCartBySessionToken(sessionToken);
    if (!cart) return 0;
    return this.getItemCount(cart.id);
  }

  // TODO(BR-016): لا حد أدنى للطلب مطبَّق بعد — القيمة غير معتمدة رسمياً.
  // راجع docs/BUSINESS_RULES.md → BR-016 (OPEN_QUESTION) قبل الإطلاق.
  //
  // REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 2: كانت هذه الدالة تجلب البنود
  // (findItems) ثم تستعلم عن كل منتج على حدة (N استعلام متوازٍ عبر Promise.all) — قياس حي أثبت
  // أن استعلاماً واحداً مُجمَّعاً (findItemsWithProducts، JOIN عبر FK) بنفس زمن استعلام مفرد
  // تقريباً، بدل رحلتي شبكة متتاليتين. الإصلاح مطبَّق هنا عالمياً (كل مستدعي getSummary/
  // getSummaryForCart يستفيد بلا تغيير إضافي).
  async getSummary(cartId: string): Promise<CartSummary> {
    const cart = await cartRepository.findCartById(cartId);
    if (!cart) throw new Error(`السلة غير موجودة: ${cartId}`);
    return this.buildSummary(cart);
  }

  // REBUILD-CART-CHECKOUT-FROM-LOVABLE-REFERENCE دفعة 2: مسار سريع لمستدعٍ يملك كائن Cart كاملاً
  // فعلاً (مثال: getCartSummaryAction بعد getOrCreateCart، أو orders.service.ts.performCheckout)
  // — يتجنّب إعادة جلب نفس صف carts بمعرّفه (findCartById) رغم معرفته مسبقاً، وهي رحلة شبكة
  // كاملة زائدة قِيست حياً (~85-150ms) على كل تحميل صفحة /cart و/checkout قبل هذا الإصلاح.
  async getSummaryForCart(cart: Cart): Promise<CartSummary> {
    return this.buildSummary(cart);
  }

  private async buildSummary(cart: Cart): Promise<CartSummary> {
    const itemsWithProducts = await cartRepository.findItemsWithProducts(cart.id);
    const lines = itemsWithProducts.map(({ item, product }) => {
      const unitPrice = catalogService.calculatePrice(product, item.selection);
      return { item, product, unitPrice, lineTotal: unitPrice * item.quantity };
    });

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

  // اليوم 12 (ADR-014، IDOR): يتحقق أن itemId ينتمي فعلاً لـcartId قبل الحذف — نفس نمط
  // updateItemQuantity المجاور تماماً. carts/cart_items بلا جلسة حقيقية (سلة زائر)، فحماية
  // UUID وحدها غير كافية (docs/SECURITY.md قاعدة 5، النمط 2).
  async removeItem(cartId: string, itemId: string): Promise<CartSummary> {
    const items = await cartRepository.findItems(cartId);
    const item = items.find((i) => i.id === itemId);
    if (!item) throw new Error(`بند السلة غير موجود: ${itemId}`);

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
