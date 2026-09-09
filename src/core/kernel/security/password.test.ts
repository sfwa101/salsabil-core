// src/core/kernel/security/password.test.ts
// اختبارات وحدة حقيقية بلا Mocks — منطق تجزئة فعلي (node:crypto)، لا شبكة، لا Supabase.

import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateTempPassword, DUMMY_PASSWORD_HASH } from './password';

describe('hashPassword / verifyPassword', () => {
  it('كلمة المرور الصحيحة تتحقق بنجاح مقابل تجزئتها', async () => {
    const hash = await hashPassword('correct-horse-battery');
    await expect(verifyPassword('correct-horse-battery', hash)).resolves.toBe(true);
  });

  it('كلمة مرور خاطئة تُرفَض', async () => {
    const hash = await hashPassword('correct-horse-battery');
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false);
  });

  it('تجزئتان لنفس كلمة المرور مختلفتان (ملح عشوائي لكل مرة) — كلتاهما تتحققان بنجاح رغم ذلك', async () => {
    const hashA = await hashPassword('same-password-123');
    const hashB = await hashPassword('same-password-123');

    expect(hashA).not.toBe(hashB);
    await expect(verifyPassword('same-password-123', hashA)).resolves.toBe(true);
    await expect(verifyPassword('same-password-123', hashB)).resolves.toBe(true);
  });

  it('تجزئة سليمة الشكل تخزَّن كسلسلة "ملح:تجزئة" (hex كلاهما)', async () => {
    const hash = await hashPassword('any-password');
    const parts = hash.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]+$/);
    expect(parts[1]).toMatch(/^[0-9a-f]+$/);
  });

  it('تجزئة مشوَّهة (بلا فاصل ":") تُرفَض بأمان بدل رمي استثناء', async () => {
    await expect(verifyPassword('any-password', 'not-a-valid-hash')).resolves.toBe(false);
  });
});

// FIX-TIMING-ATTACK-VULNERABILITY-AUTH — الثابت المُستخدَم في khalilService.verifyPasswordForPhone
// لتنفيذ حساب scrypt فعلي في مسارَي not_found/no_password_set (راجع تعليق DUMMY_PASSWORD_HASH نفسه
// وkhalil/service.ts للتفصيل الكامل). اختبار الوحدة الزمني الحي (قياس RTT عبر المسارات الثلاثة)
// موجود في khalil/service.test.ts — هنا فقط تحقُّق شكلي أن الثابت نفسه سليم البنية وقابل للاستخدام
// فعلياً عبر verifyPassword() بلا استثناء.
describe('DUMMY_PASSWORD_HASH', () => {
  it('بنفس تنسيق "ملح:تجزئة" (hex كلاهما) الذي يُنتجه hashPassword — نفس أطوال KEY_LENGTH/الملح', async () => {
    const real = await hashPassword('any-password');
    const [realSalt, realHash] = real.split(':');
    const [dummySalt, dummyHash] = DUMMY_PASSWORD_HASH.split(':');

    expect(dummySalt).toMatch(/^[0-9a-f]+$/);
    expect(dummyHash).toMatch(/^[0-9a-f]+$/);
    expect(dummySalt).toHaveLength(realSalt!.length);
    expect(dummyHash).toHaveLength(realHash!.length);
  });

  it('verifyPassword تُنفَّذ فعلياً مقابله بلا استثناء، وترفض أي كلمة مرور حقيقية (لا يطابقها أبداً)', async () => {
    await expect(verifyPassword('any-real-password', DUMMY_PASSWORD_HASH)).resolves.toBe(false);
  });
});

describe('generateTempPassword', () => {
  it('يُنتج كلمة مرور بطول 10 محارف', () => {
    expect(generateTempPassword()).toHaveLength(10);
  });

  it('لا تحتوي محارف متشابهة بصرياً (0/O، 1/l/I)', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateTempPassword();
      expect(pw).not.toMatch(/[0O1lI]/);
    }
  });

  it('كل استدعاء يُنتج قيمة مختلفة (عشوائية فعلية، لا قيمة ثابتة)', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generateTempPassword()));
    expect(passwords.size).toBe(20);
  });
});
