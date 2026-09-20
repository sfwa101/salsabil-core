// src/core/modules/notifications/notification.service.test.ts
// §31 بند 10 — الدالة الرئيسية **لا يجوز أن ترمي أبداً** (Best-Effort) بصرف النظر عن أي فشل داخلي —
// هذا هو الاختبار الأهم هنا (انتقال حالة طلب حقيقي ناجح يجب ألا يفشل بسبب إشعار).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Order } from '../orders/types';

vi.mock('./sms-provider', () => ({
  sendSms: vi.fn(),
  isSmsConfigured: vi.fn(() => false),
}));

vi.mock('../audit/audit.service', () => ({
  auditService: { log: vi.fn(async () => ({})) },
}));

vi.mock('../../kernel/khalil/service', () => ({
  khalilService: { findUserById: vi.fn() },
}));

vi.mock('../merchant/merchant.service', () => ({
  merchantService: { findById: vi.fn() },
}));

const { notificationService } = await import('./notification.service');
const { sendSms, isSmsConfigured } = await import('./sms-provider');
const { auditService } = await import('../audit/audit.service');
const { khalilService } = await import('../../kernel/khalil/service');
const { merchantService } = await import('../merchant/merchant.service');

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'suborder-1',
    customerOrderId: 'co-1',
    userId: 'customer-1',
    tenantId: 'tenant-1',
    status: 'confirmed',
    paymentMethod: 'cash_on_delivery',
    deliveryAddress: { line1: 'شارع 1', city: 'القاهرة' },
    total: 50,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NotificationService.notifyOrderStatusChanged', () => {
  it('يرسل (أو يسجّل محاولة) لكل من العميل والتاجر، ويسجّل تدقيقاً بحالة الإرسال الحقيقية', async () => {
    vi.mocked(khalilService.findUserById).mockImplementation(async (id: string) =>
      id === 'customer-1'
        ? { id: 'customer-1', fullName: 'عميل', phone: '01000000001', role: 'customer', createdAt: '' }
        : { id: 'owner-1', fullName: 'مالك', phone: '01000000002', role: 'merchant_owner', createdAt: '' }
    );
    vi.mocked(merchantService.findById).mockResolvedValue({
      id: 'tenant-1', ownerId: 'owner-1', businessName: 'تاجر', phone: '010', slug: 'x', commissionRate: 0, isActive: true, createdAt: '', defaultSettlementModel: null,
    });
    vi.mocked(sendSms).mockResolvedValue({ ok: false, errorMessage: 'not configured' });

    await notificationService.notifyOrderStatusChanged(makeOrder());

    expect(sendSms).toHaveBeenCalledTimes(2);
    expect(sendSms).toHaveBeenCalledWith('01000000001', expect.stringContaining('طلبك'));
    expect(sendSms).toHaveBeenCalledWith('01000000002', expect.stringContaining('الطلب'));
    expect(auditService.log).toHaveBeenCalledTimes(2);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'notification.sms_attempted', metadata: expect.objectContaining({ sent: false, providerConfigured: false }) })
    );
  });

  it('لا يرمي أبداً حتى لو فشل حل بيانات المستلم كلياً (استثناء داخلي)', async () => {
    vi.mocked(khalilService.findUserById).mockRejectedValue(new Error('DB down'));

    await expect(notificationService.notifyOrderStatusChanged(makeOrder())).resolves.toBeUndefined();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'notification.sms_attempted', metadata: expect.objectContaining({ sent: false, errorMessage: 'DB down' }) })
    );
  });

  it('لا يرمي أبداً حتى لو فشل sendSms نفسه برمي استثناء غير متوقَّع', async () => {
    vi.mocked(khalilService.findUserById).mockResolvedValue({ id: 'customer-1', fullName: 'عميل', phone: '01000000001', role: 'customer', createdAt: '' });
    vi.mocked(merchantService.findById).mockResolvedValue(null);
    vi.mocked(sendSms).mockRejectedValue(new Error('network exploded'));

    await expect(notificationService.notifyOrderStatusChanged(makeOrder())).resolves.toBeUndefined();
  });

  it('يسجّل sent:true عند نجاح الإرسال الفعلي (محاكاة بيانات اعتماد مُفعَّلة)', async () => {
    vi.mocked(khalilService.findUserById).mockResolvedValue({ id: 'customer-1', fullName: 'عميل', phone: '01000000001', role: 'customer', createdAt: '' });
    vi.mocked(merchantService.findById).mockResolvedValue(null);
    vi.mocked(isSmsConfigured).mockReturnValue(true);
    vi.mocked(sendSms).mockResolvedValue({ ok: true, providerMessageId: 'sms-123' });

    await notificationService.notifyOrderStatusChanged(makeOrder());

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ sent: true, providerConfigured: true, providerMessageId: 'sms-123' }) })
    );
  });
});
