// src/core/modules/orders/types.ts
// تحويل سلة إلى طلب + دورة حياة الطلب الكاملة (اليوم 9)

import type { CartIdentity } from '../cart/types';
import type { ProductSelection } from '../catalog/types';
import type { PaymentMethod } from '../payments/payment-provider.interface';
import type { UserRole } from '../../kernel/khalil/types';

export interface DeliveryAddress {
  line1: string;
  city: string;
  notes?: string;
}

export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

// تسمية عربية موحَّدة لكل حالة — مصدر واحد يُعاد استخدامه في أي واجهة (تاجر الآن، عميل/إدارة لاحقاً)
export const ORDER_STATUS_LABELS_AR: Record<OrderStatus, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكَّد',
  preparing: 'جارٍ التحضير',
  ready: 'جاهز للتوصيل',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

// نص زر الانتقال (فعل، لا اسم حالة) — "إلغاء" لا "ملغي" مثلاً، لواجهات التاجر/الإدارة
export const ORDER_TRANSITION_ACTION_LABELS_AR: Record<OrderStatus, string> = {
  pending: 'إعادة لقيد الانتظار',
  confirmed: 'تأكيد الطلب',
  preparing: 'بدء التحضير',
  ready: 'جاهز للتوصيل',
  out_for_delivery: 'خروج للتوصيل',
  delivered: 'تسليم الطلب',
  cancelled: 'إلغاء الطلب',
};

// مصدر واحد للحقيقة لآلة الحالات (State Machine) — يستهلكه orders.service.ts لفرض
// الانتقال، وspecs/orders/README.md يوثّقه بصرياً. لا تُعدَّل هنا بلا تحديث كليهما.
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// نوع الفاعل الذي يسجَّل به كل انتقال — إما دور مستخدم حقيقي (بلا تحقق جلسة حقيقية بعد،
// راجع ADR-008/009) أو 'system' لانتقال أنشأه الكود نفسه (مثل إنشاء الطلب في Checkout).
export type OrderActorRole = UserRole | 'system';

// من يملك حق كل انتقال — طبقة تطبيق فقط، لا RLS (نفس فجوة عدم وجود Auth حقيقي).
// ⚠️ ready→out_for_delivery وout_for_delivery→delivered مؤقتان لأدوار التاجر/الإدارة —
// يجب أن ينتقلا لمندوب برق عند بناء ذلك النطاق (راجع specs/orders/README.md → OPEN_QUESTION).
const MERCHANT_OR_ADMIN: readonly OrderActorRole[] = ['merchant_owner', 'merchant_manager', 'employee', 'platform_admin'];

export const ORDER_TRANSITION_ACTORS: Record<OrderStatus, readonly OrderActorRole[]> = {
  pending: [], // ليس "انتقالاً" — الحالة الأولية عند الإنشاء فقط (actor: 'system')
  confirmed: MERCHANT_OR_ADMIN,
  preparing: MERCHANT_OR_ADMIN,
  ready: MERCHANT_OR_ADMIN,
  out_for_delivery: MERCHANT_OR_ADMIN,
  delivered: MERCHANT_OR_ADMIN,
  cancelled: MERCHANT_OR_ADMIN,
};

export interface Order {
  id: string;
  userId: string;
  tenantId: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  deliveryAddress: DeliveryAddress;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusHistoryEntry {
  id: string;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  actorRole: OrderActorRole;
  actorId: string | null;
  note: string | null;
  createdAt: string;
}

// CRITICAL-FIXES-FROM-AUDIT-001، بند 4 — سياق الفاعل الإلزامي لأي قراءة تفصيلية على طلب واحد
// بمعرّفه (getOrderWithItems/getStatusHistory). إلزامي في نوع TypeScript نفسه لا تعليقاً تحذيرياً
// فقط — أي استدعاء مستقبلي بلا هذا السياق يفشل وقت الترجمة، لا وقت التشغيل فقط. نفس شكل
// tenantId/role في TransitionOrderStatusInput أدناه لأن نفس منطق التخويل (TENANT_SCOPED_ACTOR_ROLES)
// يُعاد استخدامه حرفياً لكلا الاتجاهين (تغيير الحالة، والقراءة التفصيلية).
export interface OrderActorContext {
  role: OrderActorRole;
  // إلزامي لأدوار التاجر (merchant_owner/manager/employee) — يُقارَن بـ order.tenantId. اختياري
  // فعلياً لـ'platform_admin' (يرى كل شيء) ولـ'system' (لا يُستخدَم استهلاكياً بعد الإنشاء الأولي).
  tenantId?: string;
}

export interface TransitionOrderStatusInput {
  orderId: string;
  toStatus: OrderStatus;
  actorRole: OrderActorRole;
  // إلزامي لأي فاعل تاجر (merchant_owner/manager/employee) — عزل المستأجرين (اليوم 10):
  // الطلب يجب أن يخص هذا التاجر بالذات، وإلا رفض صريح بدل السماح لتاجر بلمس طلب تاجر آخر.
  // اختياري فقط لـ'platform_admin' (يرى كل شيء) و'system' (لا يُستخدَم فعلياً بعد الإنشاء الأولي).
  tenantId?: string;
  actorId?: string;
  note?: string;
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

// عرض العميل الضيف (اليوم 14) — صفحة تتبّع الطلب /order/[id]، بلا حساب/تسجيل دخول. اسم المنتج
// مُثرى هنا (order_items لا يخزّن إلا productId) لعرض "اسم × كمية" مفهوم، لا معرّفات خام.
export interface OrderItemWithProductName {
  item: OrderItem;
  productName: string | null; // null فقط لو حُذف المنتج لاحقاً (لا حذف فعلي في المشروع اليوم)
}

export interface OrderCustomerView {
  order: Order;
  items: OrderItemWithProductName[];
}
