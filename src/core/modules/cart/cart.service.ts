// src/core/modules/cart/cart.service.ts
// منطق أعمال السلة — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر cartRepository
// السعر يُحسَب دائماً حياً عبر catalogService.calculatePrice — لا تكرار لمنطق التسعير هنا

import { cartRepository } from './cart.repository';
import { catalogService } from '../catalog/catalog.service';
import { inventoryService } from '../inventory/inventory.service';
import { roundToCents } from '../../kernel/money';
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

  // CUSTOMER-IDENTITY-PHASE-1 — الثلاثة أدناه كانت مقيَّدة بـsessionToken فقط (زائر حصراً) —
  // عُمِّمت إلى CartIdentity كاملة (userId أو sessionToken) وإلا يبقى عدّاد/إجمالي الهيدر صفراً
  // دائماً لعميل مسجَّل دخوله فعلياً (سلته بـuserId لا sessionToken). القراءة تبقى بلا
  // getOrCreateCart (نفس تحفُّظ التعليقات الأصلية أدناه — لا كتابة كوكي أثناء عرض RSC).
  private async findCartForIdentity(identity: CartIdentity): Promise<Cart | null> {
    if ('userId' in identity) return cartRepository.findCartByUserId(identity.userId);
    return cartRepository.findCartBySessionToken(identity.sessionToken);
  }

  // قراءة فقط — عمداً لا تستدعي getOrCreateCart. الـHeader (اليوم 14) يظهر في كل صفحات (reef)،
  // بما فيها /cart و/checkout حيث تستدعي الصفحة نفسها getOrCreateCart بالتوازي (RSC تُحلّل
  // المكوّنات غير المعتمدة على بعضها بالتوازي في نفس الجولة) — لو استدعى الـHeader أيضاً
  // getOrCreateCart بنفس التوكن الجديد، يتسابق الاثنان على إدراج نفس session_token (UNIQUE)
  // ويفشل الخاسر بخطأ قيد فريد. تجنّب حقيقي للسباق لا معالجة له بعد وقوعه: لا سلة بعد لهذا
  // التوكن يعني حرفياً "لا عناصر"، فالقراءة وحدها صحيحة ومكتملة هنا.
  async getItemCountForIdentity(identity: CartIdentity): Promise<number> {
    const cart = await this.findCartForIdentity(identity);
    if (!cart) return 0;
    return this.getItemCount(cart.id);
  }

  // FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 1ب) — كبسولة السلة في الهيدر تعرض الآن الإجمالي بالجنيه
  // لا عدد القطع. نفس نمط getItemCountForIdentity حرفياً (قراءة فقط، بلا getOrCreateCart، بلا سلة =
  // صفر) لكن عبر getSummary().total بدل getItemCount.
  async getTotalForIdentity(identity: CartIdentity): Promise<number> {
    const cart = await this.findCartForIdentity(identity);
    if (!cart) return 0;
    const summary = await this.getSummary(cart.id);
    return summary.total;
  }

  // FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 2) — [category]/page.tsx يحتاج
  // الملخّص الكامل (لا الإجمالي فقط) لمعرفة أي منتج مُضاف بالفعل وبأي كمية (QuantityStepper). نفس
  // نمط getTotalForIdentity/getItemCountForIdentity حرفياً: قراءة فقط، بلا getOrCreateCart — **حاسم
  // هنا تحديداً** لأن المستدعي (RSC صفحة حي) لا يجوز أن يكتب كوكي أثناء العرض (Next.js يرفض ذلك
  // خارج Server Action/Route Handler) — getCartSummaryAction القائمة تستدعي getCartIdentity()
  // (تُنشئ كوكي عند غيابه)، آمنة فقط من داخل Server Action حقيقي (مثال: /cart/page.tsx بعد أول
  // إضافة فعلية سابقة تكون قد أنشأت الكوكي بالفعل)، لا لأول زيارة عرض بلا أي كوكي سابق.
  async getSummaryForIdentityIfExists(identity: CartIdentity): Promise<CartSummary | null> {
    const cart = await this.findCartForIdentity(identity);
    if (!cart) return null;
    return this.getSummaryForCart(cart);
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
      return { item, product, unitPrice, lineTotal: roundToCents(unitPrice * item.quantity) };
    });

    return { cart, lines, total: roundToCents(lines.reduce((sum, line) => sum + line.lineTotal, 0)) };
  }

  async addItem(cartId: string, input: AddItemInput): Promise<CartSummary> {
    if (input.quantity <= 0) {
      throw new Error('الكمية يجب أن تكون أكبر من صفر');
    }

    // FIX-SEQUENTIAL-CART-QUERIES-PARALLEL (DD-014) — getProductById(productId) وfindItems(cartId)
    // مستقلان تماماً (مفتاحان مختلفان، لا يعتمد أحدهما على نتيجة الآخر) — كانا يُنفَّذان بالتتابع بلا
    // داعٍ. لا تغيير على منطق التحقق نفسه: إن كان المنتج غير صالح لاحقاً، ستكون findItems قد نُفِّذت
    // فعلاً (قراءة بلا أثر جانبي، تكلفتها الضائعة في مسار خطأ نادر مقبولة مقابل توفير رحلة شبكة كاملة
    // في المسار السليم).
    const [product, existingItems] = await Promise.all([
      catalogService.getProductById(input.productId),
      cartRepository.findItems(cartId),
    ]);
    if (!product || !product.isActive) {
      throw new Error(`المنتج غير متاح: ${input.productId}`);
    }

    const selection = input.selection ?? {};
    if (!catalogService.validateSelection(product, selection)) {
      throw new Error(`اختيار غير صالح للمنتج ${input.productId}`);
    }

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

  /**
   * CUSTOMER-IDENTITY-PHASE-1 — تُستدعى مرة واحدة عند أول دخول/تسجيل ناجح (Server Action الدخول/
   * التسجيل، بعد تعيين كوكي الجلسة مباشرة) لدمج سلة الضيف (session_token الحالي، إن وُجدت) داخل
   * سلة العميل المسجَّل. عند تعارض نفس المنتج بنفس الاختيار (selection) في السلتين: **تُجمَع
   * الكميات، لا استبدال** — قرار مؤسس صريح. لا إعادة فحص مخزون هنا عمداً (بعكس addItem) — محتوى
   * السلة مؤقت/غير مُلزِم دائماً بطبيعته، والفحص الحاسم يبقى عند Checkout فعلياً (ADR-022) بصرف
   * النظر عن مصدر البند. idempotent: بلا سلة ضيف قائمة أصلاً أو بلا بنود فيها، لا شيء يحدث سوى
   * حذف صف فارغ إن وُجد.
   */
  async mergeGuestCartIntoUser(guestSessionToken: string, userId: string): Promise<void> {
    const guestCart = await cartRepository.findCartBySessionToken(guestSessionToken);
    if (!guestCart) return;

    const guestItems = await cartRepository.findItems(guestCart.id);
    if (guestItems.length === 0) {
      await cartRepository.deleteCart(guestCart.id);
      return;
    }

    const userCart = await this.getOrCreateCart({ userId });
    const userItems = await cartRepository.findItems(userCart.id);

    for (const guestItem of guestItems) {
      const matching = userItems.find(
        (item) => item.productId === guestItem.productId && selectionsMatch(item.selection, guestItem.selection)
      );
      if (matching) {
        await cartRepository.updateItemQuantity(matching.id, matching.quantity + guestItem.quantity);
      } else {
        await cartRepository.insertItem(userCart.id, guestItem.productId, guestItem.quantity, guestItem.selection);
      }
    }

    await cartRepository.deleteCart(guestCart.id);
  }
}

export const cartService = new CartService();
