// src/core/kernel/khalil/service.test.ts
// اختبارات وحدة — تُموّه khalilRepository فقط؛ منطق khalil.service.ts نفسه حقيقي

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session, User, World, UserPersona } from './types';

const user: User = { id: 'user-1', fullName: 'تاجر', phone: '01000000000', role: 'merchant_owner', createdAt: new Date().toISOString() };

const customer: User = { id: 'user-2', fullName: 'زبون', phone: '01099999999', role: 'customer', createdAt: new Date().toISOString() };

const individualsWorld: World = { id: 'world-1', slug: 'individuals', name: 'الأفراد', isActive: true, createdAt: new Date().toISOString() };

const persona: UserPersona = { id: 'persona-1', userId: 'user-2', worldId: 'world-1', isDefault: true, createdAt: new Date().toISOString() };

const validSession: Session = {
  userId: 'user-1',
  tenantId: 'merchant-1',
  role: 'merchant_owner',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
};

const expiredSession: Session = {
  ...validSession,
  expiresAt: new Date(Date.now() - 60_000).toISOString(),
};

vi.mock('./khalil.repository', () => ({
  khalilRepository: {
    findUserByPhoneAdmin: vi.fn(),
    createUser: vi.fn(),
    createSession: vi.fn(),
    findSessionByToken: vi.fn(),
    deleteSession: vi.fn(),
    findWorldBySlug: vi.fn(),
    findPersonaByUserAndWorld: vi.fn(),
    createPersona: vi.fn(),
  },
}));

const { khalilService } = await import('./service');
const { khalilRepository } = await import('./khalil.repository');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('KhalilService.findUserByPhone', () => {
  it('يعيد null بلا إنشاء أي شيء إذا لم يُوجَد مستخدم مطابق (عكس findOrCreateCustomerByPhone)', async () => {
    vi.mocked(khalilRepository.findUserByPhoneAdmin).mockResolvedValue(null);

    const result = await khalilService.findUserByPhone('01099999999');

    expect(result).toBeNull();
    expect(khalilRepository.createUser).not.toHaveBeenCalled();
  });

  it('يعيد المستخدم الموجود كما هو', async () => {
    vi.mocked(khalilRepository.findUserByPhoneAdmin).mockResolvedValue(user);

    const result = await khalilService.findUserByPhone(user.phone);

    expect(result).toEqual(user);
  });
});

describe('KhalilService.validateSessionToken', () => {
  it('يعيد null إذا لم يوجد رمز مطابق', async () => {
    vi.mocked(khalilRepository.findSessionByToken).mockResolvedValue(null);

    const result = await khalilService.validateSessionToken('unknown-token');

    expect(result).toBeNull();
  });

  it('يعيد null لجلسة منتهية الصلاحية (بلا تمييز عن "غير موجودة" للمستدعي)', async () => {
    vi.mocked(khalilRepository.findSessionByToken).mockResolvedValue(expiredSession);

    const result = await khalilService.validateSessionToken('expired-token');

    expect(result).toBeNull();
  });

  it('يعيد الجلسة لرمز صالح وغير منتهٍ', async () => {
    vi.mocked(khalilRepository.findSessionByToken).mockResolvedValue(validSession);

    const result = await khalilService.validateSessionToken('valid-token');

    expect(result).toEqual(validSession);
  });
});

describe('KhalilService.createSession / destroySession', () => {
  it('createSession يفوّض مباشرة لـ khalilRepository.createSession بنفس المدخلات', async () => {
    vi.mocked(khalilRepository.createSession).mockResolvedValue({ token: 'tok-1', session: validSession });

    const result = await khalilService.createSession({ userId: 'user-1', tenantId: 'merchant-1', role: 'merchant_owner', ttlSeconds: 3600 });

    expect(khalilRepository.createSession).toHaveBeenCalledWith({ userId: 'user-1', tenantId: 'merchant-1', role: 'merchant_owner', ttlSeconds: 3600 });
    expect(result.token).toBe('tok-1');
  });

  it('destroySession يفوّض مباشرة لـ khalilRepository.deleteSession', async () => {
    await khalilService.destroySession('tok-1');

    expect(khalilRepository.deleteSession).toHaveBeenCalledWith('tok-1');
  });
});

describe('KhalilService.canAccessTenant', () => {
  it('يسمح لـ platform_admin بلا قيد', () => {
    const adminSession: Session = { userId: 'admin-1', tenantId: null, role: 'platform_admin', expiresAt: validSession.expiresAt };
    expect(khalilService.canAccessTenant(adminSession, 'any-tenant')).toBe(true);
  });

  it('يرفض تاجراً يحاول الوصول لمستأجر مختلف عن جلسته', () => {
    expect(khalilService.canAccessTenant(validSession, 'different-tenant')).toBe(false);
  });

  it('يسمح لتاجر بالوصول لنفس مستأجره', () => {
    expect(khalilService.canAccessTenant(validSession, 'merchant-1')).toBe(true);
  });
});

// اليوم 21 (ADR-019) — worlds/user_personas عبر service.ts لأول مرة
describe('KhalilService.ensureIndividualPersona', () => {
  it('يعيد الشخصية الموجودة بلا إنشاء جديدة إن وُجدت مسبقاً', async () => {
    vi.mocked(khalilRepository.findWorldBySlug).mockResolvedValue(individualsWorld);
    vi.mocked(khalilRepository.findPersonaByUserAndWorld).mockResolvedValue(persona);

    const result = await khalilService.ensureIndividualPersona('user-2');

    expect(result).toEqual(persona);
    expect(khalilRepository.createPersona).not.toHaveBeenCalled();
  });

  it('ينشئ شخصية افتراضية جديدة إن لم توجد', async () => {
    vi.mocked(khalilRepository.findWorldBySlug).mockResolvedValue(individualsWorld);
    vi.mocked(khalilRepository.findPersonaByUserAndWorld).mockResolvedValue(null);
    vi.mocked(khalilRepository.createPersona).mockResolvedValue(persona);

    const result = await khalilService.ensureIndividualPersona('user-2');

    expect(khalilRepository.createPersona).toHaveBeenCalledWith({ userId: 'user-2', worldId: 'world-1', isDefault: true });
    expect(result).toEqual(persona);
  });

  it('يرمي خطأً واضحاً إن لم يوجد عالم individuals أصلاً (يجب أن يكون مزروعاً منذ اليوم 19)', async () => {
    vi.mocked(khalilRepository.findWorldBySlug).mockResolvedValue(null);

    await expect(khalilService.ensureIndividualPersona('user-2')).rejects.toThrow('individuals');
    expect(khalilRepository.findPersonaByUserAndWorld).not.toHaveBeenCalled();
  });
});

describe('KhalilService.findOrCreateCustomerByPhone', () => {
  it('لعميل موجود مسبقاً: يعيده كما هو، ويضمن له شخصية فردية دون إعادة إنشائها إن وُجدت', async () => {
    vi.mocked(khalilRepository.findUserByPhoneAdmin).mockResolvedValue(customer);
    vi.mocked(khalilRepository.findWorldBySlug).mockResolvedValue(individualsWorld);
    vi.mocked(khalilRepository.findPersonaByUserAndWorld).mockResolvedValue(persona);

    const result = await khalilService.findOrCreateCustomerByPhone(customer.fullName, customer.phone);

    expect(result).toEqual(customer);
    expect(khalilRepository.createUser).not.toHaveBeenCalled();
    expect(khalilRepository.createPersona).not.toHaveBeenCalled();
    expect(khalilRepository.findPersonaByUserAndWorld).toHaveBeenCalledWith(customer.id, individualsWorld.id);
  });

  it('لعميل جديد: ينشئ المستخدم ثم يضمن له شخصية فردية جديدة معاً', async () => {
    vi.mocked(khalilRepository.findUserByPhoneAdmin).mockResolvedValue(null);
    vi.mocked(khalilRepository.createUser).mockResolvedValue(customer);
    vi.mocked(khalilRepository.findWorldBySlug).mockResolvedValue(individualsWorld);
    vi.mocked(khalilRepository.findPersonaByUserAndWorld).mockResolvedValue(null);
    vi.mocked(khalilRepository.createPersona).mockResolvedValue(persona);

    const result = await khalilService.findOrCreateCustomerByPhone(customer.fullName, customer.phone);

    expect(khalilRepository.createUser).toHaveBeenCalledWith({ fullName: customer.fullName, phone: customer.phone, role: 'customer' });
    expect(khalilRepository.createPersona).toHaveBeenCalledWith({ userId: customer.id, worldId: individualsWorld.id, isDefault: true });
    expect(result).toEqual(customer);
  });
});
