// src/app/(reef)/account/claim/actions.test.ts
// اختبار وحدة (mocked) — regression test مباشر لإصلاح انعكاس send-rate-limit في startClaimAction
// (TASK-01، راجع docs/audits/2026-09-14-reef-v1-engineering-audit.md §5 وADR-030 في docs/DECISIONS.md).
// يموّه customerService/cartService/session cookies بالكامل (نفس نمط src/app/admin/posts/actions.test.ts)؛
// يستخدم rate-limit.ts الحقيقي (بلا mock) لأن الهدف هو إثبات سلوك العدّاد الفعلي، لا افتراض عمله.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/modules/customer/customer.service', () => ({
  customerService: {
    startClaim: vi.fn(),
    confirmClaim: vi.fn(),
  },
}));
vi.mock('@/core/modules/customer/customer-session', () => ({
  setCustomerSessionCookie: vi.fn(),
}));
vi.mock('@/core/modules/cart/cart.service', () => ({
  cartService: {
    mergeGuestCartIntoUser: vi.fn(),
  },
}));
vi.mock('@/core/modules/cart/cart-session', () => ({
  getExistingCartSessionToken: vi.fn(async () => null),
}));

const { startClaimAction } = await import('./actions');
const { customerService } = await import('@/core/modules/customer/customer.service');

// كل اختبار يستخدم رقم هاتف فريداً — عدّاد rate-limit.ts مفتاحه `otp:claim:${phone}` ومشترك بين
// كل الاختبارات (Map في-الذاكرة على مستوى الوحدة)، نفس تحذير rate-limit.test.ts.
let phoneCounter = 0;
function freshPhone(): string {
  phoneCounter += 1;
  return `0110${String(phoneCounter).padStart(7, '0')}`;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('startClaimAction — send-rate-limit (TASK-01 regression)', () => {
  it('اختبار أمني حاسم: إرسال OTP الناجح يُحتسَب ضمن العدّاد — الاستدعاء الرابع لنفس الرقم يُرفَض رغم نجاح الثلاثة الأولى', async () => {
    const phone = freshPhone();
    vi.mocked(customerService.startClaim).mockResolvedValue({ ok: true, channel: 'whatsapp' });

    // OTP_SEND_RATE_LIMIT.maxAttempts = 3 (rate-limit.ts) — أول ثلاث محاولات ناجحة يجب أن تُقبَل جميعاً
    for (let i = 0; i < 3; i++) {
      const result = await startClaimAction(phone);
      expect(result).toEqual({ success: true, channel: 'whatsapp' });
    }

    // المحاولة الرابعة — لو كان الـbug القديم لا يزال قائماً (احتساب الفشل فقط)، customerService.startClaim
    // كانت ستُستدعى مجدداً بنجاح بلا أي حظر؛ الإصلاح يحظرها هنا قبل الوصول لطبقة الخدمة إطلاقاً
    vi.mocked(customerService.startClaim).mockClear();
    const fourthResult = await startClaimAction(phone);

    expect(fourthResult).toEqual({ error: 'طلبات كثيرة لهذا الرقم — حاول مرة أخرى بعد قليل' });
    expect(customerService.startClaim).not.toHaveBeenCalled();
  });

  it('لا يزال يحظر تكرار المحاولات الفاشلة كما كان قبل الإصلاح (لا رجوع في سلوك الفشل)', async () => {
    const phone = freshPhone();
    vi.mocked(customerService.startClaim).mockResolvedValue({ error: 'لا يوجد حساب بهذا الرقم' });

    for (let i = 0; i < 3; i++) {
      const result = await startClaimAction(phone);
      expect(result).toEqual({ error: 'لا يوجد حساب بهذا الرقم' });
    }

    const fourthResult = await startClaimAction(phone);
    expect(fourthResult).toEqual({ error: 'طلبات كثيرة لهذا الرقم — حاول مرة أخرى بعد قليل' });
  });

  it('يخلط نجاحاً وفشلاً على نفس الرقم — كلاهما يُحتسَب من نفس العدّاد المشترك', async () => {
    const phone = freshPhone();
    vi.mocked(customerService.startClaim)
      .mockResolvedValueOnce({ ok: true, channel: 'whatsapp' })
      .mockResolvedValueOnce({ error: 'لا يوجد حساب بهذا الرقم' })
      .mockResolvedValueOnce({ ok: true, channel: 'sms' });

    await startClaimAction(phone); // 1: نجاح
    await startClaimAction(phone); // 2: فشل
    await startClaimAction(phone); // 3: نجاح

    const fourthResult = await startClaimAction(phone);
    expect(fourthResult).toEqual({ error: 'طلبات كثيرة لهذا الرقم — حاول مرة أخرى بعد قليل' });
  });

  it('رقم هاتف مختلف يملك عدّاده الخاص — لا يتأثر بحظر رقم آخر', async () => {
    const exhaustedPhone = freshPhone();
    const freshPhoneNumber = freshPhone();
    vi.mocked(customerService.startClaim).mockResolvedValue({ ok: true, channel: 'whatsapp' });

    for (let i = 0; i < 4; i++) await startClaimAction(exhaustedPhone);

    const result = await startClaimAction(freshPhoneNumber);
    expect(result).toEqual({ success: true, channel: 'whatsapp' });
  });

  it('رقم هاتف غير صحيح شكلياً يُرفَض قبل الوصول لطبقة الخدمة أو العدّاد', async () => {
    const result = await startClaimAction('123');

    expect('error' in result).toBe(true);
    expect(customerService.startClaim).not.toHaveBeenCalled();
  });
});
