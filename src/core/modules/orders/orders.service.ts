// src/core/modules/orders/orders.service.ts
// تحويل سلة إلى طلب + دورة حياة الطلب الكاملة (اليوم 9) — يستدعي CatalogService/InventoryService/
// CartService/KhalilService حياً، لا يُعيد كتابة أي من منطقها (docs/ARCHITECTURE.md §3، §7)
//
// TASK-13 (specs/orders/PHASE_2_DOMAIN_DESIGN.md) — تحوّل معماري مُعلَن صراحة (AGENTS.md §13، لا
// تغيير صامت): checkout() لم يعد يرفض سلة متعددة التجار (ADR-009) — يجمّع بنودها حسب tenant_id،
// وينشئ customer_order واحد + merchant_suborder واحدة أو أكثر (جداول TASK-12، عبر
// customerOrder.repository.ts). كل دالة قراءة/انتقال حالة أخرى هنا (transitionStatus،
// getOrderWithItems، getStatusHistory، getOrdersForTenant، getAllOrders، getOrderForCustomerView،
// getRecentStatusHistory) أُعيد توجيهها معها لنفس الجداول الجديدة — merchant_suborders "بديل
// Drop-in" لصف orders القديم (§2.2 من الوثيقة)، فالعقد الخارجي (Order/OrderItem/
// OrderStatusHistoryEntry من ./types) لم يتغيّر، فقط مصدر البيانات. orders.repository.ts القديم
// (جدول orders/order_items/order_status_history) يبقى بلا أي تعديل ولا حذف بيانات — يتوقف فقط عن
// استقبال أي صف جديد من هذه اللحظة (قرار معتمَد صراحة، §8 بند 4 من الوثيقة)، ويبقى مستهلَكاً حصرياً
// من getMostOrderedProductIds أدناه (ميزة توصية غير حرجة، تبقى مبنية على بيانات ما قبل هذا التحوّل
// فقط من الآن فصاعداً — Remaining Finding مذكور في تقرير TASK-13).
import { cartService } from '../cart/cart.service';
import type { Cart } from '../cart/types';
import { catalogService } from '../catalog/catalog.service';
import { inventoryService } from '../inventory/inventory.service';
import { khalilService } from '../../kernel/khalil/service';
import { merchantService } from '../merchant/merchant.service';
import { auditService } from '../audit/audit.service';
import { cashOnDeliveryProvider } from '../payments/cash-on-delivery.provider';
import { ordersRepository } from './orders.repository';
import { customerOrderRepository, type CustomerOrder, type SettlementModel } from './customerOrder.repository';
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

    // TASK-13 — تجميع بنود السلة حسب tenant_id بدل رفض أي سلة بأكثر من تاجر واحد (ADR-009،
    // مُستبدَل حرفياً الآن وفق specs/orders/PHASE_2_DOMAIN_DESIGN.md §8 بند 3): كل مجموعة تُصبح
    // merchant_suborder مستقلة تحت customer_order واحد مشترك. سلة أحادية التاجر (الحالة الشائعة
    // اليوم) تُنتج مجموعة واحدة فقط بالضبط — تعمل تماماً كما قبل هذه المهمة، بلا أي تغيير ظاهري.
    const groupsByTenant = new Map<string, typeof summary.lines>();
    for (const line of summary.lines) {
      const tenantId = line.product.tenantId;
      if (!tenantId) {
        throw new Error(`المنتج "${line.product.name}" غير مرتبط بتاجر — لا يمكن إتمام الطلب`);
      }
      const group = groupsByTenant.get(tenantId);
      if (group) group.push(line);
      else groupsByTenant.set(tenantId, [line]);
    }

    // CRITICAL-FIXES-FROM-AUDIT-001، بند 2 — نقطة الاستهلاك الفعلية للمخزون: خصم ذرّي شرطي واحد
    // لكل بند (لا فحص isAvailable ثم قرار منفصل، ذلك بالضبط ما كان يسمح بسباق TOCTOU/بيع مضاعف).
    // reservations تتبّع ما نجح خصمه فعلياً في هذه المحاولة بالذات — ضرورية للتعويض أدناه (بند 3)
    // لو فشلت خطوة لاحقة (دفع/إنشاء طلب/بنود) بعد خصم ناجح لبعض البنود. عبر كل التجار معاً — خصم
    // مخزون بند لا علاقة له بحدود تاجره.
    const reservations: Array<{ productId: string; quantity: number }> = [];
    // TASK-13 — createdSuborderIds لا تضم إلا merchant_suborders التي اكتملت بالكامل (صف + بنود +
    // أول قيد سجل) — أي فشل جزئي لسبورداردر بعينها يُنظِّف نفسه فوراً (أدناه) قبل أن يصل لهذه
    // القائمة، فلا تكرار حذف. customerOrder يبقى undefined حتى ينجح إنشاؤه فعلياً.
    const createdSuborderIds: string[] = [];
    let customerOrder: CustomerOrder | undefined;

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

      // TODO(مهمة مستقبلية منفصلة، خارج نطاق TASK-13 صراحة — راجع
      // specs/orders/PHASE_2_DOMAIN_DESIGN.md §5/§9): لا خوارزمية حساب فعلية لرسوم التوصيل بعد.
      // صفر مؤقت بدل قيمة مخترَعة — delivery_quotes تبقى بلا أي صف حتى تُبنى تلك المهمة.
      const deliveryFeeSnapshot = 0;

      customerOrder = await customerOrderRepository.createCustomerOrder({
        userId: user.id,
        deliveryAddress: input.deliveryAddress,
        paymentMethod: cashOnDeliveryProvider.method,
        subtotalSnapshot: summary.total,
        deliveryFeeSnapshot,
        totalSnapshot: summary.total + deliveryFeeSnapshot,
      });

      // TASK-13 — settlement_model يُجمَّد من merchants.default_settlement_model وقت إنشاء كل
      // suborder (§7.3 من الوثيقة). قرار مؤسس صريح (2026-09-15): أي تاجر لم يحدّده بعد (NULL —
      // وهو وضع كل التجار الحاليين فعلياً بعد TASK-12) يُفترَض له 'reef_collected' افتراضياً
      // (يطابق الوضع التشغيلي الحالي: ريف تجمّع التحصيل)، لا رفض Checkout ولا قيمة عشوائية أخرى.
      // دفعة واحدة (getByIds) بدل استعلام لكل تاجر — نفس نمط findByIds المُعاد استخدامه أصلاً.
      const merchants = await merchantService.getByIds([...groupsByTenant.keys()]);
      const settlementModelByTenant = new Map(merchants.map((m) => [m.id, m.defaultSettlementModel]));

      let primaryOrder: Order | undefined;
      for (const [tenantId, lines] of groupsByTenant) {
        const suborderTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
        const settlementModel: SettlementModel = settlementModelByTenant.get(tenantId) ?? 'reef_collected';

        const suborderOrder = await customerOrderRepository.createMerchantSuborder({
          customerOrderId: customerOrder.id,
          userId: user.id,
          tenantId,
          settlementModel,
          paymentMethod: cashOnDeliveryProvider.method,
          total: suborderTotal,
        });

        try {
          await customerOrderRepository.createMerchantSuborderItems(
            suborderOrder.id,
            lines.map((line) => ({
              productId: line.product.id,
              quantity: line.item.quantity,
              selection: line.item.selection,
              unitPriceSnapshot: line.unitPrice,
            }))
          );

          // أول قيد في سجل تدقيق هذه الـsuborder — نفس فلسفة order_status_history الأصلية
          // (CONSTITUTION §4 بند 5): الحالة الابتدائية 'pending' بلا حالة سابقة، فاعلها النظام.
          await customerOrderRepository.insertStatusHistory({
            orderId: suborderOrder.id,
            fromStatus: null,
            toStatus: 'pending',
            actorRole: 'system',
          });

          createdSuborderIds.push(suborderOrder.id);
        } catch (e) {
          // فشل جزئي داخل مجموعة تاجر واحدة بعينها (مثال: فشل إدراج البنود) — يُنظَّف هذا الـ
          // suborder نفسه فوراً (cascade يُسقِط items/history)، فلا يدخل createdSuborderIds أصلاً
          // (لا حذف مزدوج لاحقاً)، ثم يُرمى الخطأ ليعالجه التعويض الشامل أدناه (حذف بقية
          // الـsuborders الناجحة + customer_order + استرجاع كل المخزون المحجوز في هذه المحاولة).
          await customerOrderRepository.deleteMerchantSuborder(suborderOrder.id);
          throw e;
        }

        if (!primaryOrder) primaryOrder = suborderOrder;
      }

      await cartService.clearCart(cart.id);

      return primaryOrder!;
    } catch (e) {
      // CRITICAL-FIXES-FROM-AUDIT-001 (بند 3، مُوسَّعة لتعدد التجار في TASK-13) — لا معاملة DB
      // ذرّية حقيقية تربط customer_order/merchant_suborders معاً عبر تجار متعددين (نفس القيد
      // الموثَّق أصلاً في ADR-009 بين orders وorder_items). تعويض تطبيقي صريح: أي
      // merchant_suborders اكتملت بالفعل في هذه المحاولة تُحذَف أولاً (customer_order_id بلا ON
      // DELETE CASCADE من customer_orders — هذا الترتيب إلزامي، وإلا يفشل حذف customer_order بقيد
      // FK)، ثم customer_order نفسه إن كان قد أُنشئ، قبل استرجاع كل مخزون خُصم في هذه المحاولة
      // بالذات (نفس آلية InventoryService.release الموجودة أصلاً، بلا تعديل).
      for (const suborderId of createdSuborderIds) {
        await customerOrderRepository.deleteMerchantSuborder(suborderId).catch(() => {});
      }
      if (customerOrder) {
        await customerOrderRepository.deleteCustomerOrder(customerOrder.id).catch(() => {});
      }

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
    const order = await customerOrderRepository.findOrderById(orderId);
    if (!order) return null;
    this.assertActorCanAccessOrder(order, actor);
    const items = await customerOrderRepository.findOrderItems(orderId);
    return { order, items };
  }

  // صفحة تتبّع الطلب للعميل الضيف (اليوم 14، /order/[id]) — بلا فحص تاجر/جلسة عمداً، ومختلفة
  // عن التحذير أعلاه: التحذير يخاطب فاعلاً تابعاً لتاجر (أدوار merchant_*) قد يخمّن orderId
  // ليطّلع على طلب تاجر آخر خارج نطاقه. هنا لا فاعل تاجر ولا جلسة إطلاقاً — عميل ضيف (بلا حساب،
  // بقرار صريح في نطاق هذا اليوم) يملك رابطاً دائماً يحمل orderId (UUID عشوائي غير قابل للتخمين
  // عملياً، gen_random_uuid()) كآلية تفويض بحد ذاتها — نفس نمط "رقم تتبّع شحنة" شائع في أي خدمة
  // توصيل حقيقية. لتقليل الأثر لو تسرَّب رابط لطرف غير مقصود: هذه الدالة (ومستهلكها الوحيد،
  // الصفحة) لا تُعيد عنوان التوصيل ولا هاتف/اسم العميل — الحالة والعناصر والإجمالي فقط.
  // §31 بند 2 — كان يعيد نصيب التاجر المطلوب بمعرّفه فقط (order/items مفردَين)، حتى لو كان جزءاً
  // من customer_order متعدد التجار (فجوة ADR-033 المعروفة: العميل يرى منتجاً واحداً وإجمالاً جزئياً
  // فقط). الآن يجلب كل الإخوة (merchant_suborders) التابعين لنفس customer_order عبر customerOrderId
  // ويعيدهم معاً بإجمالي حقيقي شامل. orderId المطلوب هنا يبقى أي suborder id من نفس المجموعة (الرابط
  // الذي يحمله العميل يبقى صالحاً كما هو، لا حاجة لتغيير بنية الرابط نفسها).
  async getOrderForCustomerView(orderId: string): Promise<OrderCustomerView | null> {
    const requestedOrder = await customerOrderRepository.findOrderById(orderId);
    if (!requestedOrder) return null;

    // customerOrderId موجود دائماً عملياً (كل Order صادر من customerOrder.repository.ts) — الشرط
    // دفاعي بحت (النوع اختياري في types.ts لتفادي كسر بناء Order حرفي قديم في الاختبارات).
    const siblingOrders = requestedOrder.customerOrderId
      ? await customerOrderRepository.findOrdersByCustomerOrderId(requestedOrder.customerOrderId)
      : [requestedOrder];

    const tenantIds = [...new Set(siblingOrders.map((o) => o.tenantId))];
    const merchants = tenantIds.length > 0 ? await merchantService.getByIds(tenantIds) : [];
    const merchantNameById = new Map(merchants.map((m) => [m.id, m.businessName]));

    const suborders = await Promise.all(
      siblingOrders.map(async (order) => {
        const items = await customerOrderRepository.findOrderItems(order.id);
        const itemsWithProductNames = await Promise.all(
          items.map(async (item) => {
            const product = await catalogService.getProductById(item.productId);
            return { item, productName: product?.name ?? null };
          })
        );
        return { order, merchantName: merchantNameById.get(order.tenantId) ?? null, items: itemsWithProductNames };
      })
    );

    // مصدر الحقيقة الوحيد للإجمالي الكلي: customer_orders.total_snapshot نفسه (يشمل رسوم التوصيل
    // أصلاً، محسوب مرة واحدة وقت checkout() ومخزَّن كعمود numeric مضبوط الخانتين العشريتين) — لا
    // إعادة جمع Σ(suborder.total) في JS هنا: اكتُشف حياً أثناء تحقق هذا البند (سيناريو تاجرين
    // حقيقي، 30.99+92.99) أن جمع الأعداد العشرية في JavaScript ينتج خطأ تقريب فعلي وملموس
    // (123.97999999999999 بدل 123.98) لأن Number لا يخزّن الأعشار تماماً (IEEE 754) — بينما القيمة
    // المخزَّنة فعلياً في customer_orders.total_snapshot صحيحة تماماً لأنها حُسبت واستُقرَّت في العمود
    // العشري لقاعدة البيانات وقت الإنشاء. القراءة من المصدر بدل إعادة الحساب هنا تتجنّب هذا كلياً.
    // غياب صف customer_orders (لا يجب أن يحدث، FK إلزامي) يُعامَل بجمع احتياطي بدل فشل كامل للصفحة.
    const customerOrder = requestedOrder.customerOrderId
      ? await customerOrderRepository.findCustomerOrderById(requestedOrder.customerOrderId)
      : null;
    const grandTotal = customerOrder?.totalSnapshot ?? suborders.reduce((sum, s) => sum + s.order.total, 0);

    return { suborders, grandTotal };
  }

  // CRITICAL-FIXES-FROM-AUDIT-001، بند 4 — نفس إصلاح getOrderWithItems أعلاه بالضبط. يتطلب جلب
  // الطلب أولاً الآن (استعلام إضافي واحد) لمعرفة tenantId الحقيقي قبل الفحص — لم يكن ذلك ضرورياً
  // سابقاً لأن لا فحص كان موجوداً أصلاً. طلب غير موجود يرمي خطأً صريحاً (لا مصفوفة فارغة صامتة) —
  // نفس فلسفة "فشل صريح لا نجاح صامت" المتَّبعة في transitionStatus المجاورة تماماً.
  async getStatusHistory(actor: OrderActorContext, orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const order = await customerOrderRepository.findOrderById(orderId);
    if (!order) {
      throw new Error('الطلب غير موجود');
    }
    this.assertActorCanAccessOrder(order, actor);
    return customerOrderRepository.findStatusHistory(orderId);
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
    return customerOrderRepository.findOrdersByTenantId(tenantId);
  }

  // كل الطلبات من كل التجار — للوحة الإدارة فقط (اليوم 11). لا تحقق صلاحية هنا — مسؤولية
  // المستدعي (Server Action) التأكد أن الفاعل platform_admin قبل الوصول لهذه الدالة.
  async getAllOrders(): Promise<Order[]> {
    return customerOrderRepository.findAll();
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
    return customerOrderRepository.findAllStatusHistory(limit);
  }

  // ينفّذ انتقال حالة واحداً وفق آلة الحالات في types.ts (ORDER_TRANSITIONS)، ويرفض أي انتقال
  // غير مسموح أو فاعل غير مخوَّل بدل تنفيذه صامتاً — نفس منطق الرفض الصريح في checkout()
  //
  // TASK-08 — إصلاح فجوة حقيقية: الانتقال * → cancelled كان يترك مخزون الطلب محجوزاً للأبد (كان
  // release() يُستدعى فقط من مسار تعويض فشل Checkout نفسه، لا هنا). الآن يُسترجَع مخزون كل بند من
  // order_items عبر نفس آلية InventoryService.release() المُختبَرة أصلاً في ذلك المسار — لا منطق
  // استرجاع جديد. طول الدالة تجاوز حد الـ50 سطراً (Complexity Budget، AGENTS.md §4) — تبرير: نفس
  // فلسفة performCheckout أعلاه، تسلسل خطوات انتقال واحد منطقياً (فحص → تحديث ذرّي → سجل → أثر
  // جانبي عند الإلغاء)، تقسيمها لدوال فرعية يُشتِّت القراءة بلا فائدة حقيقية.
  async transitionStatus(input: TransitionOrderStatusInput): Promise<Order> {
    const order = await customerOrderRepository.findOrderById(input.orderId);
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

    // TASK-13 — merchant_suborder_status_history يفرض CHECK جديد (غير موجود على order_status_history
    // القديم): note إلزامي عند to_status='cancelled' (قرار مؤسس صريح،
    // specs/orders/PHASE_2_DOMAIN_DESIGN.md §2.6/§10.1 بند 5). يُفحَص هنا صراحةً قبل أي كتابة DB —
    // لا يُترَك لقيد قاعدة البيانات وحده، لأن updateOrderStatus (السطر أدناه) ينجح ويُغيّر حالة
    // الـsuborder فعلياً *قبل* insertStatusHistory؛ لو فشل السجل لاحقاً بسبب note مفقود، يبقى الطلب
    // "ملغياً" فعلياً بلا أي قيد سجل يوثّق السبب/الفاعل ولا استرجاع مخزون (الكود يتوقف عند الخطأ قبل
    // الوصول لذلك السطر) — حالة غير متسقة تماماً. الفشل الصريح هنا يمنعها من الأساس.
    if (input.toStatus === 'cancelled' && !input.note) {
      throw new Error('سبب الإلغاء (note) إلزامي عند إلغاء طلب');
    }

    // TASK-08 — قفل تفاؤلي (orders.repository.ts): يطابق أيضاً على order.status المقروء أعلاه بالذات.
    // null يعني طرف آخر غيَّر حالة هذا الطلب فعلياً بين قراءتنا وكتابتنا (سباق حقيقي، مثلاً إلغاءان
    // متزامنان لنفس الطلب) — رفض صريح بدل تنفيذ أثر الانتقال (استرجاع المخزون) مرتين لطلب واحد.
    const updatedOrder = await customerOrderRepository.updateOrderStatus(input.orderId, order.status, input.toStatus);
    if (!updatedOrder) {
      throw new Error('تعارض تزامن: تغيّرت حالة هذا الطلب من طرف آخر أثناء هذا الانتقال بالذات — أعد المحاولة');
    }

    await customerOrderRepository.insertStatusHistory({
      orderId: input.orderId,
      fromStatus: order.status,
      toStatus: input.toStatus,
      actorRole: input.actorRole,
      actorId: input.actorId,
      note: input.note,
    });

    if (input.toStatus === 'cancelled') {
      const items = await customerOrderRepository.findOrderItems(input.orderId);
      const failures: string[] = [];
      await Promise.all(
        items.map(async (item) => {
          try {
            await inventoryService.release(item.productId, item.quantity);
          } catch (releaseError) {
            failures.push(item.productId);
            await auditService
              .log({
                actorRole: 'system',
                action: 'inventory.release_failed',
                entityType: 'inventory',
                entityId: item.productId,
                metadata: {
                  quantity: item.quantity,
                  orderId: input.orderId,
                  reason: releaseError instanceof Error ? releaseError.message : String(releaseError),
                },
              })
              .catch(() => {});
          }
        })
      );
      if (failures.length > 0) {
        throw new Error(
          `الطلب أُلغي بنجاح لكن فشل استرجاع مخزون المنتجات: ${failures.join(', ')} — راجع سجل التدقيق`
        );
      }
    }

    return updatedOrder;
  }
}

export const ordersService = new OrdersService();
