// src/core/kernel/otp/types.ts
// طبقة OTP عامة (ADR-030) — لا معرفة بمن يستهلكها أو لماذا (`purpose` نصي فقط). القناة قابلة
// للتبديل/الإضافة عبر ملف واحد جديد يطبّق OtpChannel — نفس نمط MapPicker.tsx (غلاف adapter رقيق).

export type OtpChannelName = 'whatsapp' | 'sms';

export interface OtpSendResult {
  ok: boolean;
  providerMessageId?: string;
  /** للتسجيل الداخلي (audit_log) فقط — لا يصل للعميل أبداً حرفياً. */
  errorMessage?: string;
}

export interface OtpChannel {
  readonly name: OtpChannelName;
  /** بيانات اعتماد البيئة (مفاتيح/قالب معتمَد) موجودة فعلياً؟ Fail Closed — لا محاولة إرسال جزئية. */
  isConfigured(): boolean;
  send(phoneE164: string, code: string): Promise<OtpSendResult>;
}

// قيمة واحدة اليوم — يُوسَّع فقط عند حاجة فعلية جديدة (مثال: password_reset)، لا استباقاً.
export type OtpPurpose = 'claim_account';

export interface OtpChallenge {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  channel: OtpChannelName;
  attempts: number;
  maxAttempts: number;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
}
