// src/core/kernel/khalil/service.test.ts
// اختبارات وحدة — تُموّه khalilRepository فقط؛ منطق khalil.service.ts نفسه حقيقي

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hashPassword } from '../security/password';
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
  mustChangePassword: false,
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
    listActiveWorlds: vi.fn(),
    findAuthByPhone: vi.fn(),
    setPassword: vi.fn(),
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
    const adminSession: Session = { userId: 'admin-1', tenantId: null, role: 'platform_admin', expiresAt: validSession.expiresAt, mustChangePassword: false };
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

// اليوم 23 (BAYAN-HOME-FEED-001) — أول مستهلك لهذه التمريرة (bayan.service.ts)
describe('KhalilService.listActiveWorlds', () => {
  it('يفوّض مباشرة لـ khalilRepository.listActiveWorlds ويعيد نفس النتيجة', async () => {
    vi.mocked(khalilRepository.listActiveWorlds).mockResolvedValue([individualsWorld]);

    const result = await khalilService.listActiveWorlds();

    expect(khalilRepository.listActiveWorlds).toHaveBeenCalledOnce();
    expect(result).toEqual([individualsWorld]);
  });
});

// URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — password.ts (hashPassword/verifyPassword) حقيقي
// هنا، لا مموَّه — يثبت التكامل الفعلي بين الطبقتين، لا فقط أن الاستدعاء تم.
describe('KhalilService.verifyPasswordForPhone', () => {
  it('{ ok: false, reason: "not_found" } لهاتف غير مسجَّل إطلاقاً', async () => {
    vi.mocked(khalilRepository.findAuthByPhone).mockResolvedValue(null);

    const result = await khalilService.verifyPasswordForPhone('01099999999', 'any-password');

    expect(result).toEqual({ ok: false, reason: 'not_found', user: null });
  });

  it('{ ok: false, reason: "no_password_set" } لمستخدم موجود بلا كلمة مرور مضبوطة بعد', async () => {
    vi.mocked(khalilRepository.findAuthByPhone).mockResolvedValue({ user, passwordHash: null, mustChangePassword: false });

    const result = await khalilService.verifyPasswordForPhone(user.phone, 'any-password');

    expect(result).toEqual({ ok: false, reason: 'no_password_set', user });
  });

  it('{ ok: false, reason: "wrong_password" } لكلمة مرور لا تطابق التجزئة المخزَّنة', async () => {
    const correctHash = await hashPassword('correct-password-123');
    vi.mocked(khalilRepository.findAuthByPhone).mockResolvedValue({ user, passwordHash: correctHash, mustChangePassword: false });

    const result = await khalilService.verifyPasswordForPhone(user.phone, 'wrong-password');

    expect(result).toEqual({ ok: false, reason: 'wrong_password', user });
  });

  it('{ ok: true, user, mustChangePassword } لكلمة مرور صحيحة — mustChangePassword يُمرَّر كما هو من السجل', async () => {
    const correctHash = await hashPassword('correct-password-123');
    vi.mocked(khalilRepository.findAuthByPhone).mockResolvedValue({ user, passwordHash: correctHash, mustChangePassword: true });

    const result = await khalilService.verifyPasswordForPhone(user.phone, 'correct-password-123');

    expect(result).toEqual({ ok: true, user, mustChangePassword: true });
  });

  // FIX-TIMING-ATTACK-VULNERABILITY-AUTH — Guardian Review DEEP (NOT APPROVED، الدفعة الأولى) لاحظ
  // غياب اختبار زمني حي يمنع انحداراً مستقبلياً لنفس الثغرة. هذا القياس **حقيقي** (performance.now
  // حول الاستدعاء الفعلي، بلا محاكاة/تزييف) — khalilRepository مموَّه (استجابة شبه فورية)،
  // password.ts (verifyPassword/scrypt) حقيقي بالكامل كبقية اختبارات هذا الوصف، فالفرق الزمني
  // المقيس يعكس فعلياً وجود/غياب حساب scrypt في كل مسار، لا تفاصيل تنفيذ أخرى.
  describe('مقاومة هجوم التوقيت (Timing Attack) — قياس RTT حي عبر المسارات الثلاثة', () => {
    it('not_found وno_password_set ينفقان زمناً مقارباً لـwrong_password — دليل حي أن الثلاثة تُنفِّذ حساب scrypt نفسه، لا رفضاً فورياً في مسارين فقط', async () => {
      const correctHash = await hashPassword('a-real-password-123');
      const SAMPLES_PER_PATH = 4;

      async function averageMs(mockSetup: () => void, phone: string, password: string): Promise<number> {
        const samples: number[] = [];
        for (let i = 0; i < SAMPLES_PER_PATH; i++) {
          mockSetup();
          const start = performance.now();
          await khalilService.verifyPasswordForPhone(phone, password);
          samples.push(performance.now() - start);
        }
        return samples.reduce((a, b) => a + b, 0) / samples.length;
      }

      const notFoundAvg = await averageMs(
        () => vi.mocked(khalilRepository.findAuthByPhone).mockResolvedValue(null),
        '01000000099',
        'irrelevant-password'
      );
      const noPasswordSetAvg = await averageMs(
        () => vi.mocked(khalilRepository.findAuthByPhone).mockResolvedValue({ user, passwordHash: null, mustChangePassword: false }),
        user.phone,
        'irrelevant-password'
      );
      const wrongPasswordAvg = await averageMs(
        () => vi.mocked(khalilRepository.findAuthByPhone).mockResolvedValue({ user, passwordHash: correctHash, mustChangePassword: false }),
        user.phone,
        'definitely-wrong-password'
      );

      // دليل إيجابي: لو كان الإصلاح غائباً (رفض فوري بلا scrypt)، هذان الزمنان كانا سيكونان قريبين
      // من الصفر (أقل من 10% من wrong_password) — التحقق من أنهما ليسا كذلك يثبت أن الحساب الحقيقي
      // يقع فعلياً في المسارين الآمنين، لا فقط أن النتيجة النهائية متقاربة صدفة.
      expect(notFoundAvg).toBeGreaterThan(wrongPasswordAvg * 0.4);
      expect(noPasswordSetAvg).toBeGreaterThan(wrongPasswordAvg * 0.4);

      // تقارب عام: أبطأ مسار لا يتجاوز ضعف أسرع مسار — هامش يتحمّل جيتر النظام الطبيعي (GC، جدولة
      // المهام) بلا التسامح مع فرق من رتبة مقدار كامل (10x+) الذي كان قائماً فعلياً قبل الإصلاح.
      const times = [notFoundAvg, noPasswordSetAvg, wrongPasswordAvg];
      const max = Math.max(...times);
      const min = Math.min(...times);
      expect(max / min).toBeLessThan(2);
    }, 20000);
  });
});

describe('KhalilService.setNewPassword', () => {
  it('يُجزّئ كلمة المرور الجديدة ثم يستدعي khalilRepository.setPassword بالتجزئة الناتجة، mustChangePassword=false', async () => {
    await khalilService.setNewPassword('user-1', 'new-password-123');

    expect(khalilRepository.setPassword).toHaveBeenCalledOnce();
    const [userId, hash, mustChangePassword] = vi.mocked(khalilRepository.setPassword).mock.calls[0]!;
    expect(userId).toBe('user-1');
    expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(mustChangePassword).toBe(false);
  });
});

describe('KhalilService.setTemporaryPassword', () => {
  it('يُجزّئ كلمة مرور مؤقتة ويستدعي khalilRepository.setPassword بـ mustChangePassword=true صراحة', async () => {
    await khalilService.setTemporaryPassword('user-1', 'temp-password-abc');

    expect(khalilRepository.setPassword).toHaveBeenCalledOnce();
    const [userId, hash, mustChangePassword] = vi.mocked(khalilRepository.setPassword).mock.calls[0]!;
    expect(userId).toBe('user-1');
    expect(hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    expect(mustChangePassword).toBe(true);
  });
});
