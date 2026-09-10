// src/core/kernel/otp/sms-misr-channel.ts
// قناة احتياطية (Fallback) فقط — لعميل بلا واتساب مفعَّل على رقمه (قرار مؤسس، ADR-030). مزوّد مصري
// محلي (sms.com.eg) — الأرخص لمصر تحديداً بفارق كبير عن Twilio/Vonage.
//
// ⚠️ ثقة منخفضة صراحة (AGENTS.md §5 — Never Infer Missing Architecture): عقد API هنا مبنيّ على
// أفضل مصدر مُتاح وقت الكتابة — صفحة sms.com.eg العامة (تؤكد وجود POST /api/OTP/ ودعم OTP فعلياً)
// + مستودع تكامل PHP مرجعي علني (github.com/mohamed-foly/SmsMisr-API-Integration، يوثّق
// https://smsmisr.com/api/v2/ لمسار SMS العادي وأكواد نجاح 1901/6000) — **لا توثيق API رسمي كامل
// تحقَّقت منه مباشرة لمسار OTP تحديداً**. المسار/الشكل أدناه أفضل تقدير موثَّق، لا اختراع أعمى، لكن
// **يحتاج تحققاً فعلياً (طلب حي تجريبي عبر environment=2، أو تواصل مباشر مع دعم SMS Misr) قبل
// الاعتماد عليه في إنتاج حقيقي** — مُسجَّل هنا صراحة وفي Task Report، هذا Fallback فقط (القناة
// الأساسية WhatsApp)، فأثر أي خطأ هنا محدود لعميل بلا واتساب فقط.

import type { OtpChannel, OtpSendResult } from './types';

const BASE_URL = 'https://smsmisr.com/api/OTP/';

export class SmsMisrOtpChannel implements OtpChannel {
  readonly name = 'sms' as const;

  isConfigured(): boolean {
    return !!(process.env.SMS_MISR_USERNAME && process.env.SMS_MISR_PASSWORD && process.env.SMS_MISR_SENDER);
  }

  async send(phoneE164: string, code: string): Promise<OtpSendResult> {
    if (!this.isConfigured()) {
      return { ok: false, errorMessage: 'SMS Misr channel not configured (missing env vars)' };
    }

    // مصر فقط — يزيل بادئة +20 الدولية إن وُجدت (مزوّد محلي يتوقع رقماً محلياً 01XXXXXXXXX نمطياً،
    // نفس صيغة egyptianPhoneSchema المستخدَمة في بقية المشروع).
    const localPhone = phoneE164.replace(/^\+?20/, '0');

    const params = new URLSearchParams({
      environment: process.env.NODE_ENV === 'production' ? '1' : '2',
      username: process.env.SMS_MISR_USERNAME!,
      password: process.env.SMS_MISR_PASSWORD!,
      sender: process.env.SMS_MISR_SENDER!,
      mobile: localPhone,
      otp: code,
      template: 'رمز التحقق الخاص بك هو %otp%',
    });

    try {
      const response = await fetch(`${BASE_URL}?${params.toString()}`, { method: 'POST' });
      const data = await response.json();
      const success = data?.code === '1901' || data?.code === '6000';
      return success
        ? { ok: true, providerMessageId: data?.SMSID }
        : { ok: false, errorMessage: `SMS Misr response code=${data?.code}` };
    } catch (e) {
      return { ok: false, errorMessage: e instanceof Error ? e.message : 'fetch failed' };
    }
  }
}

export const smsMisrOtpChannel = new SmsMisrOtpChannel();
