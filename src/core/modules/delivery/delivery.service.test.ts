// src/core/modules/delivery/delivery.service.test.ts
// §31 بند 9 — اختبارات وحدة لعزل الملكية (مكتب/سائق) وآلة حالة الرحلة، أول كود يستهلك
// delivery_offices/drivers/delivery_jobs فعلياً.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DeliveryOffice, Driver, DeliveryJob } from './types';
import type { Order } from '../orders/types';

vi.mock('./delivery.repository', () => ({
  deliveryRepository: {
    findOfficeByOwnerId: vi.fn(),
    findDriverByUserId: vi.fn(),
    findDriverById: vi.fn(),
    findAssignedSuborderIds: vi.fn(async () => []),
    createDeliveryJob: vi.fn(),
    findDriversByOffice: vi.fn(),
    createDriver: vi.fn(),
    findJobsByOffice: vi.fn(),
    findJobById: vi.fn(),
    assignDriver: vi.fn(),
    findJobsByDriver: vi.fn(),
    findSuborderIdsForJob: vi.fn(),
    updateJobStatus: vi.fn(),
  },
}));

vi.mock('../orders/orders.service', () => ({
  ordersService: {
    getAllOrders: vi.fn(async () => []),
  },
}));

vi.mock('../audit/audit.service', () => ({
  auditService: { log: vi.fn() },
}));

const { deliveryService } = await import('./delivery.service');
const { deliveryRepository } = await import('./delivery.repository');
const { ordersService } = await import('../orders/orders.service');
const { auditService } = await import('../audit/audit.service');

const actor = { id: 'user-1', role: 'customer' as const };

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'suborder-1',
    customerOrderId: 'customer-order-1',
    userId: 'customer-1',
    tenantId: 'tenant-1',
    status: 'ready',
    paymentMethod: 'cash_on_delivery',
    deliveryAddress: { line1: 'شارع 1', city: 'القاهرة' },
    total: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const office: DeliveryOffice = { id: 'office-1', ownerId: 'user-1', name: 'مكتب اختبار', phone: '01000000000', isActive: true, createdAt: new Date().toISOString() };
const driver: Driver = { id: 'driver-1', officeId: 'office-1', userId: 'driver-user-1', isActive: true, createdAt: new Date().toISOString() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DeliveryService.listReadySuborderCandidates', () => {
  it('يعيد فقط suborders بحالة ready وغير مرتبطة برحلة توصيل بعد', async () => {
    vi.mocked(ordersService.getAllOrders).mockResolvedValue([
      makeOrder({ id: 'a', status: 'ready' }),
      makeOrder({ id: 'b', status: 'pending' }),
      makeOrder({ id: 'c', status: 'ready' }),
    ]);
    vi.mocked(deliveryRepository.findAssignedSuborderIds).mockResolvedValue(['c']);

    const result = await deliveryService.listReadySuborderCandidates();

    expect(result.map((o) => o.id)).toEqual(['a']);
  });
});

describe('DeliveryService.createDeliveryJobFromSuborder', () => {
  it('يرفض suborder لم يعد بحالة ready (سباق/تغيّر حالة)', async () => {
    vi.mocked(ordersService.getAllOrders).mockResolvedValue([makeOrder({ id: 'a', status: 'pending' })]);
    vi.mocked(deliveryRepository.findAssignedSuborderIds).mockResolvedValue([]);

    await expect(deliveryService.createDeliveryJobFromSuborder('office-1', 'a', actor)).rejects.toThrow('لم يعد متاحاً');
    expect(deliveryRepository.createDeliveryJob).not.toHaveBeenCalled();
  });

  it('ينشئ رحلة توصيل ويسجّل تدقيقاً لـsuborder جاهز فعلاً', async () => {
    vi.mocked(ordersService.getAllOrders).mockResolvedValue([makeOrder({ id: 'a', status: 'ready', customerOrderId: 'co-1' })]);
    vi.mocked(deliveryRepository.findAssignedSuborderIds).mockResolvedValue([]);
    const job: DeliveryJob = { id: 'job-1', customerOrderId: 'co-1', officeId: 'office-1', driverId: null, status: 'ready_for_pickup', createdAt: '', updatedAt: '' };
    vi.mocked(deliveryRepository.createDeliveryJob).mockResolvedValue(job);

    const result = await deliveryService.createDeliveryJobFromSuborder('office-1', 'a', actor);

    expect(deliveryRepository.createDeliveryJob).toHaveBeenCalledWith('co-1', 'office-1', 'a');
    expect(result).toEqual(job);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'delivery.job_created', entityId: 'job-1' }));
  });
});

describe('DeliveryService.assignDriverToJob — عزل ملكية', () => {
  it('يرفض إسناد رحلة لا تخص مكتب المستدعي', async () => {
    vi.mocked(deliveryRepository.findJobById).mockResolvedValue({ id: 'job-1', customerOrderId: 'co-1', officeId: 'other-office', driverId: null, status: 'ready_for_pickup', createdAt: '', updatedAt: '' });

    await expect(deliveryService.assignDriverToJob('office-1', 'job-1', 'driver-1', actor)).rejects.toThrow('لا تخص مكتبك');
    expect(deliveryRepository.assignDriver).not.toHaveBeenCalled();
  });

  it('يرفض إسناد سائق لا ينتمي لنفس المكتب', async () => {
    vi.mocked(deliveryRepository.findJobById).mockResolvedValue({ id: 'job-1', customerOrderId: 'co-1', officeId: 'office-1', driverId: null, status: 'ready_for_pickup', createdAt: '', updatedAt: '' });
    vi.mocked(deliveryRepository.findDriverById).mockResolvedValue({ ...driver, officeId: 'other-office' });

    await expect(deliveryService.assignDriverToJob('office-1', 'job-1', 'driver-1', actor)).rejects.toThrow('لا ينتمي لمكتبك');
  });

  it('يرفض إسناد سائق غير نشط', async () => {
    vi.mocked(deliveryRepository.findJobById).mockResolvedValue({ id: 'job-1', customerOrderId: 'co-1', officeId: 'office-1', driverId: null, status: 'ready_for_pickup', createdAt: '', updatedAt: '' });
    vi.mocked(deliveryRepository.findDriverById).mockResolvedValue({ ...driver, isActive: false });

    await expect(deliveryService.assignDriverToJob('office-1', 'job-1', 'driver-1', actor)).rejects.toThrow('غير نشط');
  });

  it('يُسند السائق ويسجّل تدقيقاً عند تطابق الملكية والنشاط', async () => {
    const job: DeliveryJob = { id: 'job-1', customerOrderId: 'co-1', officeId: 'office-1', driverId: null, status: 'ready_for_pickup', createdAt: '', updatedAt: '' };
    vi.mocked(deliveryRepository.findJobById).mockResolvedValue(job);
    vi.mocked(deliveryRepository.findDriverById).mockResolvedValue(driver);
    vi.mocked(deliveryRepository.assignDriver).mockResolvedValue({ ...job, driverId: 'driver-1', status: 'driver_assigned' });

    const result = await deliveryService.assignDriverToJob('office-1', 'job-1', 'driver-1', actor);

    expect(result.status).toBe('driver_assigned');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'delivery.driver_assigned' }));
  });
});

describe('DeliveryService.transitionJobStatus — عزل ملكية + آلة حالة', () => {
  it('يرفض تحديث رحلة غير مُسنَدة لهذا السائق', async () => {
    vi.mocked(deliveryRepository.findJobById).mockResolvedValue({ id: 'job-1', customerOrderId: 'co-1', officeId: 'office-1', driverId: 'other-driver', status: 'driver_assigned', createdAt: '', updatedAt: '' });

    await expect(deliveryService.transitionJobStatus('driver-1', 'job-1', 'picking_up', actor)).rejects.toThrow('ليست مُسنَدة لك');
    expect(deliveryRepository.updateJobStatus).not.toHaveBeenCalled();
  });

  it('يرفض انتقالاً غير مسموح في آلة الحالة (مثال: تخطّي مباشر لـdelivered من driver_assigned)', async () => {
    vi.mocked(deliveryRepository.findJobById).mockResolvedValue({ id: 'job-1', customerOrderId: 'co-1', officeId: 'office-1', driverId: 'driver-1', status: 'driver_assigned', createdAt: '', updatedAt: '' });

    await expect(deliveryService.transitionJobStatus('driver-1', 'job-1', 'delivered', actor)).rejects.toThrow('لا يمكن الانتقال');
  });

  it('يقبل انتقالاً صحيحاً (driver_assigned → picking_up) ويسجّل تدقيقاً', async () => {
    const job: DeliveryJob = { id: 'job-1', customerOrderId: 'co-1', officeId: 'office-1', driverId: 'driver-1', status: 'driver_assigned', createdAt: '', updatedAt: '' };
    vi.mocked(deliveryRepository.findJobById).mockResolvedValue(job);
    vi.mocked(deliveryRepository.updateJobStatus).mockResolvedValue({ ...job, status: 'picking_up' });

    const result = await deliveryService.transitionJobStatus('driver-1', 'job-1', 'picking_up', actor);

    expect(result.status).toBe('picking_up');
    expect(deliveryRepository.updateJobStatus).toHaveBeenCalledWith('job-1', 'driver_assigned', 'picking_up');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'delivery.job_status_updated' }));
  });

  it('يرمي خطأً صريحاً لو فشل التحديث تحت تزامن (updateJobStatus يعيد null)', async () => {
    const job: DeliveryJob = { id: 'job-1', customerOrderId: 'co-1', officeId: 'office-1', driverId: 'driver-1', status: 'driver_assigned', createdAt: '', updatedAt: '' };
    vi.mocked(deliveryRepository.findJobById).mockResolvedValue(job);
    vi.mocked(deliveryRepository.updateJobStatus).mockResolvedValue(null);

    await expect(deliveryService.transitionJobStatus('driver-1', 'job-1', 'picking_up', actor)).rejects.toThrow('أعد المحاولة');
  });
});
