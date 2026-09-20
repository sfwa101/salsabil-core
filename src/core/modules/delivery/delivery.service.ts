// src/core/modules/delivery/delivery.service.ts
// منطق الأعمال لنطاق التوصيل — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر deliveryRepository.
// يستدعي ordersService.getAllOrders() لإيجاد مرشَّحين للإسناد (merchant_suborders بحالة 'ready') —
// نفس نمط orders.service.ts الذي يستدعي catalogService/merchantService مباشرة (ADR-021)، لا وصولاً
// مباشراً لجدول نطاق آخر من هنا.

import { deliveryRepository } from './delivery.repository';
import { ordersService } from '../orders/orders.service';
import { auditService } from '../audit/audit.service';
import { DELIVERY_JOB_TRANSITIONS, type DeliveryOffice, type Driver, type DeliveryJob, type DeliveryJobStatus } from './types';
import type { Order } from '../orders/types';
import type { AuditActorRole } from '../audit/types';

export interface ReadySuborderCandidate {
  suborder: Order;
}

// UserRole/AuditActorRole لا يحملان بعد قيمة مخصَّصة لمالك مكتب توصيل/سائق (قرار معلَّق بند 9 —
// راجع سجل البناء الليلي 2026-09-20). الجلسة الفعلية لكليهما تُخزَّن حالياً بـrole:'customer' (أدنى
// صلاحية في النظام، لا يمنح أي امتياز إضافي في أي مكان آخر — التخويل الحقيقي هنا مصدره فحص عضوية
// delivery_offices/drivers صراحة في كل دالة أدناه، لا قيمة role نفسها) — actor.role يُمرَّر كما هو
// من الجلسة لتسجيل تدقيق صادق (لا افتراء دور مختلف)، لا اختراعاً لقيمة "أدق" غير موجودة فعلياً.
interface DeliveryActor {
  id: string;
  role: AuditActorRole;
}

export class DeliveryService {
  async getOfficeByOwnerId(ownerId: string): Promise<DeliveryOffice | null> {
    return deliveryRepository.findOfficeByOwnerId(ownerId);
  }

  async getDriverByUserId(userId: string): Promise<Driver | null> {
    return deliveryRepository.findDriverByUserId(userId);
  }

  // مرشَّحون للإسناد: merchant_suborders بحالة 'ready' وليست مرتبطة برحلة توصيل بعد. لا فلترة حسب
  // مكتب (V1 بلا خوارزمية توزيع جغرافي/تخصيص مكاتب — أي مكتب يرى كل الطلبات الجاهزة، إسناد يدوي
  // بسيط بلا منافسة محسومة، قرار معلَّق موثَّق في سجل البناء الليلي إن احتاج المؤسس تخصيصاً لاحقاً).
  async listReadySuborderCandidates(): Promise<Order[]> {
    const [allOrders, assignedIds] = await Promise.all([ordersService.getAllOrders(), deliveryRepository.findAssignedSuborderIds()]);
    const assignedSet = new Set(assignedIds);
    return allOrders.filter((o) => o.status === 'ready' && !assignedSet.has(o.id));
  }

  // إنشاء رحلة توصيل من suborder جاهز — تحقُّق دفاعي أن الـsuborder فعلاً بحالة 'ready' ولم تُسنَد
  // رحلة له بعد (سباق نادر بين طلبين متزامنين لنفس suborder — الفشل هنا صريح، لا نجاح صامت مزدوج).
  async createDeliveryJobFromSuborder(officeId: string, merchantSuborderId: string, actor: DeliveryActor): Promise<DeliveryJob> {
    const candidates = await this.listReadySuborderCandidates();
    const suborder = candidates.find((o) => o.id === merchantSuborderId);
    if (!suborder) throw new Error('هذا الطلب لم يعد متاحاً للإسناد — قد يكون أُسنِد بالفعل أو تغيّرت حالته');
    if (!suborder.customerOrderId) throw new Error('بيانات الطلب غير مكتملة (لا customerOrderId) — لا يمكن إنشاء رحلة توصيل');

    const job = await deliveryRepository.createDeliveryJob(suborder.customerOrderId, officeId, merchantSuborderId);
    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'delivery.job_created',
      entityType: 'delivery_job',
      entityId: job.id,
      metadata: { officeId, merchantSuborderId, customerOrderId: suborder.customerOrderId },
    });
    return job;
  }

  async listDriversForOffice(officeId: string): Promise<Driver[]> {
    return deliveryRepository.findDriversByOffice(officeId);
  }

  async addDriver(officeId: string, userId: string, actor: DeliveryActor): Promise<Driver> {
    const driver = await deliveryRepository.createDriver(officeId, userId);
    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'delivery.driver_added',
      entityType: 'driver',
      entityId: driver.id,
      metadata: { officeId, userId },
    });
    return driver;
  }

  async listJobsForOffice(officeId: string): Promise<DeliveryJob[]> {
    return deliveryRepository.findJobsByOffice(officeId);
  }

  // عزل ملكية صريح: الرحلة يجب أن تخص هذا المكتب فعلاً قبل إسناد سائق (نفس فلسفة عزل المستأجرين في
  // orders.service.ts.assertActorCanAccessOrder).
  async assignDriverToJob(officeId: string, jobId: string, driverId: string, actor: DeliveryActor): Promise<DeliveryJob> {
    const job = await deliveryRepository.findJobById(jobId);
    if (!job || job.officeId !== officeId) throw new Error('هذه الرحلة لا تخص مكتبك — لا يمكنك التعديل عليها');

    const driver = await deliveryRepository.findDriverById(driverId);
    if (!driver || driver.officeId !== officeId || !driver.isActive) throw new Error('هذا السائق لا ينتمي لمكتبك أو غير نشط');

    const updated = await deliveryRepository.assignDriver(jobId, driverId);
    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'delivery.driver_assigned',
      entityType: 'delivery_job',
      entityId: jobId,
      metadata: { officeId, driverId },
    });
    return updated;
  }

  async listJobsForDriver(driverId: string): Promise<DeliveryJob[]> {
    return deliveryRepository.findJobsByDriver(driverId);
  }

  // بنود الرحلة (أي merchant_suborders مرتبطة بها) للوحة السائق — عنوان التوصيل + المنتجات، السائق
  // يحتاجها فعلياً لتنفيذ التوصيل. يستدعي ordersService.getAllOrders() ثم يُصفّي محلياً (نفس نمط
  // listReadySuborderCandidates أعلاه) بدل استعلام جديد في orders.repository.ts (لا تكرار منطق).
  async getSubordersForJob(jobId: string): Promise<Order[]> {
    const suborderIds = await deliveryRepository.findSuborderIdsForJob(jobId);
    if (suborderIds.length === 0) return [];
    const idSet = new Set(suborderIds);
    const allOrders = await ordersService.getAllOrders();
    return allOrders.filter((o) => idSet.has(o.id));
  }

  // عزل ملكية صريح: السائق لا يستطيع تحديث حالة رحلة ليست مُسنَدة له فعلياً.
  async transitionJobStatus(driverId: string, jobId: string, toStatus: DeliveryJobStatus, actor: DeliveryActor): Promise<DeliveryJob> {
    const job = await deliveryRepository.findJobById(jobId);
    if (!job || job.driverId !== driverId) throw new Error('هذه الرحلة ليست مُسنَدة لك — لا يمكنك تحديث حالتها');

    if (!DELIVERY_JOB_TRANSITIONS[job.status].includes(toStatus)) {
      throw new Error(`لا يمكن الانتقال من "${job.status}" إلى "${toStatus}"`);
    }

    const updated = await deliveryRepository.updateJobStatus(jobId, job.status, toStatus);
    if (!updated) throw new Error('فشل تحديث الحالة — قد تكون تغيّرت من طرف آخر، أعد المحاولة');

    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'delivery.job_status_updated',
      entityType: 'delivery_job',
      entityId: jobId,
      metadata: { driverId, fromStatus: job.status, toStatus },
    });
    return updated;
  }
}

export const deliveryService = new DeliveryService();
