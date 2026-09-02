// src/core/modules/orders/orders.service.ts
// تحويل سلة إلى طلب + دورة حياة الطلب الكاملة (اليوم 9) — يستدعي CatalogService/InventoryService/
// CartService/KhalilService حياً، لا يُعيد كتابة أي من منطقها (docs/ARCHITECTURE.md §3، §7)

import { cartService } from '../cart/cart.service';
import { catalogService } from '../catalog/catalog.service';
import { inventoryService } from '../inventory/inventory.service';
import { khalilService } from '../../kernel/khalil/service';
import { cashOnDeliveryProvider } from '../payments/cash-on-delivery.provider';
import { ordersRepository } from './orders.repository';
import {
  ORDER_TRANSITIONS,
  ORDER_TRANSITION_ACTORS,
  type CheckoutInput,
  type Order,
  type OrderActorRole,
  type OrderStatusHistoryEntry,
  type OrderWithItems,
  type TransitionOrderStatusInput,
} from './types';

// أدوار مرتبطة بتاجر محدد — يجب أن يطابق tenantId المُرسَل tenant_id الطلب نفسه (اليوم 10).
// platform_admin يرى/يُغيّر كل شيء بلا قيد تاجر، system لا يُستخدَم فعلياً بعد الإنشاء الأولي.
const TENANT_SCOPED_ACTOR_ROLES: readonly OrderActorRole[] = ['merchant_owner', 'merchant_manager', 'employee'];

export class OrdersService {
  // TODO(BR-016): لا حد أدنى لقيمة الطلب مطبَّق بعد — القيمة غير معتمدة رسمياً.
  // راجع docs/BUSINESS_RULES.md → BR-016 (OPEN_QUESTION) قبل الإطلاق.
  async checkout(input: CheckoutInput): Promise<Order> {
    const cart = await cartService.getOrCreateCart(input.identity);
    const summary = await cartService.getSummary(cart.id);

    if (summary.lines.length === 0) {
      throw new Error('السلة فارغة');
    }

    for (const line of summary.lines) {
      if (!line.product.isActive) {
        throw new Error(`المنتج "${line.product.name}" لم يعد متاحاً`);
      }
      const available = await inventoryService.isAvailable(line.product.id, line.item.quantity);
      if (!available) {
        throw new Error(`الكمية المطلوبة من "${line.product.name}" غير متوفرة في المخزون الآن`);
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
  }

  async getOrderWithItems(orderId: string): Promise<OrderWithItems | null> {
    const order = await ordersRepository.findOrderById(orderId);
    if (!order) return null;
    const items = await ordersRepository.findOrderItems(orderId);
    return { order, items };
  }

  async getStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
    return ordersRepository.findStatusHistory(orderId);
  }

  // طلبات تاجر واحد فقط — للوحة التاجر (اليوم 10). tenantId يجب أن يأتي من الجلسة، أبداً من
  // مدخل يتحكم به العميل (CONSTITUTION §4 بند 3) — هذا الالتزام مسؤولية المستدعي (Server Action).
  async getOrdersForTenant(tenantId: string): Promise<Order[]> {
    return ordersRepository.findOrdersByTenantId(tenantId);
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
    // لتفادي تسريب أي معلومة عن حالة طلب لا يملك الفاعل حق رؤيته أصلاً.
    if (TENANT_SCOPED_ACTOR_ROLES.includes(input.actorRole)) {
      if (input.tenantId !== order.tenantId) {
        throw new Error('هذا الطلب لا يخص تاجرك — لا يمكنك تغيير حالته');
      }
    }

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
