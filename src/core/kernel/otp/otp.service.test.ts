// src/core/kernel/otp/otp.service.test.ts
// اختبارات وحدة — تُموّه otpRepository وكلتا القناتين؛ منطق otp.service.ts نفسه حقيقي (بما فيها
// تجزئة/تحقق الرمز الفعليان عبر password.ts الحقيقية — لا تبعية جديدة، لا موك لدالة التجزئة نفسها).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OtpChallenge } from './types';

const baseChallenge: OtpChallenge = {
  id: 'challenge-1',
  phone: '01055555555',
  purpose: 'claim_account',
  channel: 'whatsapp',
  attempts: 0,
  maxAttempts: 5,
  expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  consumedAt: null,
  createdAt: new Date().toISOString(),
};

vi.mock('./otp.repository', () => ({
  otpRepository: {
    create: vi.fn(async () => baseChallenge),
    findActiveByPhoneAndPurpose: vi.fn(),
    getCodeHash: vi.fn(),
    incrementAttempts: vi.fn(),
    markConsumed: vi.fn(),
  },
}));

vi.mock('./whatsapp-channel', () => ({
  whatsAppOtpChannel: { name: 'whatsapp', isConfigured: vi.fn(), send: vi.fn() },
}));

vi.mock('./sms-misr-channel', () => ({
  smsMisrOtpChannel: { name: 'sms', isConfigured: vi.fn(), send: vi.fn() },
}));

const { otpService } = await import('./otp.service');
const { otpRepository } = await import('./otp.repository');
const { whatsAppOtpChannel } = await import('./whatsapp-channel');
const { smsMisrOtpChannel } = await import('./sms-misr-channel');
const { hashPassword } = await import('../security/password');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OtpService.sendChallenge', () => {
  it('يرسل عبر WhatsApp أولاً عند تهيئتها ونجاحها — لا يجرِّب SMS Misr إطلاقاً', async () => {
    vi.mocked(whatsAppOtpChannel.isConfigured).mockReturnValue(true);
    vi.mocked(whatsAppOtpChannel.send).mockResolvedValue({ ok: true, providerMessageId: 'wamid.1' });

    const result = await otpService.sendChallenge('01055555555', 'claim_account');

    expect(result).toEqual({ ok: true, channel: 'whatsapp' });
    expect(smsMisrOtpChannel.send).not.toHaveBeenCalled();
    expect(otpRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '01055555555', purpose: 'claim_account', channel: 'whatsapp' })
    );
  });

  it('يتخطّى WhatsApp غير المُعدَّة وينتقل مباشرة لـSMS Misr', async () => {
    vi.mocked(whatsAppOtpChannel.isConfigured).mockReturnValue(false);
    vi.mocked(smsMisrOtpChannel.isConfigured).mockReturnValue(true);
    vi.mocked(smsMisrOtpChannel.send).mockResolvedValue({ ok: true, providerMessageId: '12345' });

    const result = await otpService.sendChallenge('01055555555', 'claim_account');

    expect(result).toEqual({ ok: true, channel: 'sms' });
    expect(whatsAppOtpChannel.send).not.toHaveBeenCalled();
  });

  it('يتراجع لـSMS Misr عندما تفشل WhatsApp رغم تهيئتها (Fallback حقيقي، لا مجرد غياب إعداد)', async () => {
    vi.mocked(whatsAppOtpChannel.isConfigured).mockReturnValue(true);
    vi.mocked(whatsAppOtpChannel.send).mockResolvedValue({ ok: false, errorMessage: 'template not approved' });
    vi.mocked(smsMisrOtpChannel.isConfigured).mockReturnValue(true);
    vi.mocked(smsMisrOtpChannel.send).mockResolvedValue({ ok: true, providerMessageId: '12345' });

    const result = await otpService.sendChallenge('01055555555', 'claim_account');

    expect(result).toEqual({ ok: true, channel: 'sms' });
  });

  it('يرفض صراحة (Fail Closed) بلا أي قناة مُعدَّة — لا يخزِّن أي تحدٍّ', async () => {
    vi.mocked(whatsAppOtpChannel.isConfigured).mockReturnValue(false);
    vi.mocked(smsMisrOtpChannel.isConfigured).mockReturnValue(false);

    const result = await otpService.sendChallenge('01055555555', 'claim_account');

    expect(result.ok).toBe(false);
    expect(otpRepository.create).not.toHaveBeenCalled();
  });
});

describe('OtpService.verifyChallenge', () => {
  it('يرفض (false) بلا أي تحدٍّ نشط لهذا الهاتف/الغرض', async () => {
    vi.mocked(otpRepository.findActiveByPhoneAndPurpose).mockResolvedValue(null);

    const result = await otpService.verifyChallenge('01055555555', 'claim_account', '123456');

    expect(result).toBe(false);
  });

  it('يرفض (false) تحدياً منتهي الصلاحية بلا زيادة محاولات', async () => {
    vi.mocked(otpRepository.findActiveByPhoneAndPurpose).mockResolvedValue({
      ...baseChallenge,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });

    const result = await otpService.verifyChallenge('01055555555', 'claim_account', '123456');

    expect(result).toBe(false);
    expect(otpRepository.incrementAttempts).not.toHaveBeenCalled();
  });

  it('يرفض (false) تحدياً استنفد محاولاته بالكامل', async () => {
    vi.mocked(otpRepository.findActiveByPhoneAndPurpose).mockResolvedValue({ ...baseChallenge, attempts: 5, maxAttempts: 5 });

    const result = await otpService.verifyChallenge('01055555555', 'claim_account', '123456');

    expect(result).toBe(false);
    expect(otpRepository.incrementAttempts).not.toHaveBeenCalled();
  });

  it('يرفض رمزاً خاطئاً ويزيد عدّاد المحاولات، بلا استهلاك التحدي', async () => {
    const codeHash = await hashPassword('123456');
    vi.mocked(otpRepository.findActiveByPhoneAndPurpose).mockResolvedValue(baseChallenge);
    vi.mocked(otpRepository.getCodeHash).mockResolvedValue(codeHash);

    const result = await otpService.verifyChallenge('01055555555', 'claim_account', '999999');

    expect(result).toBe(false);
    expect(otpRepository.incrementAttempts).toHaveBeenCalledWith(baseChallenge.id, baseChallenge.attempts);
    expect(otpRepository.markConsumed).not.toHaveBeenCalled();
  });

  it('يقبل الرمز الصحيح ويستهلك التحدي', async () => {
    const codeHash = await hashPassword('123456');
    vi.mocked(otpRepository.findActiveByPhoneAndPurpose).mockResolvedValue(baseChallenge);
    vi.mocked(otpRepository.getCodeHash).mockResolvedValue(codeHash);

    const result = await otpService.verifyChallenge('01055555555', 'claim_account', '123456');

    expect(result).toBe(true);
    expect(otpRepository.markConsumed).toHaveBeenCalledWith(baseChallenge.id);
  });
});
