// src/core/kernel/validation/schemas.test.ts
// اختبارات وحدة لأنماط التحقق المشتركة (اليوم 12، ADR-014) — بلا Mocks، منطق zod نفسه هو المُختبَر

import { describe, it, expect } from 'vitest';
import { egyptianPhoneSchema, uuidSchema } from './schemas';

describe('egyptianPhoneSchema', () => {
  it('يقبل رقم هاتف مصري صحيحاً (نفس أرقام الاختبار الحية 01000000000/01000000001)', () => {
    expect(egyptianPhoneSchema.safeParse('01000000000').success).toBe(true);
    expect(egyptianPhoneSchema.safeParse('01000000001').success).toBe(true);
    expect(egyptianPhoneSchema.safeParse('01512345678').success).toBe(true);
  });

  it('يرفض رقماً غير مصري (بادئة دولية أو طول خاطئ)', () => {
    expect(egyptianPhoneSchema.safeParse('+201000000000').success).toBe(false);
    expect(egyptianPhoneSchema.safeParse('0100000000').success).toBe(false); // ناقص رقم
    expect(egyptianPhoneSchema.safeParse('010000000000').success).toBe(false); // رقم زائد
  });

  it('يرفض بادئة غير معتمَدة (03 مثلاً) وقيماً غير رقمية', () => {
    expect(egyptianPhoneSchema.safeParse('03000000000').success).toBe(false);
    expect(egyptianPhoneSchema.safeParse('phone-number').success).toBe(false);
    expect(egyptianPhoneSchema.safeParse('').success).toBe(false);
  });
});

describe('uuidSchema', () => {
  it('يقبل UUID صحيحاً', () => {
    expect(uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
  });

  it('يرفض نصاً مشوَّهاً أو فارغاً', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
    expect(uuidSchema.safeParse('123').success).toBe(false);
  });
});
