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

const session: Session = { userId: owner.id, tenantId: activeMerchant.id, role: 'merchant_owner', expiresAt: new Date(Date.now() + 1000).toISOString(), mustChangePassword: false };

vi.mock('../../kernel/khalil/service', () => ({
  khalilService: {
    verifyPasswordForPhone: vi.fn(),
    createSession: vi.fn(async () => ({ token: 'session-token-1', session })),
  },
}));

vi.mock('./merchant.repository', () => ({
  merchantRepository: {
    findByOwnerId: vi.fn(),
    findAll: vi.fn(async () => [activeMerchant]),
    setActiveStatus: vi.fn(async (id: string, isActive: boolean) => ({ ...activeMerchant, id, isActive })),
    create: vi.fn(async () => activeMerchant),
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
  it('ينجح: هاتف+كلمة مرور صاحب تاجر نشط → token وجلسة صحيحة، ويُسجَّل auth.login_success', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: true, user: owner, mustChangePassword: false });
    vi.mocked(merchantRepository.findByOwnerId).mockResolvedValue(activeMerchant);

    const result = await merchantService.loginOwnerByPhone(owner.phone, 'correct-password');

    expect(result).not.toBeNull();
    expect(result!.token).toBe('session-token-1');
    expect(khalilService.createSession).toHaveBeenCalledWith({
      userId: owner.id,
      tenantId: activeMerchant.id,
      role: 'merchant_owner',
      ttlSeconds: expect.any(Number),
      mustChangePassword: false,
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_success', actorId: owner.id, actorRole: 'merchant_owner' })
    );
  });

  it('ينجح ويمرّر mustChangePassword: true فعلياً لإنشاء الجلسة (كلمة مرور مؤقتة لم تُغيَّر بعد)', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: true, user: owner, mustChangePassword: true });
    vi.mocked(merchantRepository.findByOwnerId).mockResolvedValue(activeMerchant);

    await merchantService.loginOwnerByPhone(owner.phone, 'temp-password');

    expect(khalilService.createSession).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: true }));
  });

  it('يرفض (null) رقماً غير مسجَّل إطلاقاً، ويُسجَّل auth.login_failed بفاعل anonymous وسبب not_found', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: false, reason: 'not_found', user: null });

    const result = await merchantService.loginOwnerByPhone('01099999999', 'any-password');

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: null, actorRole: 'anonymous', metadata: expect.objectContaining({ reason: 'not_found' }) })
    );
  });

  it('يرفض (null) كلمة مرور خاطئة لمالك تاجر حقيقي، ويُسجَّل auth.login_failed بفاعله الحقيقي وسبب wrong_password', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: false, reason: 'wrong_password', user: owner });

    const result = await merchantService.loginOwnerByPhone(owner.phone, 'wrong-password');

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: owner.id, actorRole: 'merchant_owner', metadata: expect.objectContaining({ reason: 'wrong_password' }) })
    );
  });

  it('يرفض (null) مستخدماً مسجَّلاً لكن ليس merchant_owner (عميل عادي)', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: true, user: customer, mustChangePassword: false });

    const result = await merchantService.loginOwnerByPhone(customer.phone, 'correct-password');

    expect(result).toBeNull();
    expect(merchantRepository.findByOwnerId).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: customer.id, actorRole: 'customer' })
    );
  });

  it('يرفض (null) مالك تاجر بلا سجل merchant مرتبط (بيانات ناقصة)', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: true, user: owner, mustChangePassword: false });
    vi.mocked(merchantRepository.findByOwnerId).mockResolvedValue(null);

    const result = await merchantService.loginOwnerByPhone(owner.phone, 'correct-password');

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: owner.id, metadata: expect.objectContaining({ reason: 'no_merchant_linked' }) })
    );
  });

  it('يرفض (null) تاجراً معطَّلاً (isActive: false)', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: true, user: owner, mustChangePassword: false });
    vi.mocked(merchantRepository.findByOwnerId).mockResolvedValue({ ...activeMerchant, isActive: false });

    const result = await merchantService.loginOwnerByPhone(owner.phone, 'correct-password');

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', metadata: expect.objectContaining({ reason: 'merchant_inactive' }) })
    );
  });
});

describe('MerchantService.register (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH)', () => {
  it('يفوّض مباشرة لـ merchantRepository.create بنفس المدخلات (مُستهلَك من scripts/create-merchant-account.ts)', async () => {
    const input = { ownerId: owner.id, businessName: 'محل جديد', phone: '01055555555', slug: 'new-shop', commissionRate: 8 };

    const result = await merchantService.register(input);

    expect(merchantRepository.create).toHaveBeenCalledWith(input);
    expect(result).toEqual(activeMerchant);
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
