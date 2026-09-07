// src/core/modules/orders/orders.service.ts
// تحويل سلة إلى طلب + دورة حياة الطلب الكاملة (اليوم 9) — يستدعي CatalogService/InventoryService/
// CartService/KhalilService حياً، لا يُعيد كتابة أي من منطقها (docs/ARCHITECTURE.md §3، §7)

import { cartService } from '../cart/cart.service';
import type { Cart } from '../cart/types';
import { catalogService } from '../catalog/catalog.service';
import { inventoryService } from '../inventory/inventory.service';
import { khalilService } from '../../kernel/khalil/service';
import { auditService } from '../audit/audit.service';
import { cashOnDeliveryProvider } from '../payments/cash-on-delivery.provider';
import { ordersRepository } from './orders.repository';
import {
  ORDER_TRANSITIONS,
  ORDER_TRANSITION_ACTORS,
  type CheckoutInput,
  type Order,
  type OrderActorContext,
  type OrderActorRole,
  type OrderCustomerView,
  type OrderStatusHistoryEntry,
  type OrderWithItems,
  type TransitionOrderStatusInput,
} from './types';

// أدوار مرتبطة بتاجر محدد — يجب أن يطابق tenantId المُرسَل tenant_id الطلب نفسه (اليوم 10).
// platform_admin يرى/يُغيّر كل شيء بلا قيد تاجر، system لا يُستخدَم فعلياً بعد الإنشاء الأولي.
const TENANT_SCOPED_ACTOR_ROLES: readonly OrderActorRole[] = ['merchant_owner', 'merchant_manager', 'employee'];

// CRITICAL-FIXES-FROM-AUDIT-001، بند 1 (Idempotency) — قفل "Single-Flight" في-الذاكرة بمفتاح
// cartId: طلبان متزامنان فعليان لنفس السلة (تبويبان، إعادة إرسال بعد Timeout ظاهري بينما الطلب
// الأول ما زال قيد التنفيذ، استدعاء برمجي مكرَّر) يتشاركان نفس الـ Promise قيد التنفيذ فيحصلان
// على نفس نتيجة الطلب بالضبط، بدل تنفيذ Checkout مرتين فعلياً. اختير هذا بدل "فحص طلب pending
// حديث بنفس cartId خلال نافذة زمنية" لأن الأخير يترك نافذة سباق فعلية (كلا الطلبين قد ينفّذان
// الفحص قبل أن يُدرج أي منهما صفه) — لا تُغلَق فعلياً بفحص TOCTOU آخر فوق الأول. الحالة
// "إعادة محاولة حقيقية بعد نجاح فعلي سابق" (لا تزامن حقيقي، طلب لاحق منفصل تماماً) محمية أصلاً
// بسلوك قائم: clearCart() في نهاية checkout() تُفرغ السلة، فإعادة محاولة لاحقة على نفس السلة
// تُقابَل بخطأ "السلة فارغة" الواضح بدل إنشاء طلب مكرَّر — لا حاجة لآلية إضافية لهذه الحالة.
//
// قيد معروف (نفس فئة src/core/kernel/security/rate-limit.ts بالضبط): لا ينجو من إعادة تشغيل
// الخادم أو تعدد النسخ (Serverless/عدة خوادم) — يحمي فعلياً من التزامن داخل نفس العملية فقط، وهو
// بالضبط ما يغطيه اختبار Promise.all المطلوب. يجب إعادة تقييمه (قفل موزَّع) قبل نشر متعدد الخوادم.
const inFlightCheckouts = new Map<string, Promise<Order>>();

export class OrdersService {
  // TODO(BR-016): لا حد أدنى لقيمة الطلب مطبَّق بعد — القيمة غير معتمدة رسمياً.
  // راجع docs/BUSINESS_RULES.md → BR-016 (OPEN_QUESTION) قبل الإطلاق.
  async checkout(input: CheckoutInput): Promise<Order> {
    const cart = await cartService.getOrCreateCart(input.identity);

    const existing = inFlightCheckouts.get(cart.id);
    if (existing) return existing;

    const promise = this.performCheckout(cart, input).finally(() => {
      inFlightCheckouts.delete(cart.id);
    });
    inFlightCheckouts.set(cart.id, promise);
    return promise;
  }

  // GUARDIAN-FINDINGS-REMEDIATION-001، بند 3 — تبرير موثَّق لتجاوز حد الـ50 سطراً (Complexity
  // Budget، AGENTS.md §4): الطول هنا تسلسل خطوات Checkout الطبيعي الواحدة تلو الأخرى (تحقق سلة →
  // تحقق نشاط المنتج → تحقق تاجر واحد → خصم مخزون ذرّي لكل بند → عميل → دفع → إنشاء طلب → بنود →
  // تفريغ سلة → سجل تدقيق)، كل خطوة سطر أو اثنان فقط، بلا تفرّع منطقي معقَّد (لا حلقات متداخلة، لا
  // شروط متشابكة) — تقسيمها لدوال فرعية متعددة يُشتِّت قراءة تسلسل معاملة واحدة منطقياً (Checkout)
  // بلا فائدة حقيقية لا في الاختبار (كل خطوة مُختبَرة عبر مسارات checkout() الكاملة أصلاً، لا
  // منعزلة) ولا في القراءة (القارئ يحتاج التسلسل الكامل لفهم حدود التعويض في catch أدناه على أي
  // حال). هذا استثناء مبرَّر موثَّق، لا تجاهلاً صامتاً للحد — راجع ADR-022 للتفصيل الكامل.
  private async performCheckout(cart: Cart, input: CheckoutInput): Promise<Order> {
    // getSummaryForCart لا getSummary(cart.id) — نفس إصلاح REBUILD-CART-CHECKOUT-FROM-LOVABLE-
    // REFERENCE دفعة 2: cart مُمرَّر بالفعل من checkout()، لا داعٍ لإعادة جلبه بمعرّفه.
    const summary = await cartService.getSummaryForCart(cart);

    if (summary.lines.length === 0) {
      throw new Error('السلة فارغة');
    }

    for (const line of summary.lines) {
      if (!line.product.isActive) {
        throw new Error(`المنتج "${line.product.name}" لم يعد متاحاً`);
      }
    }

    const tenantIds = new Set(summary.lines.map((line) => line.product.tenantId));
    if (tenantIds.size > 1) {
      throw new Error('طلبات من أكثر من تاجر واحد غير مدعومة بعد');
    }
    const tenantId = summary.lines[0].product.tenantId;
    if (!tenantId) {
      throw new Error(`المنتج "${summary.lines[0].product.name}" غير مرتبط بتاجر — لا يمكن إتمام الطلب`);
    }

    // CRITICAL-FIXES-FROM-AUDIT-001، بند 2 — نقطة الاستهلاك الفعلية للمخزون: خصم ذرّي شرطي واحد
    // لكل بند (لا فحص isAvailable ثم قرار منفصل، ذلك بالضبط ما كان يسمح بسباق TOCTOU/بيع مضاعف).
    // reservations تتبّع ما نجح خصمه فعلياً في هذه المحاولة بالذات — ضرورية للتعويض أدناه (بند 3)
    // لو فشلت خطوة لاحقة (دفع/إنشاء طلب/بنود) بعد خصم ناجح لبعض البنود.
    const reservations: Array<{ productId: string; quantity: number }> = [];
    try {
      for (const line of summary.lines) {
        const reserved = await inventoryService.reserve(line.product.id, line.item.quantity);
        if (!reserved) {
          throw new Error(`الكمية المطلوبة من "${line.product.name}" غير متوفرة في المخزون الآن`);
        }
        reservations.push({ productId: line.product.id, quantity: line.item.quantity });
      }

      const user = await khalilService.findOrCreateCustomerByPhone(input.customerName, input.customerPhone);

      const paymentResult = await cashOnDeliveryProvider.charge(summary.total);
      if (!paymentResult.success) {
        throw new Error('فشلت عملية الدفع');
      }

      const order = await ordersRepository.createOrder({
        userId: user.id,
        tenantId,
        paymentMethod: cashOnDeliveryProvider.method,
        deliveryAddress: input.deliveryAddress,
        total: summary.total,
      });

      try {
        await ordersRepository.createOrderItems(
          order.id,
          summary.lines.map((line) => ({
            productId: line.product.id,
            quantity: line.item.quantity,
            selection: line.item.selection,
            unitPriceSnapshot: line.unitPrice,
          }))
        );
      } catch (e) {
        await ordersRepository.deleteOrder(order.id);
        throw e;
      }

      await cartService.clearCart(cart.id);

      // أول قيد في سجل التدقيق — الحالة الابتدائية 'pending' بلا حالة سابقة، فاعلها النظام
      // نفسه لا مستخدماً بشرياً (CONSTITUTION §4 بند 5: كل تحوّل يُسجَّل من فعله ومتى ولماذا)
      await ordersRepository.insertStatusHistory({
        orderId: order.id,
        fromStatus: null,
        toStatus: 'pending',
        actorRole: 'system',
      });

      return order;
    } catch (e) {
      // CRITICAL-FIXES-FROM-AUDIT-001، بند 3 — حدود المعاملة (Transaction Boundaries): لا معاملة
      // DB ذرّية حقيقية تربط خصم المخزون بإنشاء الطلب (نفس القيد الموثَّق أصلاً في ADR-009 بين
      // orders وorder_items — لا حاجة لبناء معاملات موزعة كاملة لأجل هذا، تعويض تطبيقي صريح كافٍ
      // عند هذا الحجم). لو نجح خصم مخزون بند واحد أو أكثر ثم فشلت أي خطوة لاحقة (بند آخر غير
      // متوفر، فشل دفع COD نظري، فشل إنشاء الطلب نفسه) — يُعاد كل ما خُصم في هذه المحاولة بالذات
      // فوراً، قبل رمي الخطأ الأصلي للمتصل.
      //
      // GUARDIAN-FINDINGS-REMEDIATION-001، بند 4 — فشل الاسترجاع نفسه (شبكة، إلخ) **لا يُستبدَل
      // به الخطأ الأصلي بعد الآن** (تصحيح: النسخة السابقة كانت تترك Promise.all يرمي فيستبدل خطأ
      // العميل الحقيقي — "غير متوفر" مثلاً — برسالة داخلية غامضة عن فشل الاسترجاع، أسوأ تجربة لا
      // أفضل). كل عنصر فشل استرجاعه يُسجَّل تحديداً في audit_log (productId + quantity + سبب
      // الفشل) — فقدان صامت لكمية مخزون حقيقية أخطر من عدم تسجيله، لكن العميل يجب أن يرى سبب فشل
      // طلبه الحقيقي دائماً، لا عطلاً داخلياً غير ذي صلة (نفس فلسفة "فشل صريح لا نجاح صامت" في
      // ADR-020/ADR-009، مطبَّقة هنا على *ما يُسجَّل* لا *ما يُرمى للمتصل*).
      if (reservations.length > 0) {
        await Promise.all(
          reservations.map(async (r) => {
            try {
              await inventoryService.release(r.productId, r.quantity);
            } catch (releaseError) {
              await auditService
                .log({
                  actorRole: 'system',
                  action: 'inventory.release_failed',
                  entityType: 'inventory',
                  entityId: r.productId,
                  metadata: {
                    quantity: r.quantity,
                    reason: releaseError instanceof Error ? releaseError.message : String(releaseError),
                  },
                })
                .catch(() => {}); // تسجيل التدقيق نفسه لا يجوز أن يُسقِط أو يستبدل الخطأ الأصلي أدناه
            }
          })
        );
      }
      throw e;
    }
  }

  // CRITICAL-FIXES-FROM-AUDIT-001، بند 4 — كانت هذه الدالة بلا أي فحص تاجر داخلي (فخّ كامن، لا
  // ثغرة نشطة — لا مستهلك فعلي وُجد في src/app وقت التدقيق، تحقَّقتُ منه مجدداً قبل هذا التعديل
  // عبر بحث شامل في src/ ولم يتغيّر). التوقيع الآن يتطلب actor: OrderActorContext إلزامياً —
  // نفس شكل tenantId/role في TransitionOrderStatusInput — بحيث يفشل أي استدعاء مستقبلي بلا سياق
  // فاعل وقت الترجمة (compile error)، لا وقت التشغيل فقط. راجع assertActorCanAccessOrder أدناه.
  async getOrderWithItems(actor: OrderActorContext, orderId: string): Promise<OrderWithItems | null> {
    const order = await ordersRepository.findOrderById(orderId);
    if (!order) return null;
    this.assertActorCanAccessOrder(order, actor);
    const items = await ordersRepository.findOrderItems(orderId);
    return { order, items };
  }

  // صفحة تتبّع الطلب للعميل الضيف (اليوم 14، /order/[id]) — بلا فحص تاجر/جلسة عمداً، ومختلفة
  // عن التحذير أعلاه: التحذير يخاطب فاعلاً تابعاً لتاجر (أدوار merchant_*) قد يخمّن orderId
  // ليطّلع على طلب تاجر آخر خارج نطاقه. هنا لا فاعل تاجر ولا جلسة إطلاقاً — عميل ضيف (بلا حساب،
  // بقرار صريح في نطاق هذا اليوم) يملك رابطاً دائماً يحمل orderId (UUID عشوائي غير قابل للتخمين
  // عملياً، gen_random_uuid()) كآلية تفويض بحد ذاتها — نفس نمط "رقم تتبّع شحنة" شائع في أي خدمة
  // توصيل حقيقية. لتقليل الأثر لو تسرَّب رابط لطرف غير مقصود: هذه الدالة (ومستهلكها الوحيد،
  // الصفحة) لا تُعيد عنوان التوصيل ولا هاتف/اسم العميل — الحالة والعناصر والإجمالي فقط.
  async getOrderForCustomerView(orderId: string): Promise<OrderCustomerView | null> {
    const order = await ordersRepository.findOrderById(orderId);
    if (!order) return null;

    const items = await ordersRepository.findOrderItems(orderId);
    const itemsWithProductNames = await Promise.all(
      items.map(async (item) => {
        const product = await catalogService.getProductById(item.productId);
        return { item, productName: product?.name ?? null };
      })
    );

    return { order, items: itemsWithProductNames };
  }

  // CRITICAL-FIXES-FROM-AUDIT-001، بند 4 — نفس إصلاح getOrderWithItems أعلاه بالضبط. يتطلب جلب
  // الطلب أولاً الآن (استعلام إضافي واحد) لمعرفة tenantId الحقيقي قبل الفحص — لم يكن ذلك ضرورياً
  // سابقاً لأن لا فحص كان موجوداً أصلاً. طلب غير موجود يرمي خطأً صريحاً (لا مصفوفة فارغة صامتة) —
  // نفس فلسفة "فشل صريح لا نجاح صامت" المتَّبعة في transitionStatus المجاورة تماماً.
  async getStatusHistory(actor: OrderActorContext, orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const order = await ordersRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('الطلب غير موجود');
    }
    this.assertActorCanAccessOrder(order, actor);
    return ordersRepository.findStatusHistory(orderId);
  }

  // مشترك بين transitionStatus وgetOrderWithItems وgetStatusHistory — نفس منطق عزل المستأجرين
  // بالضبط (ADR-012)، لا نسخة ثالثة منه. platform_admin يتجاوز دائماً (يرى/يُغيّر كل شيء).
  private assertActorCanAccessOrder(order: Order, actor: OrderActorContext): void {
    if (TENANT_SCOPED_ACTOR_ROLES.includes(actor.role) && actor.tenantId !== order.tenantId) {
      throw new Error('هذا الطلب لا يخص تاجرك — لا يمكنك الاطلاع عليه');
    }
  }

  // طلبات تاجر واحد فقط — للوحة التاجر (اليوم 10). tenantId يجب أن يأتي من الجلسة، أبداً من
  // مدخل يتحكم به العميل (CONSTITUTION §4 بند 3) — هذا الالتزام مسؤولية المستدعي (Server Action).
  async getOrdersForTenant(tenantId: string): Promise<Order[]> {
    return ordersRepository.findOrdersByTenantId(tenantId);
  }

  // كل الطلبات من كل التجار — للوحة الإدارة فقط (اليوم 11). لا تحقق صلاحية هنا — مسؤولية
  // المستدعي (Server Action) التأكد أن الفاعل platform_admin قبل الوصول لهذه الدالة.
  async getAllOrders(): Promise<Order[]> {
    return ordersRepository.findAll();
  }

  // "غالباً ما يُشترى معه" في السلة — راجع findMostOrderedProductIds في orders.repository.ts.
  // تُعيد معرّفات منتجات فقط؛ حلّها لكائنات Product كاملة مسؤولية المستدعي عبر
  // catalogService.getProductsByIds (لا استيراد catalog.repository.ts هنا — يحترم عزل النطاقات).
  async getMostOrderedProductIds(excludeIds: string[], limit: number): Promise<string[]> {
    return ordersRepository.findMostOrderedProductIds(excludeIds, limit);
  }

  // سجل تدقيق خاص بالطلبات فقط — للوحة الإدارة (اليوم 11). يعرض order_status_history تحديداً،
  // منفصل عمداً عن audit_log العام (اليوم 12، ADR-014) الذي يغطي ما هو خارج نطاق الطلب.
  async getRecentStatusHistory(limit: number = 50): Promise<OrderStatusHistoryEntry[]> {
    return ordersRepository.findAllStatusHistory(limit);
  }

  // ينفّذ انتقال حالة واحداً وفق آلة الحالات في types.ts (ORDER_TRANSITIONS)، ويرفض أي انتقال
  // غير مسموح أو فاعل غير مخوَّل بدل تنفيذه صامتاً — نفس منطق الرفض الصريح في checkout()
  async transitionStatus(input: TransitionOrderStatusInput): Promise<Order> {
    const order = await ordersRepository.findOrderById(input.orderId);
    if (!order) {
      throw new Error('الطلب غير موجود');
    }

    // عزل المستأجرين (اليوم 10): فاعل تابع لتاجر لا يستطيع لمس طلب تاجر آخر، حتى لو كان
    // الانتقال والدور نفسهما صحيحين لولا هذا القيد — يُفحَص أولاً، قبل حتى صحة الانتقال،
    // لتفادي تسريب أي معلومة عن حالة طلب لا يملك الفاعل حق رؤيته أصلاً. نفس الفحص المشترك
    // المُستخدَم الآن في getOrderWithItems/getStatusHistory (بند 4، CRITICAL-FIXES-FROM-AUDIT-001)
    // — لا نسخة ثالثة من نفس المنطق.
    this.assertActorCanAccessOrder(order, { role: input.actorRole, tenantId: input.tenantId });

    const allowedNextStatuses = ORDER_TRANSITIONS[order.status];
    if (!allowedNextStatuses.includes(input.toStatus)) {
      throw new Error(`لا يمكن الانتقال من الحالة "${order.status}" إلى "${input.toStatus}"`);
    }

    const allowedActors = ORDER_TRANSITION_ACTORS[input.toStatus];
    if (!allowedActors.includes(input.actorRole)) {
      throw new Error(`الدور "${input.actorRole}" غير مخوَّل لتغيير الحالة إلى "${input.toStatus}"`);
    }

    const updatedOrder = await ordersRepository.updateOrderStatus(input.orderId, input.toStatus);

    await ordersRepository.insertStatusHistory({
      orderId: input.orderId,
      fromStatus: order.status,
      toStatus: input.toStatus,
      actorRole: input.actorRole,
      actorId: input.actorId,
      note: input.note,
    });

    return updatedOrder;
  }
}

export const ordersService = new OrdersService();
