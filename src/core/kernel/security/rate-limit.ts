// src/core/kernel/security/rate-limit.ts
// عدّاد في-الذاكرة لتحديد معدل محاولات الدخول (اليوم 12، ADR-014) — نطاق: مسارَي دخول التاجر
// والإدارة فقط (أعلى قيمة هجومية فعلية اليوم، دخول بلا كلمة مرور — راجع ADR-012/ADR-013).
//
// قيد موثَّق صراحة (لا تجاهل صامت): عدّاد في-الذاكرة لا ينجو من إعادة تشغيل الخادم أو تعدد
// النسخ (Serverless/عدة خوادم) — مقبول مؤقتاً لمرحلة تجربة تاجر واحد على خادم واحد، يجب إعادة
// تقييمه (Redis/DB) قبل إنتاج حقيقي متعدد الخوادم. راجع docs/ROADMAP.md.

interface AttemptWindow {
  count: number;
  windowStartedAt: number;
}

const attempts = new Map<string, AttemptWindow>();

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

// الرقم مقترح المؤسس عليه بالموافقة الصريحة على خطة اليوم 12 — راجع docs/SECURITY.md §12
export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
};

// CUSTOMER-IDENTITY-CLAIM-FLOW (ADR-030) — أضيق من LOGIN_RATE_LIMIT عمداً: كل إرسال ناجح تكلفة
// حقيقية بالمال (WhatsApp/SMS Misr)، لا محاولة دخول مجانية. يحدّ من استنزاف الرصيد عبر طلبات إرسال
// متكررة لنفس الرقم، لا فقط تخمين الرمز (المحدود أصلاً بـotp_challenges.max_attempts).
export const OTP_SEND_RATE_LIMIT: RateLimitConfig = {
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000,
};

export function isRateLimited(key: string, config: RateLimitConfig = LOGIN_RATE_LIMIT): boolean {
  const existing = attempts.get(key);
  if (!existing) return false;

  if (Date.now() - existing.windowStartedAt > config.windowMs) {
    attempts.delete(key);
    return false;
  }

  return existing.count >= config.maxAttempts;
}

export function recordFailedAttempt(key: string, config: RateLimitConfig = LOGIN_RATE_LIMIT): void {
  const now = Date.now();
  const existing = attempts.get(key);

  if (!existing || now - existing.windowStartedAt > config.windowMs) {
    attempts.set(key, { count: 1, windowStartedAt: now });
    return;
  }

  existing.count += 1;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
