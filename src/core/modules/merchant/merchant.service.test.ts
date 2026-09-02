// src/core/modules/merchant/merchant.service.test.ts
// اختبارات وحدة — تُموّه khalilService وmerchantRepository؛ منطق merchant.service.ts نفسه حقيقي

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User, Session } from '../../kernel/khalil/types';
import type { Merchant } from './types';

const owner: User = {
  id: 'user-owner-1',
  fullName: 'صاحب المحل',
  phone: '01000000000',
  role: 'merchant_owner',
  createdAt: new Date().toISOString(),
};

const customer: User = {
  id: 'user-customer-1',
  fullName: 'زبون',
  phone: '01011111111',
  role: 'customer',
  createdAt: new Date().toISOString(),
};

const activeMerchant: Merchant = {
  id: 'merchant-1',
  ownerId: owner.id,
  businessName: 'محل تجريبي',
  phone: '01022222222',
  slug: 'test-merchant',
  commissionRate: 5,
  isActive: true,
  createdAt: new Date().toISOString(),
};

const session: Session = { userId: owner.id, tenantId: activeMerchant.id, role: 'merchant_owner', expiresAt: new Date(Date.now() + 1000).toISOString() };

vi.mock('../../kernel/khalil/service', () => ({
  khalilService: {
    findUserByPhone: vi.fn(),
    createSession: vi.fn(async () => ({ token: 'session-token-1', session })),
  },
}));

vi.mock('./merchant.repository', () => ({
  merchantRepository: {
    findByOwnerId: vi.fn(),
    findAll: vi.fn(async () => [activeMerchant]),
    setActiveStatus: vi.fn(async (id: string, isActive: boolean) => ({ ...activeMerchant, id, isActive })),
  },
}));

vi.mock('../audit/audit.service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

const { merchantService } = await import('./merchant.service');
const { khalilService } = await import('../../kernel/khalil/service');
const { merchantRepository } = await import('./merchant.repository');
const { auditService } = await import('../audit/audit.service');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MerchantService.loginOwnerByPhone', () => {
  it('ينجح: هاتف صاحب تاجر نشط → token وجلسة صحيحة، ويُسجَّل auth.login_success', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(owner);
    vi.mocked(merchantRepository.findByOwnerId).mockResolvedValue(activeMerchant);

    const result = await merchantService.loginOwnerByPhone(owner.phone);

    expect(result).not.toBeNull();
    expect(result!.token).toBe('session-token-1');
    expect(khalilService.createSession).toHaveBeenCalledWith({
      userId: owner.id,
      tenantId: activeMerchant.id,
      role: 'merchant_owner',
      ttlSeconds: expect.any(Number),
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_success', actorId: owner.id, actorRole: 'merchant_owner' })
    );
  });

  it('يرفض (null) رقماً غير مسجَّل إطلاقاً، ويُسجَّل auth.login_failed بفاعل anonymous', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(null);

    const result = await merchantService.loginOwnerByPhone('01099999999');

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: null, actorRole: 'anonymous' })
    );
  });

  it('يرفض (null) مستخدماً مسجَّلاً لكن ليس merchant_owner (عميل عادي)', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(customer);

    const result = await merchantService.loginOwnerByPhone(customer.phone);

    expect(result).toBeNull();
    expect(merchantRepository.findByOwnerId).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: customer.id, actorRole: 'customer' })
    );
  });

  it('يرفض (null) مالك تاجر بلا سجل merchant مرتبط (بيانات ناقصة)', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(owner);
    vi.mocked(merchantRepository.findByOwnerId).mockResolvedValue(null);

    const result = await merchantService.loginOwnerByPhone(owner.phone);

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: owner.id, metadata: expect.objectContaining({ reason: 'no_merchant_linked' }) })
    );
  });

  it('يرفض (null) تاجراً معطَّلاً (isActive: false)', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(owner);
    vi.mocked(merchantRepository.findByOwnerId).mockResolvedValue({ ...activeMerchant, isActive: false });

    const result = await merchantService.loginOwnerByPhone(owner.phone);

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', metadata: expect.objectContaining({ reason: 'merchant_inactive' }) })
    );
  });
});

describe('MerchantService — عمليات الإدارة (اليوم 11)', () => {
  it('listAll يفوّض لـ merchantRepository.findAll', async () => {
    const result = await merchantService.listAll();

    expect(merchantRepository.findAll).toHaveBeenCalled();
    expect(result).toEqual([activeMerchant]);
  });

  it('setActiveStatus يفوّض لـ merchantRepository.setActiveStatus بنفس id وisActive، بلا تعديل أي حقل آخر', async () => {
    const result = await merchantService.setActiveStatus('merchant-1', false);

    expect(merchantRepository.setActiveStatus).toHaveBeenCalledWith('merchant-1', false);
    expect(result).toEqual({ ...activeMerchant, id: 'merchant-1', isActive: false });
  });
});
