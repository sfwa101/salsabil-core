// src/core/kernel/otp/whatsapp-channel.ts
// قناة WhatsApp Authentication عبر Meta Cloud API مباشرة (لا وسيط/BSP) — القناة الأساسية لإرسال
// OTP (قرار مؤسس، ADR-030): أرخص قناة موثَّقة رسمياً لمصر ($0.0036-0.014/رسالة مقابل ~$0.4459
// لـTwilio SMS إلى مصر تحديداً)، وقرار استراتيجي (قناة موحَّدة عبر أي توسّع مستقبلي للسعودية/تركيا
// بدل مزوّد SMS محلي منفصل لكل دولة — راجع ADR-030 لتفصيل حساب WhatsApp Business منفصل مطلوب هناك).
//
// ⚠️ يتطلب قالب Authentication معتمَداً فعلياً من Meta مسبقاً (WHATSAPP_OTP_TEMPLATE_NAME) — التقديم
// خطوة بشرية منفصلة (Meta Business Manager)، لا يستطيع الكود تنفيذها. Fail Closed صريح عبر
// isConfigured() حتى تتوفر بيانات الاعتماد الثلاث معاً — لا محاولة إرسال جزئية بمتغيرات ناقصة.

import type { OtpChannel, OtpSendResult } from './types';

const GRAPH_API_VERSION = 'v21.0';

export class WhatsAppOtpChannel implements OtpChannel {
  readonly name = 'whatsapp' as const;

  isConfigured(): boolean {
    return !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_OTP_TEMPLATE_NAME);
  }

  async send(phoneE164: string, code: string): Promise<OtpSendResult> {
    if (!this.isConfigured()) {
      return { ok: false, errorMessage: 'WhatsApp channel not configured (missing env vars)' };
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME!;
    const languageCode = process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'ar';

    try {
      const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phoneE164,
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            components: [
              { type: 'body', parameters: [{ type: 'text', text: code }] },
              // زر "نسخ الرمز"/تعبئة تلقائية بالإندكس 0 — نمط Meta القياسي لقالب Authentication
              // بزر واحد. لو القالب المعتمَد فعلياً بلا زر (نص فقط)، هذا الجزء يفشل برسالة خطأ
              // واضحة من Meta نفسها وقت الإرسال الحي الأول — لا افتراض صامت لشكل القالب هنا، لأنه
              // لم يُعتمَد بعد وقت كتابة هذا الملف.
              { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] },
            ],
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { ok: false, errorMessage: data?.error?.message ?? `HTTP ${response.status}` };
      }
      return { ok: true, providerMessageId: data?.messages?.[0]?.id };
    } catch (e) {
      return { ok: false, errorMessage: e instanceof Error ? e.message : 'fetch failed' };
    }
  }
}

export const whatsAppOtpChannel = new WhatsAppOtpChannel();
