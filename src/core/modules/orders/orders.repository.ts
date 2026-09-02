// src/core/modules/orders/orders.repository.ts
// الاتصال بقاعدة البيانات الخاص بالطلبات — لا منطق أعمال هنا، فقط قراءة/كتابة
// يستخدم عميل service_role — RLS يمنع anon بالكامل على orders/order_items (نفس نمط ADR-008)

import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { DeliveryAddress, Order, OrderItem } from './types';
import type { ProductSelection } from '../catalog/types';
import type { PaymentMethod } from '../payments/payment-provider.interface';

interface OrderRow {
  id: string;
  user_id: string;
  tenant_id: string;
  status: string;
  payment_method: string;
  delivery_address: DeliveryAddress;
  total: number;
  created_at: string;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  selection: ProductSelection;
  unit_price_snapshot: number;
  created_at: string;
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    status: 'pending',
    paymentMethod: row.payment_method as PaymentMethod,
    deliveryAddress: row.delivery_address,
    total: row.total,
    createdAt: row.created_at,
  };
}

function toOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    quantity: row.quantity,
    selection: row.selection ?? {},
    unitPriceSnapshot: row.unit_price_snapshot,
    createdAt: row.created_at,
  };
}

export interface CreateOrderInput {
  userId: string;
  tenantId: string;
  paymentMethod: PaymentMethod;
  deliveryAddress: DeliveryAddress;
  total: number;
}

export interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  selection: ProductSelection;
  unitPriceSnapshot: number;
}

export class OrdersRepository {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: input.userId,
        tenant_id: input.tenantId,
        payment_method: input.paymentMethod,
        delivery_address: input.deliveryAddress,
        total: input.total,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toOrder(data as OrderRow);
  }

  async createOrderItems(orderId: string, items: CreateOrderItemInput[]): Promise<OrderItem[]> {
    const { data, error } = await supabaseAdmin
      .from('order_items')
      .insert(
        items.map((item) => ({
          order_id: orderId,
          product_id: item.productId,
          quantity: item.quantity,
          selection: item.selection,
          unit_price_snapshot: item.unitPriceSnapshot,
        }))
      )
      .select('*');
    if (error) throw error;
    return (data as OrderItemRow[]).map(toOrderItem);
  }

  async deleteOrder(orderId: string): Promise<void> {
    const { error } = await supabaseAdmin.from('orders').delete().eq('id', orderId);
    if (error) throw error;
  }

  async findOrderById(id: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toOrder(data as OrderRow) : null;
  }

  async findOrderItems(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabaseAdmin.from('order_items').select('*').eq('order_id', orderId);
    if (error) throw error;
    return (data as OrderItemRow[]).map(toOrderItem);
  }
}

export const ordersRepository = new OrdersRepository();
