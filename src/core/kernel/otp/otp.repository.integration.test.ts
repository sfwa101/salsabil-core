// src/core/kernel/otp/otp.repository.integration.test.ts
// اختبار تكامل يعمل ضد Supabase الحقيقي (.env.local) — لا Mocks. يتحقق من otp_challenges (ADR-030)
// نفسه فقط (CRUD/فلترة consumed_at) — لا يحتاج بيانات اعتماد أي قناة إرسال حقيقية (ذاك اختبار
// otp.service.ts، مُموَّه بالكامل، منفصل). كل هاتف بمعرّف فريد (randomUUID) — لا مشاركة بيانات بين
// اختبارات هذا الملف نفسه أو غيره (نفس عزل DD-011).

import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { otpRepository } from './otp.repository';
import { supabaseAdmin } from '../database/supabase-admin-client';

const idsToClean: string[] = [];

afterAll(async () => {
  for (const id of idsToClean) {
    await supabaseAdmin.from('otp_challenges').delete().eq('id', id);
  }
});

function futureIso(seconds: number): string {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

describe('OtpRepository (Supabase حقيقي)', () => {
  it('create يُدرج صفاً حقيقياً ويعيده بالحقول الصحيحة (camelCase)', async () => {
    const phone = `0107${randomUUID().slice(0, 7)}`;
    const challenge = await otpRepository.create({
      phone,
      purpose: 'claim_account',
      codeHash: 'hash-value-1',
      channel: 'whatsapp',
      expiresAt: futureIso(300),
      maxAttempts: 5,
    });
    idsToClean.push(challenge.id);

    expect(challenge.phone).toBe(phone);
    expect(challenge.purpose).toBe('claim_account');
    expect(challenge.channel).toBe('whatsapp');
    expect(challenge.attempts).toBe(0);
    expect(challenge.maxAttempts).toBe(5);
    expect(challenge.consumedAt).toBeNull();
  });

  it('findActiveByPhoneAndPurpose يعيد أحدث تحدٍّ غير مستهلَك فقط، ويتجاهل المُستهلَك', async () => {
    const phone = `0108${randomUUID().slice(0, 7)}`;

    const older = await otpRepository.create({
      phone,
      purpose: 'claim_account',
      codeHash: 'hash-older',
      channel: 'whatsapp',
      expiresAt: futureIso(300),
      maxAttempts: 5,
    });
    idsToClean.push(older.id);
    await otpRepository.markConsumed(older.id); // مُستهلَك — يجب تجاهله

    const newer = await otpRepository.create({
      phone,
      purpose: 'claim_account',
      codeHash: 'hash-newer',
      channel: 'sms',
      expiresAt: futureIso(300),
      maxAttempts: 5,
    });
    idsToClean.push(newer.id);

    const active = await otpRepository.findActiveByPhoneAndPurpose(phone, 'claim_account');

    expect(active?.id).toBe(newer.id);
  });

  it('getCodeHash يعيد التجزئة المخزَّنة فعلياً بالضبط', async () => {
    const phone = `0109${randomUUID().slice(0, 7)}`;
    const challenge = await otpRepository.create({
      phone,
      purpose: 'claim_account',
      codeHash: 'specific-hash-value',
      channel: 'whatsapp',
      expiresAt: futureIso(300),
      maxAttempts: 5,
    });
    idsToClean.push(challenge.id);

    const hash = await otpRepository.getCodeHash(challenge.id);

    expect(hash).toBe('specific-hash-value');
  });

  it('incrementAttempts يزيد العدّاد فعلياً في القاعدة الحقيقية', async () => {
    const phone = `0110${randomUUID().slice(0, 7)}`;
    const challenge = await otpRepository.create({
      phone,
      purpose: 'claim_account',
      codeHash: 'hash-value',
      channel: 'whatsapp',
      expiresAt: futureIso(300),
      maxAttempts: 5,
    });
    idsToClean.push(challenge.id);

    await otpRepository.incrementAttempts(challenge.id, challenge.attempts);
    const afterFirst = await otpRepository.findActiveByPhoneAndPurpose(phone, 'claim_account');
    expect(afterFirst?.attempts).toBe(1);

    await otpRepository.incrementAttempts(challenge.id, afterFirst!.attempts);
    const afterSecond = await otpRepository.findActiveByPhoneAndPurpose(phone, 'claim_account');
    expect(afterSecond?.attempts).toBe(2);
  });

  it('markConsumed يضبط consumed_at فعلياً — findActiveByPhoneAndPurpose لا يعيده بعدها', async () => {
    const phone = `0111${randomUUID().slice(0, 7)}`;
    const challenge = await otpRepository.create({
      phone,
      purpose: 'claim_account',
      codeHash: 'hash-value',
      channel: 'whatsapp',
      expiresAt: futureIso(300),
      maxAttempts: 5,
    });
    idsToClean.push(challenge.id);

    await otpRepository.markConsumed(challenge.id);
    const active = await otpRepository.findActiveByPhoneAndPurpose(phone, 'claim_account');

    expect(active).toBeNull();
  });
});
