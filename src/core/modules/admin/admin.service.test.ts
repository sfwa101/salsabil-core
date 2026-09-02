// src/core/modules/admin/admin.service.test.ts
// اختبارات وحدة — تُموّه khalilService وmerchantService؛ منطق admin.service.ts نفسه حقيقي

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User, Session } from '../../kernel/khalil/types';
import type { Merchant } from '../merchant/types';

const adminUser: User = {
  id: 'user-admin-1',
  fullName: 'مدير المنصة',
  phone: '01000000001',
  role: 'platform_admin',
  createdAt: new Date().toISOString(),
};

const merchantOwner: User = {
  id: 'user-owner-1',
  fullName: 'صاحب محل',
  phone: '01000000000',
  role: 'merchant_owner',
  createdAt: new Date().toISOString(),
};

const adminSession: Session = { userId: adminUser.id, tenantId: null, role: 'platform_admin', expiresAt: new Date(Date.now() + 1000).toISOString() };

const merchant: Merchant = {
  id: 'merchant-1',
  ownerId: merchantOwner.id,
  businessName: 'محل تجريبي',
  phone: '01022222222',
  slug: 'test-merchant',
  commissionRate: 5,
  isActive: true,
  createdAt: new Date().toISOString(),
};

vi.mock('../../kernel/khalil/service', () => ({
  khalilService: {
    findUserByPhone: vi.fn(),
    createSession: vi.fn(async () => ({ token: 'admin-session-token', session: adminSession })),
  },
}));

vi.mock('../merchant/merchant.service', () => ({
  merchantService: {
    listAll: vi.fn(async () => [merchant]),
    findById: vi.fn(async () => merchant),
    setActiveStatus: vi.fn(async (id: string, isActive: boolean) => ({ ...merchant, id, isActive })),
  },
}));

vi.mock('../audit/audit.service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

const { adminService } = await import('./admin.service');
const { khalilService } = await import('../../kernel/khalil/service');
const { merchantService } = await import('../merchant/merchant.service');
const { auditService } = await import('../audit/audit.service');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AdminService.loginByPhone', () => {
  it('ينجح: هاتف platform_admin حقيقي → token وجلسة بـ tenantId: null، ويُسجَّل auth.login_success', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(adminUser);

    const result = await adminService.loginByPhone(adminUser.phone);

    expect(result).not.toBeNull();
    expect(result!.token).toBe('admin-session-token');
    expect(khalilService.createSession).toHaveBeenCalledWith({
      userId: adminUser.id,
      tenantId: null,
      role: 'platform_admin',
      ttlSeconds: expect.any(Number),
    });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_success', actorId: adminUser.id, actorRole: 'platform_admin' })
    );
  });

  it('يرفض (null) رقماً غير مسجَّل إطلاقاً، ويُسجَّل auth.login_failed بفاعل anonymous', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(null);

    const result = await adminService.loginByPhone('01099999999');

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: null, actorRole: 'anonymous' })
    );
  });

  it('يرفض (null) مستخدماً مسجَّلاً لكن دوره ليس platform_admin (مثال: merchant_owner)، ويُسجَّل auth.login_failed بدوره الحقيقي', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(merchantOwner);

    const result = await adminService.loginByPhone(merchantOwner.phone);

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'auth.login_failed', actorId: merchantOwner.id, actorRole: 'merchant_owner' })
    );
  });
});

describe('AdminService merchant management', () => {
  it('listMerchants يفوّض لـ merchantService.listAll', async () => {
    const result = await adminService.listMerchants();

    expect(merchantService.listAll).toHaveBeenCalled();
    expect(result).toEqual([merchant]);
  });

  it('setMerchantActiveStatus يفوّض لـ merchantService.setActiveStatus بنفس المعاملات، ويُسجِّل تدقيقاً بالفاعل والقيمتين قبل/بعد', async () => {
    const actor = { id: adminUser.id, role: adminUser.role };

    const result = await adminService.setMerchantActiveStatus('merchant-1', false, actor);

    expect(merchantService.setActiveStatus).toHaveBeenCalledWith('merchant-1', false);
    expect(result.isActive).toBe(false);
    expect(auditService.log).toHaveBeenCalledWith({
      actorId: adminUser.id,
      actorRole: 'platform_admin',
      action: 'merchant.deactivated',
      entityType: 'merchant',
      entityId: 'merchant-1',
      metadata: { before: { isActive: merchant.isActive }, after: { isActive: false } },
    });
  });
});
