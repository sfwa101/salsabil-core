// src/core/modules/delivery/types.ts
// §31 بند 9 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §7/§8/§29 بنود 9-10) — أول كود فعلي
// يستهلك delivery_offices/drivers/delivery_jobs/delivery_job_suborders (TASK-12، Schema فقط قبل
// هذه المهمة). V1 بإسناد يدوي بسيط بلا خوارزمية ترشيح، كما طلب §31 بند 9 صراحة.

export interface DeliveryOffice {
  id: string;
  ownerId: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: string;
}

export interface Driver {
  id: string;
  officeId: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
}

export const DELIVERY_JOB_STATUSES = ['ready_for_pickup', 'driver_assigned', 'picking_up', 'out_for_delivery', 'delivered', 'failed'] as const;
export type DeliveryJobStatus = (typeof DELIVERY_JOB_STATUSES)[number];

export const DELIVERY_JOB_STATUS_LABELS_AR: Record<DeliveryJobStatus, string> = {
  ready_for_pickup: 'جاهز للاستلام',
  driver_assigned: 'أُسنِد لسائق',
  picking_up: 'جارٍ الاستلام',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التسليم',
  failed: 'فشل التوصيل',
};

// آلة حالة بسيطة خطّية — لا خوارزمية ترشيح/توزيع (خارج نطاق V1 صراحة، §31 بند 9). السائق فقط ينتقل
// من driver_assigned حتى delivered/failed؛ ready_for_pickup→driver_assigned حصراً فعل المكتب
// (assignDriverToJob)، لا انتقال حالة عادي يقوم به سائق.
export const DELIVERY_JOB_TRANSITIONS: Record<DeliveryJobStatus, readonly DeliveryJobStatus[]> = {
  ready_for_pickup: [],
  driver_assigned: ['picking_up', 'failed'],
  picking_up: ['out_for_delivery', 'failed'],
  out_for_delivery: ['delivered', 'failed'],
  delivered: [],
  failed: [],
};

export interface DeliveryJob {
  id: string;
  customerOrderId: string;
  officeId: string | null;
  driverId: string | null;
  status: DeliveryJobStatus;
  createdAt: string;
  updatedAt: string;
}
