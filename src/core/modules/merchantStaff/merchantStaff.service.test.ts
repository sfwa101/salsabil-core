// src/core/modules/merchantStaff/merchantStaff.service.test.ts
// اختبارات وحدة — تُموّه طبقة الوصول لقاعدة البيانات (merchantStaff.repository.ts) وkhalilService
// وmerchantService (نفس نمط orders.service.test.ts المجاور تماماً).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '../../kernel/khalil/types';
import type { Merchant } from '../merchant/types';
import type { MerchantStaff } from './types';

const ownerUser: User = { id: 'owner-1', fullName: 'مالك اختبار', phone: '01000000001', role: 'merchant_owner', createdAt: new Date().toISOString() };
const adminUser: User = { id: 'admin-1', fullName: 'إداري اختبار', phone: '01000000002', role: 'platform_admin', createdAt: new Date().toISOString() };
const customerUser: User = { id: 'user-2', fullName: 'موظف اختبار', phone: '01000000003', role: 'customer', createdAt: new Date().toISOString() };
const employeeUser: User = { id: 'user-3', fullName: 'موظف اختبار 2', phone: '01000000004', role: 'employee', createdAt: new Date().toISOString() };

const usersById: Record<string, User> = {
  [ownerUser.id]: ownerUser,
  [adminUser.id]: adminUser,
  [customerUser.id]: customerUser,
  [employeeUser.id]: employeeUser,
};

vi.mock('../../kernel/khalil/service', () => ({
  khalilService: {
    findUserById: vi.fn(async (id: string) => usersById[id] ?? null),
    setUserRole: vi.fn(async () => undefined),
  },
}));

const merchantA: Merchant = {
  id: 'tenant-a',
  ownerId: ownerUser.id,
  businessName: 'تاجر أ',
  phone: '01000000005',
  slug: 'tenant-a',
  commissionRate: 10,
  isActive: true,
  createdAt: new Date().toISOString(),
};

vi.mock('../merchant/merchant.service', () => ({
  merchantService: {
    findById: vi.fn(async (id: string) => (id === merchantA.id ? merchantA : null)),
  },
}));

function makeStaff(overrides: Partial<MerchantStaff> = {}): MerchantStaff {
  return {
    id: 'staff-1',
    tenantId: 'tenant-a',
    userId: customerUser.id,
    role: 'staff',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

vi.mock('./merchantStaff.repository', () => ({
  merchantStaffRepository: {
    create: vi.fn(async (tenantId: string, userId: string) => makeStaff({ tenantId, userId })),
    findById: vi.fn(),
    findByTenantAndUser: vi.fn(async () => null),
    listByTenant: vi.fn(async () => []),
    setActiveStatus: vi.fn(async (id: string, isActive: boolean) => makeStaff({ id, isActive })),
  },
}));

const { merchantStaffService } = await import('./merchantStaff.service');
const { merchantStaffRepository } = await import('./merchantStaff.repository');
const { khalilService } = await import('../../kernel/khalil/service');

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(khalilService.findUserById).mockImplementation(async (id: string) => usersById[id] ?? null);
  vi.mocked(merchantStaffRepository.findByTenantAndUser).mockResolvedValue(null);
  vi.mocked(merchantStaffRepository.create).mockImplementation(async (tenantId, userId) => makeStaff({ tenantId, userId }));
  vi.mocked(merchantStaffRepository.setActiveStatus).mockImplementation(async (id, isActive) => makeStaff({ id, isActive }));
});

describe('MerchantStaffService.addStaff', () => {
  it('حالة اختبار 4: يرفض إضافة موظف من فاعل ليس owner لهذا التاجر بالذات', async () => {
    await expect(
      merchantStaffService.addStaff({ role: 'employee', tenantId: 'tenant-a' }, { tenantId: 'tenant-a', userId: customerUser.id })
    ).rejects.toThrow(/فقط مالك/);
    expect(merchantStaffRepository.create).not.toHaveBeenCalled();
  });

  it('يرفض owner تاجر آخر (tenantId لا يطابق)', async () => {
    await expect(
      merchantStaffService.addStaff({ role: 'merchant_owner', tenantId: 'tenant-b' }, { tenantId: 'tenant-a', userId: customerUser.id })
    ).rejects.toThrow(/فقط مالك/);
    expect(merchantStaffRepository.create).not.toHaveBeenCalled();
  });

  it('يرفض platform_admin (لا تجاوز هنا عمداً — عكس orders.service.ts)', async () => {
    await expect(
      merchantStaffService.addStaff({ role: 'platform_admin' }, { tenantId: 'tenant-a', userId: customerUser.id })
    ).rejects.toThrow(/فقط مالك/);
  });

  it('يرفض إن لم يوجد المستخدم المستهدَف', async () => {
    await expect(
      merchantStaffService.addStaff({ role: 'merchant_owner', tenantId: 'tenant-a' }, { tenantId: 'tenant-a', userId: 'missing' })
    ).rejects.toThrow(/غير موجود/);
  });

  it('يرفض إضافة مالك تاجر آخر كموظف (تعارض دور)', async () => {
    await expect(
      merchantStaffService.addStaff({ role: 'merchant_owner', tenantId: 'tenant-a' }, { tenantId: 'tenant-a', userId: ownerUser.id })
    ).rejects.toThrow(/تعارض|مالك تاجر أو مسؤول منصة/);
  });

  it('يرفض إضافة مسؤول منصة كموظف (تعارض دور)', async () => {
    await expect(
      merchantStaffService.addStaff({ role: 'merchant_owner', tenantId: 'tenant-a' }, { tenantId: 'tenant-a', userId: adminUser.id })
    ).rejects.toThrow(/مالك تاجر أو مسؤول منصة/);
  });

  it('حالة اختبار 1: owner ينجح في إضافة موظف جديد لمتجره، ويُرقّى دور المستخدم customer→employee', async () => {
    const staff = await merchantStaffService.addStaff(
      { role: 'merchant_owner', tenantId: 'tenant-a' },
      { tenantId: 'tenant-a', userId: customerUser.id }
    );

    expect(staff.tenantId).toBe('tenant-a');
    expect(staff.userId).toBe(customerUser.id);
    expect(staff.isActive).toBe(true);
    expect(khalilService.setUserRole).toHaveBeenCalledWith(customerUser.id, 'employee');
    expect(merchantStaffRepository.create).toHaveBeenCalledWith('tenant-a', customerUser.id);
  });

  it('لا يعيد ترقية دور مستخدم already employee', async () => {
    await merchantStaffService.addStaff({ role: 'merchant_owner', tenantId: 'tenant-a' }, { tenantId: 'tenant-a', userId: employeeUser.id });
    expect(khalilService.setUserRole).not.toHaveBeenCalled();
  });

  it('يرفض إضافة موظف نشط بالفعل مرتين (تكرار)', async () => {
    vi.mocked(merchantStaffRepository.findByTenantAndUser).mockResolvedValueOnce(makeStaff({ isActive: true }));
    await expect(
      merchantStaffService.addStaff({ role: 'merchant_owner', tenantId: 'tenant-a' }, { tenantId: 'tenant-a', userId: customerUser.id })
    ).rejects.toThrow(/موظف بالفعل/);
    expect(merchantStaffRepository.create).not.toHaveBeenCalled();
  });

  it('يُعيد تفعيل صف موظف مُعطَّل مسبقاً بدل رفضه أو تكراره', async () => {
    const existing = makeStaff({ id: 'staff-old', isActive: false });
    vi.mocked(merchantStaffRepository.findByTenantAndUser).mockResolvedValueOnce(existing);

    const staff = await merchantStaffService.addStaff(
      { role: 'merchant_owner', tenantId: 'tenant-a' },
      { tenantId: 'tenant-a', userId: customerUser.id }
    );

    expect(merchantStaffRepository.setActiveStatus).toHaveBeenCalledWith('staff-old', true);
    expect(merchantStaffRepository.create).not.toHaveBeenCalled();
    expect(staff.isActive).toBe(true);
  });
});

describe('MerchantStaffService.setStaffActiveStatus', () => {
  it('حالة اختبار 3: owner ينجح في تعطيل موظف تاجره', async () => {
    vi.mocked(merchantStaffRepository.findById).mockResolvedValue(makeStaff({ id: 'staff-1', isActive: true }));

    const staff = await merchantStaffService.setStaffActiveStatus({ role: 'merchant_owner', tenantId: 'tenant-a' }, 'staff-1', false);

    expect(merchantStaffRepository.setActiveStatus).toHaveBeenCalledWith('staff-1', false);
    expect(staff.isActive).toBe(false);
  });

  it('يرفض owner تاجر آخر يحاول تعطيل موظف ليس تابعاً له', async () => {
    vi.mocked(merchantStaffRepository.findById).mockResolvedValue(makeStaff({ id: 'staff-1', tenantId: 'tenant-a' }));

    await expect(
      merchantStaffService.setStaffActiveStatus({ role: 'merchant_owner', tenantId: 'tenant-b' }, 'staff-1', false)
    ).rejects.toThrow(/فقط مالك/);
    expect(merchantStaffRepository.setActiveStatus).not.toHaveBeenCalled();
  });

  it('يرمي خطأً صريحاً لموظف غير موجود', async () => {
    vi.mocked(merchantStaffRepository.findById).mockResolvedValue(null);
    await expect(
      merchantStaffService.setStaffActiveStatus({ role: 'merchant_owner', tenantId: 'tenant-a' }, 'missing', false)
    ).rejects.toThrow(/غير موجود/);
  });
});

describe('MerchantStaffService.listStaffForTenant', () => {
  it('يرفض فاعلاً ليس owner هذا التاجر', async () => {
    await expect(merchantStaffService.listStaffForTenant({ role: 'employee', tenantId: 'tenant-a' }, 'tenant-a')).rejects.toThrow(/فقط مالك/);
  });

  it('يُعيد قائمة موظفي التاجر لـowner المطابق', async () => {
    const list = [makeStaff({ id: 's1' }), makeStaff({ id: 's2', isActive: false })];
    vi.mocked(merchantStaffRepository.listByTenant).mockResolvedValue(list);

    const result = await merchantStaffService.listStaffForTenant({ role: 'merchant_owner', tenantId: 'tenant-a' }, 'tenant-a');
    expect(result).toEqual(list);
  });
});

describe('MerchantStaffService.assertActiveStaff', () => {
  it('حالة اختبار 3 (الجزء الثاني): يرفض فوراً موظفاً مُعطَّلاً — لا وصول ضمني', async () => {
    vi.mocked(merchantStaffRepository.findByTenantAndUser).mockResolvedValue(makeStaff({ isActive: false }));
    await expect(merchantStaffService.assertActiveStaff('tenant-a', customerUser.id)).rejects.toThrow(/لا عضوية نشطة/);
  });

  it('يرفض مستخدماً بلا أي صف merchant_staff إطلاقاً', async () => {
    vi.mocked(merchantStaffRepository.findByTenantAndUser).mockResolvedValue(null);
    await expect(merchantStaffService.assertActiveStaff('tenant-a', customerUser.id)).rejects.toThrow(/لا عضوية نشطة/);
  });

  it('ينجح لموظف نشط فعلاً', async () => {
    const staff = makeStaff({ isActive: true });
    vi.mocked(merchantStaffRepository.findByTenantAndUser).mockResolvedValue(staff);
    await expect(merchantStaffService.assertActiveStaff('tenant-a', customerUser.id)).resolves.toEqual(staff);
  });
});

describe('MerchantStaffService.resolveActorContextForTenant', () => {
  it('يُعيد merchant_owner لصاحب التاجر فعلياً بلا حاجة لصف merchant_staff', async () => {
    const result = await merchantStaffService.resolveActorContextForTenant(ownerUser.id, 'tenant-a');
    expect(result).toEqual({ role: 'merchant_owner', tenantId: 'tenant-a' });
    expect(merchantStaffRepository.findByTenantAndUser).not.toHaveBeenCalled();
  });

  it('يُعيد employee لعضو staff نشط', async () => {
    vi.mocked(merchantStaffRepository.findByTenantAndUser).mockResolvedValue(makeStaff({ isActive: true, userId: customerUser.id }));
    const result = await merchantStaffService.resolveActorContextForTenant(customerUser.id, 'tenant-a');
    expect(result).toEqual({ role: 'employee', tenantId: 'tenant-a' });
  });

  it('يرفض مستخدماً ليس owner ولا staff نشط لهذا التاجر', async () => {
    vi.mocked(merchantStaffRepository.findByTenantAndUser).mockResolvedValue(null);
    await expect(merchantStaffService.resolveActorContextForTenant('stranger', 'tenant-a')).rejects.toThrow(/لا عضوية نشطة/);
  });
});
