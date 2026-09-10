// src/core/modules/customer/customer.service.test.ts
// اختبارات وحدة — تُموّه khalilService/otpService/auditService؛ منطق customer.service.ts نفسه حقيقي

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User, Session } from '../../kernel/khalil/types';

const newPhone = '01055555555';
const existingCustomer: User = {
  id: 'user-customer-1',
  fullName: 'عميل موجود',
  phone: '01066666666',
  role: 'customer',
  createdAt: new Date().toISOString(),
};
const merchantOwner: User = {
  id: 'user-merchant-1',
  fullName: 'صاحب محل',
  phone: '01000000000',
  role: 'merchant_owner',
  createdAt: new Date().toISOString(),
};
const createdCustomer: User = {
  id: 'user-new-1',
  fullName: 'عميل جديد',
  phone: newPhone,
  role: 'customer',
  createdAt: new Date().toISOString(),
};
const session: Session = {
  userId: createdCustomer.id,
  tenantId: null,
  role: 'customer',
  expiresAt: new Date(Date.now() + 1000).toISOString(),
  mustChangePassword: false,
};

vi.mock('../../kernel/khalil/service', () => ({
  khalilService: {
    findUserByPhone: vi.fn(),
    findOrCreateCustomerByPhone: vi.fn(),
    setNewPassword: vi.fn(),
    verifyPasswordForPhone: vi.fn(),
    createSession: vi.fn(async () => ({ token: 'session-token-1', session })),
  },
}));

vi.mock('../../kernel/otp/otp.service', () => ({
  otpService: {
    sendChallenge: vi.fn(),
    verifyChallenge: vi.fn(),
  },
}));

vi.mock('../audit/audit.service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

const { customerService } = await import('./customer.service');
const { khalilService } = await import('../../kernel/khalil/service');
const { otpService } = await import('../../kernel/otp/otp.service');
const { auditService } = await import('../audit/audit.service');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CustomerService.register', () => {
  it('يرفض هاتفاً له صف users موجود مسبقاً بأي دور — لا يُنشئ جلسة ولا يستدعي setNewPassword', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(existingCustomer);

    const result = await customerService.register({ fullName: 'محاولة', phone: existingCustomer.phone, password: 'Test-Password-123' });

    expect(result).toEqual({ error: 'account_exists' });
    expect(khalilService.findOrCreateCustomerByPhone).not.toHaveBeenCalled();
    expect(khalilService.createSession).not.toHaveBeenCalled();
  });

  it('يُنشئ حساباً جديداً لهاتف غير موجود إطلاقاً، ويضبط كلمة المرور، وينشئ جلسة، ويُسجِّل auth.register_success', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(null);
    vi.mocked(khalilService.findOrCreateCustomerByPhone).mockResolvedValue(createdCustomer);

    const result = await customerService.register({ fullName: createdCustomer.fullName, phone: newPhone, password: 'Test-Password-123' });

    expect('error' in result).toBe(false);
    expect(khalilService.setNewPassword).toHaveBeenCalledWith(createdCustomer.id, 'Test-Password-123');
    expect(khalilService.createSession).toHaveBeenCalledWith({
      userId: createdCustomer.id,
      tenantId: null,
      role: 'customer',
      ttlSeconds: expect.any(Number),
      mustChangePassword: false,
    });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.register_success' }));
  });
});

describe('CustomerService.login', () => {
  it('يرفض (null) دوراً غير customer رغم هاتف/كلمة مرور صحيحين، ويُسجِّل auth.login_failed', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: true, user: merchantOwner, mustChangePassword: false });

    const result = await customerService.login(merchantOwner.phone, 'correct-password');

    expect(result).toBeNull();
    expect(khalilService.createSession).not.toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.login_failed', metadata: expect.objectContaining({ attemptedRole: 'customer' }) }));
  });

  it('ينجح لعميل حقيقي بكلمة مرور صحيحة', async () => {
    vi.mocked(khalilService.verifyPasswordForPhone).mockResolvedValue({ ok: true, user: existingCustomer, mustChangePassword: false });

    const result = await customerService.login(existingCustomer.phone, 'correct-password');

    expect(result?.token).toBe('session-token-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.login_success' }));
  });
});

describe('CustomerService.startClaim', () => {
  it('يرفض هاتفاً بلا صف users على الإطلاق — لا يستدعي otpService.sendChallenge', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(null);

    const result = await customerService.startClaim('01099999999');

    expect('error' in result).toBe(true);
    expect(otpService.sendChallenge).not.toHaveBeenCalled();
  });

  it('يرفض هاتف تاجر (دور غير customer) — لا يرسل OTP لحساب ليس عميلاً', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(merchantOwner);

    const result = await customerService.startClaim(merchantOwner.phone);

    expect('error' in result).toBe(true);
    expect(otpService.sendChallenge).not.toHaveBeenCalled();
  });

  it('يرسل تحدياً لعميل حقيقي موجود، ويعيد القناة المُستخدَمة', async () => {
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(existingCustomer);
    vi.mocked(otpService.sendChallenge).mockResolvedValue({ ok: true, channel: 'whatsapp' });

    const result = await customerService.startClaim(existingCustomer.phone);

    expect(result).toEqual({ ok: true, channel: 'whatsapp' });
    expect(otpService.sendChallenge).toHaveBeenCalledWith(existingCustomer.phone, 'claim_account');
  });
});

describe('CustomerService.confirmClaim', () => {
  it('يرفض رمزاً غير صحيح — لا يضبط كلمة مرور ولا ينشئ جلسة', async () => {
    vi.mocked(otpService.verifyChallenge).mockResolvedValue(false);

    const result = await customerService.confirmClaim(existingCustomer.phone, '000000', 'New-Password-123');

    expect('error' in result).toBe(true);
    expect(khalilService.setNewPassword).not.toHaveBeenCalled();
    expect(khalilService.createSession).not.toHaveBeenCalled();
  });

  it('يضبط كلمة مرور جديدة وينشئ جلسة بعد تحقق ناجح، ويُسجِّل auth.account_claimed', async () => {
    vi.mocked(otpService.verifyChallenge).mockResolvedValue(true);
    vi.mocked(khalilService.findUserByPhone).mockResolvedValue(existingCustomer);

    const result = await customerService.confirmClaim(existingCustomer.phone, '123456', 'New-Password-123');

    expect('error' in result).toBe(false);
    expect(khalilService.setNewPassword).toHaveBeenCalledWith(existingCustomer.id, 'New-Password-123');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.account_claimed' }));
  });
});
