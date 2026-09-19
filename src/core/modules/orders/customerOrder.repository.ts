// src/core/modules/orders/customerOrder.repository.ts
// TASK-13 (specs/orders/PHASE_2_DOMAIN_DESIGN.md) — الاتصال بقاعدة البيانات للجداول الأربعة
// الجديدة من TASK-12 التي يستهلكها Checkout متعدد التجار: customer_orders، merchant_suborders،
// merchant_suborder_items (مرآة order_items)، merchant_suborder_status_history (مرآة
// order_status_history). لا منطق أعمال هنا، فقط قراءة/كتابة — نفس نمط orders.repository.ts
// المجاور تماماً. orders.repository.ts (القديم) يبقى بلا أي تعديل ولا حذف (§8 بند 4 من الوثيقة)؛
// هذا الملف لا يستورده ولا يُستورَد منه (dependency-cruiser: لا استيراد repository.ts لـrepository.ts آخر).
//
// merchant_suborders هي "بديل Drop-in لصف orders القديم" (§2.2 من الوثيقة) — لذلك كل دالة قراءة هنا
// تُعيد كائنات بشكل Order/OrderItem/OrderStatusHistoryEntry نفسه (من ./types)، لا أنواعاً جديدة
// موازية، ليعمل orders.service.ts بلا تغيير في العقد الخارجي (Order type) الذي يعتمد عليه كل من
// بوابة التاجر/الإدارة وصفحة تتبّع العميل. الحقل `orderId`/`id` في هذه الكائنات يحمل الآن
// merchant_suborder.id (لا customer_order.id) — راجع تعليق TASK-13 أعلى Order في ./types.ts.

import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { DeliveryAddress, Order, OrderItem, OrderStatus, OrderStatusHistoryEntry, OrderActorRole } from './types';
import type { ProductSelection } from '../catalog/types';
import type { PaymentMethod } from '../payments/payment-provider.interface';

export type SettlementModel = 'driver_fronted' | 'reef_collected';

export interface CustomerOrder {
  id: string;
  userId: string;
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  subtotalSnapshot: number;
  deliveryFeeSnapshot: number;
  totalSnapshot: number;
  createdAt: string;
  updatedAt: string;
}

interface CustomerOrderRow {
  id: string;
  user_id: string;
  delivery_address: DeliveryAddress;
  payment_method: string;
  subtotal_snapshot: number;
  delivery_fee_snapshot: number | null;
  total_snapshot: number;
  created_at: string;
  updated_at: string;
}

function toCustomerOrder(row: CustomerOrderRow): CustomerOrder {
  return {
    id: row.id,
    userId: row.user_id,
    deliveryAddress: row.delivery_address,
    paymentMethod: row.payment_method as PaymentMethod,
    subtotalSnapshot: row.subtotal_snapshot,
    deliveryFeeSnapshot: row.delivery_fee_snapshot ?? 0,
    totalSnapshot: row.total_snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// صف merchant_suborders مع customer_orders.delivery_address مُضمَّناً عبر Embed حسب FK
// (customer_order_id) — تجنّب استعلام ثانٍ منفصل لكل suborder فقط لجلب عنوان التوصيل المشترك.
interface MerchantSuborderRow {
  id: string;
  customer_order_id: string;
  user_id: string;
  tenant_id: string;
  status: string;
  settlement_model: SettlementModel;
  payment_method: string;
  total: number;
  created_at: string;
  updated_at: string;
  customer_orders: { delivery_address: DeliveryAddress } | { delivery_address: DeliveryAddress }[] | null;
}

// PostgREST يُعيد الكائن المُضمَّن مفرداً لعلاقة N:1 عادةً، لكن هذا يتعامل أيضاً مع حالة مصفوفة
// (بعض إصدارات/إعدادات schema cache) بلا افتراض شكل واحد فقط — فشل صريح أفضل من قراءة خاطئة صامتة.
function extractDeliveryAddress(embedded: MerchantSuborderRow['customer_orders']): DeliveryAddress {
  const record = Array.isArray(embedded) ? embedded[0] : embedded;
  if (!record) throw new Error('تعذّر إيجاد customer_order المرتبط بهذا الـsuborder — بيانات غير متسقة');
  return record.delivery_address;
}

function toOrderFromSuborderRow(row: MerchantSuborderRow): Order {
  return {
    id: row.id,
    customerOrderId: row.customer_order_id,
    userId: row.user_id,
    tenantId: row.tenant_id,
    status: row.status as OrderStatus,
    paymentMethod: row.payment_method as PaymentMethod,
    deliveryAddress: extractDeliveryAddress(row.customer_orders),
    total: row.total,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SUBORDER_SELECT_WITH_DELIVERY_ADDRESS = '*, customer_orders(delivery_address)';

interface MerchantSuborderItemRow {
  id: string;
  merchant_suborder_id: string;
  product_id: string;
  quantity: number;
  selection: ProductSelection;
  unit_price_snapshot: number;
  created_at: string;
}

function toOrderItem(row: MerchantSuborderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.merchant_suborder_id,
    productId: row.product_id,
    quantity: row.quantity,
    selection: row.selection ?? {},
    unitPriceSnapshot: row.unit_price_snapshot,
    createdAt: row.created_at,
  };
}

interface MerchantSuborderStatusHistoryRow {
  id: string;
  merchant_suborder_id: string;
  from_status: string | null;
  to_status: string;
  actor_role: string;
  actor_id: string | null;
  note: string | null;
  created_at: string;
}

function toOrderStatusHistoryEntry(row: MerchantSuborderStatusHistoryRow): OrderStatusHistoryEntry {
  return {
    id: row.id,
    orderId: row.merchant_suborder_id,
    fromStatus: row.from_status as OrderStatus | null,
    toStatus: row.to_status as OrderStatus,
    actorRole: row.actor_role as OrderActorRole,
    actorId: row.actor_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

export interface CreateCustomerOrderInput {
  userId: string;
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  subtotalSnapshot: number;
  deliveryFeeSnapshot: number;
  totalSnapshot: number;
}

export interface CreateMerchantSuborderInput {
  customerOrderId: string;
  userId: string;
  tenantId: string;
  settlementModel: SettlementModel;
  paymentMethod: PaymentMethod;
  total: number;
}

export interface CreateMerchantSuborderItemInput {
  productId: string;
  quantity: number;
  selection: ProductSelection;
  unitPriceSnapshot: number;
}

export class CustomerOrderRepository {
  async createCustomerOrder(input: CreateCustomerOrderInput): Promise<CustomerOrder> {
    const { data, error } = await supabaseAdmin
      .from('customer_orders')
      .insert({
        user_id: input.userId,
        delivery_address: input.deliveryAddress,
        payment_method: input.paymentMethod,
        subtotal_snapshot: input.subtotalSnapshot,
        delivery_fee_snapshot: input.deliveryFeeSnapshot,
        total_snapshot: input.totalSnapshot,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toCustomerOrder(data as CustomerOrderRow);
  }

  async deleteCustomerOrder(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('customer_orders').delete().eq('id', id);
    if (error) throw error;
  }

  // ملاحظة ترتيب حاسمة للمستدعي (تعويض فشل Checkout الجزئي): merchant_suborders.customer_order_id
  // بلا ON DELETE CASCADE من customer_orders — يجب حذف كل merchant_suborders التابعة أولاً
  // (deleteMerchantSuborder، الذي يُسقِط items/history تلقائياً عبر cascade) قبل حذف customer_order
  // نفسه، وإلا يفشل الحذف بقيد FK.
  async createMerchantSuborder(input: CreateMerchantSuborderInput): Promise<Order> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborders')
      .insert({
        customer_order_id: input.customerOrderId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        settlement_model: input.settlementModel,
        payment_method: input.paymentMethod,
        total: input.total,
      })
      .select(SUBORDER_SELECT_WITH_DELIVERY_ADDRESS)
      .single();
    if (error) throw error;
    return toOrderFromSuborderRow(data as unknown as MerchantSuborderRow);
  }

  async deleteMerchantSuborder(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('merchant_suborders').delete().eq('id', id);
    if (error) throw error;
  }

  async createMerchantSuborderItems(suborderId: string, items: CreateMerchantSuborderItemInput[]): Promise<OrderItem[]> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborder_items')
      .insert(
        items.map((item) => ({
          merchant_suborder_id: suborderId,
          product_id: item.productId,
          quantity: item.quantity,
          selection: item.selection,
          unit_price_snapshot: item.unitPriceSnapshot,
        }))
      )
      .select('*');
    if (error) throw error;
    return (data as MerchantSuborderItemRow[]).map(toOrderItem);
  }

  async findOrderById(id: string): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborders')
      .select(SUBORDER_SELECT_WITH_DELIVERY_ADDRESS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? toOrderFromSuborderRow(data as unknown as MerchantSuborderRow) : null;
  }

  async findOrderItems(suborderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabaseAdmin.from('merchant_suborder_items').select('*').eq('merchant_suborder_id', suborderId);
    if (error) throw error;
    return (data as MerchantSuborderItemRow[]).map(toOrderItem);
  }

  async findOrdersByTenantId(tenantId: string): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborders')
      .select(SUBORDER_SELECT_WITH_DELIVERY_ADDRESS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as MerchantSuborderRow[]).map(toOrderFromSuborderRow);
  }

  // بلا تصفية تاجر — للوحة الإدارة فقط. عكس findOrdersByTenantId تماماً (نفس نمط findAll القديم).
  async findAll(): Promise<Order[]> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborders')
      .select(SUBORDER_SELECT_WITH_DELIVERY_ADDRESS)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as unknown as MerchantSuborderRow[]).map(toOrderFromSuborderRow);
  }

  // قفل تفاؤلي — نفس نمط orders.repository.ts.updateOrderStatus حرفياً (يطابق أيضاً على fromStatus
  // المقروء فعلاً قبل النداء). استعلام ثانٍ منفصل (findOrderById) بعد نجاح التحديث لإرجاع
  // deliveryAddress المُضمَّن بدل الاعتماد على embedding فوق update() (غير مضمون السلوك حياً عبر كل
  // إصدارات PostgREST) — تكلفة استعلام إضافي واحد مقبولة مقابل يقين تام في مسار مالي.
  async updateOrderStatus(orderId: string, fromStatus: OrderStatus, status: OrderStatus): Promise<Order | null> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', fromStatus)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.findOrderById(orderId);
  }

  async insertStatusHistory(entry: {
    orderId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    actorRole: OrderActorRole;
    actorId?: string;
    note?: string;
  }): Promise<OrderStatusHistoryEntry> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborder_status_history')
      .insert({
        merchant_suborder_id: entry.orderId,
        from_status: entry.fromStatus,
        to_status: entry.toStatus,
        actor_role: entry.actorRole,
        actor_id: entry.actorId ?? null,
        note: entry.note ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toOrderStatusHistoryEntry(data as MerchantSuborderStatusHistoryRow);
  }

  async findStatusHistory(orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborder_status_history')
      .select('*')
      .eq('merchant_suborder_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data as MerchantSuborderStatusHistoryRow[]).map(toOrderStatusHistoryEntry);
  }

  async findAllStatusHistory(limit: number): Promise<OrderStatusHistoryEntry[]> {
    const { data, error } = await supabaseAdmin
      .from('merchant_suborder_status_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as MerchantSuborderStatusHistoryRow[]).map(toOrderStatusHistoryEntry);
  }
}

export const customerOrderRepository = new CustomerOrderRepository();
