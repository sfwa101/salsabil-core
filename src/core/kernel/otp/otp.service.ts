// src/core/kernel/otp/otp.service.ts
// تنسيق كامل: توليد رمز، تخزينه مُجزَّأً، اختيار قناة الإرسال (WhatsApp أساسي، SMS Misr احتياطي —
// قرار مؤسس، ADR-030)، ثم التحقق لاحقاً. أي نطاق (customer اليوم، أي نطاق آخر مستقبلاً) يستهلك هذا
// فقط عبر purpose نصي — صفر معرفة هنا بمن يستهلكه أو لماذا.

import { randomInt } from 'node:crypto';
import { hashPassword, verifyPassword } from '../security/password';
import { otpRepository } from './otp.repository';
import { whatsAppOtpChannel } from './whatsapp-channel';
import { smsMisrOtpChannel } from './sms-misr-channel';
import type { OtpChannel, OtpChannelName, OtpPurpose } from './types';

// 5 دقائق — رمز قصير العمر، نطاق قياسي لرموز OTP لمرة واحدة (لا حاجة فعلية لأطول، القناة فورية).
const CODE_TTL_SECONDS = 5 * 60;
const MAX_VERIFY_ATTEMPTS = 5;

// ترتيب = أولوية المحاولة. WhatsApp أولاً دائماً (قرار مؤسس)؛ SmsMisrOtpChannel تُجرَّب فقط إن
// فشلت/غابت الأولى (isConfigured داخل كل قناة، لا شرط هنا).
const CHANNELS: OtpChannel[] = [whatsAppOtpChannel, smsMisrOtpChannel];

export type SendOtpResult = { ok: true; channel: OtpChannelName } | { ok: false; error: string };

export class OtpService {
  /**
   * يولّد رمزاً جديداً (6 أرقام، crypto.randomInt — لا Math.random)، يخزّنه مُجزَّأً (نفس دالة
   * تجزئة كلمة المرور، scrypt)، ويرسله عبر أول قناة مُعدَّة فعلياً تنجح. Fail Closed: لا قناة
   * مُعدَّة أو فشلتا معاً → رفض صريح، لا نجاح وهمي ولا تخزين تحدٍّ بلا إرسال فعلي.
   */
  async sendChallenge(phone: string, purpose: OtpPurpose): Promise<SendOtpResult> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

    for (const channel of CHANNELS) {
      if (!channel.isConfigured()) continue;
      const result = await channel.send(phone, code);
      if (result.ok) {
        await otpRepository.create({
          phone,
          purpose,
          codeHash,
          channel: channel.name,
          expiresAt,
          maxAttempts: MAX_VERIFY_ATTEMPTS,
        });
        return { ok: true, channel: channel.name };
      }
      // فشلت هذه القناة تحديداً — جرّب التالية (منطق Fallback)، لا رفض فوري بعد أول فشل
    }

    return { ok: false, error: 'تعذَّر إرسال رمز التحقق — حاول مرة أخرى لاحقاً' };
  }

  /**
   * يتحقق من رمز أُرسل سابقاً لنفس الهاتف/الغرض. يستهلك التحدي عند النجاح (consumed_at) — لا يمكن
   * إعادة استخدام نفس الرمز مرتين. يرفض بعد MAX_VERIFY_ATTEMPTS محاولة خاطئة أو انتهاء الصلاحية.
   */
  async verifyChallenge(phone: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const challenge = await otpRepository.findActiveByPhoneAndPurpose(phone, purpose);
    if (!challenge) return false;
    if (new Date(challenge.expiresAt).getTime() < Date.now()) return false;
    if (challenge.attempts >= challenge.maxAttempts) return false;

    const codeHash = await otpRepository.getCodeHash(challenge.id);
    if (!codeHash) return false;

    const matches = await verifyPassword(code, codeHash);
    if (!matches) {
      await otpRepository.incrementAttempts(challenge.id, challenge.attempts);
      return false;
    }

    await otpRepository.markConsumed(challenge.id);
    return true;
  }
}

export const otpService = new OtpService();
