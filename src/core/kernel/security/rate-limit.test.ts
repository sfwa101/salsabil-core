// src/core/kernel/security/rate-limit.test.ts
// اختبارات وحدة لعدّاد تحديد المعدل في-الذاكرة (اليوم 12، ADR-014) — بلا Mocks، الحالة حقيقية
// داخل الوحدة نفسها (Map مشترك) — كل اختبار يستخدم مفتاحاً فريداً لتفادي التداخل بين الاختبارات

import { describe, it, expect, vi, afterEach } from 'vitest';
import { isRateLimited, recordFailedAttempt, clearAttempts, type RateLimitConfig } from './rate-limit';

afterEach(() => {
  vi.useRealTimers();
});

const config: RateLimitConfig = { maxAttempts: 5, windowMs: 15 * 60 * 1000 };

describe('rate-limit', () => {
  it('لا يحظر مفتاحاً جديداً بلا أي محاولات مسجَّلة', () => {
    expect(isRateLimited('phone-a', config)).toBe(false);
  });

  it('اختبار أمني حاسم: المحاولة السادسة الفاشلة لنفس المفتاح خلال النافذة تُحظَر', () => {
    const key = 'phone-b';
    for (let i = 0; i < 5; i++) {
      expect(isRateLimited(key, config)).toBe(false);
      recordFailedAttempt(key, config);
    }
    // المحاولة السادسة — العدّاد وصل الحد الأقصى (5) فعلياً
    expect(isRateLimited(key, config)).toBe(true);
  });

  it('clearAttempts يعيد المفتاح لحالته الأولى (مثال: دخول ناجح بعد محاولات فاشلة)', () => {
    const key = 'phone-c';
    for (let i = 0; i < 5; i++) recordFailedAttempt(key, config);
    expect(isRateLimited(key, config)).toBe(true);

    clearAttempts(key);

    expect(isRateLimited(key, config)).toBe(false);
  });

  it('نافذة منتهية الصلاحية تُعيد ضبط العدّاد بدل الحظر الدائم (ساعة وهمية للتحكم الحتمي بالوقت)', () => {
    vi.useFakeTimers();
    const key = 'phone-d';
    const shortWindowConfig: RateLimitConfig = { maxAttempts: 1, windowMs: 1000 };

    recordFailedAttempt(key, shortWindowConfig);
    expect(isRateLimited(key, shortWindowConfig)).toBe(true);

    vi.advanceTimersByTime(1001); // تجاوزت النافذة (1000ms) فعلياً

    expect(isRateLimited(key, shortWindowConfig)).toBe(false);
  });
});
