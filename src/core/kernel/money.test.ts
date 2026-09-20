// src/core/kernel/money.test.ts
import { describe, it, expect } from 'vitest';
import { roundToCents } from './money';

describe('roundToCents', () => {
  it('يُصحِّح خطأ تقريب IEEE 754 حقيقي (30.99 + 92.99)', () => {
    expect(30.99 + 92.99).not.toBe(123.98); // توثيق حي للخلل نفسه (123.97999999999999)
    expect(roundToCents(30.99 + 92.99)).toBe(123.98);
  });

  it('يُصحِّح خطأ تقريب حقيقي آخر من ضرب عشري (19.99 × 5)', () => {
    expect(19.99 * 5).not.toBe(99.95); // 99.94999999999999
    expect(roundToCents(19.99 * 5)).toBe(99.95);
  });

  it('لا يغيّر رقماً صحيحاً بالفعل عند خانتين عشريتين', () => {
    expect(roundToCents(123.45)).toBe(123.45);
  });

  it('يتعامل مع صفر وأرقام صحيحة بلا كسور', () => {
    expect(roundToCents(0)).toBe(0);
    expect(roundToCents(100)).toBe(100);
  });
});
