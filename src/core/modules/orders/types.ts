// src/core/modules/orders/types.ts
// تحويل سلة إلى طلب PENDING فقط — لا دورة حياة كاملة بعد (اليوم 9)

import type { CartIdentity } from '../cart/types';
import type { ProductSelection } from '../catalog/types';
import type { PaymentMethod } from '../payments/payment-provider.interface';

export interface DeliveryAddress {
  line1: string;
  city: string;
  notes?: string;
}

export interface Order {
  id: string;
  userId: string;
  tenantId: string;
  status: 'pending';
  paymentMethod: PaymentMethod;
  deliveryAddress: DeliveryAddress;
  total: number;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  selection: ProductSelection;
  unitPriceSnapshot: number;
  createdAt: string;
}

export interface CheckoutInput {
  identity: CartIdentity;
  customerName: string;
  customerPhone: string;
  deliveryAddress: DeliveryAddress;
}

export interface OrderWithItems {
  order: Order;
  items: OrderItem[];
}
