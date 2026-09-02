// src/core/modules/orders/orders.service.ts
// تحويل سلة إلى طلب PENDING — يستدعي CatalogService/InventoryService/CartService/KhalilService
// حياً، لا يُعيد كتابة أي من منطقها (docs/ARCHITECTURE.md §3، §7)

import { cartService } from '../cart/cart.service';
import { catalogService } from '../catalog/catalog.service';
import { inventoryService } from '../inventory/inventory.service';
import { khalilService } from '../../kernel/khalil/service';
import { cashOnDeliveryProvider } from '../payments/cash-on-delivery.provider';
import { ordersRepository } from './orders.repository';
import type { CheckoutInput, Order, OrderWithItems } from './types';

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

    return order;
  }

  async getOrderWithItems(orderId: string): Promise<OrderWithItems | null> {
    const order = await ordersRepository.findOrderById(orderId);
    if (!order) return null;
    const items = await ordersRepository.findOrderItems(orderId);
    return { order, items };
  }
}

export const ordersService = new OrdersService();
