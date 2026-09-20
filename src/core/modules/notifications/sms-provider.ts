// src/core/modules/notifications/sms-provider.ts
// §31 بند 10 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §22/§29 بند 18) — نفس مزوّد SMS Misr
// المستخدَم أصلاً لـOTP (src/core/kernel/otp/sms-misr-channel.ts)، نفس بيانات الاعتماد
// (SMS_MISR_USERNAME/PASSWORD/SENDER)، لكن لرسالة نصية حرة بدل قالب OTP الثابت — إشعارات طلب، لا
// تحقق هوية.
//
// ⚠️ نفس تحفّظ الثقة المنخفضة الموثَّق حرفياً في sms-misr-channel.ts: لا توثيق API رسمي كامل
// تحقَّقت منه مباشرة لمسار "SMS عادي" (v2، يختلف عن مسار OTP v1 المُستخدَم هناك) — أفضل تقدير من
// نفس المرجع العلني المذكور هناك (github.com/mohamed-foly/SmsMisr-API-Integration →
// https://smsmisr.com/api/v2/SendSMS)، لا اختراع أعمى، لكن يحتاج تحققاً فعلياً قبل الاعتماد عليه في
// إنتاج حقيقي. **غير قابل للتحقق حياً الليلة تحديداً**: SMS_MISR_USERNAME/PASSWORD/SENDER **غير
// مُهيَّأة إطلاقاً لا على dev ولا على staging** (تحقَّقت مباشرة من كلا ملفي .env — صفر قيمة لأي
// منها) — `isSmsConfigured()` يعيد false دائماً في هذه البيئة، فمسار fetch الفعلي لا يُنفَّذ إطلاقاً
// وقت هذا التحقق، لا كإخفاق في الكود بل غياب بيانات اعتماد حقيقية بحتاً.

export interface SmsSendResult {
  ok: boolean;
  providerMessageId?: string;
  errorMessage?: string;
}

const BASE_URL = 'https://smsmisr.com/api/v2/SendSMS';

export function isSmsConfigured(): boolean {
  return !!(process.env.SMS_MISR_USERNAME && process.env.SMS_MISR_PASSWORD && process.env.SMS_MISR_SENDER);
}

export async function sendSms(phoneE164: string, message: string): Promise<SmsSendResult> {
  if (!isSmsConfigured()) {
    return { ok: false, errorMessage: 'SMS Misr غير مُهيَّأ (بيانات اعتماد ناقصة) — لا محاولة إرسال حقيقية جرت' };
  }

  // مصر فقط — نفس تطبيع الرقم المحلي المستخدَم في sms-misr-channel.ts حرفياً.
  const localPhone = phoneE164.replace(/^\+?20/, '0');

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        environment: process.env.NODE_ENV === 'production' ? 1 : 2,
        username: process.env.SMS_MISR_USERNAME,
        password: process.env.SMS_MISR_PASSWORD,
        sender: process.env.SMS_MISR_SENDER,
        mobile: localPhone,
        language: 2, // عربي (أفضل تقدير من نفس المرجع العلني)
        message,
      }),
    });
    const data = await response.json();
    // أفضل تقدير لكود نجاح "SMS عادي" في v2 — يُحتمَل أنه مختلف عن 1901/6000 الخاصين بـOTP v1،
    // لا مصدر رسمي مؤكَّد وقت الكتابة (نفس تحفّظ الملف كاملاً أعلاه).
    const success = data?.Code === '4901' || data?.code === '4901';
    return success ? { ok: true, providerMessageId: data?.SMSID } : { ok: false, errorMessage: `SMS Misr response: ${JSON.stringify(data)}` };
  } catch (e) {
    return { ok: false, errorMessage: e instanceof Error ? e.message : 'fetch failed' };
  }
}
