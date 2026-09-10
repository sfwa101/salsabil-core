// src/core/kernel/otp/otp.repository.ts
// otp_challenges — نفس نمط sessions/carts (RLS مقفول بالكامل بلا أي policy، وصول حصري عبر
// service_role). راجع scripts/otp-schema.sql للـSchema الكامل.

import { supabaseAdmin } from '../database/supabase-admin-client';
import type { OtpChallenge, OtpChannelName, OtpPurpose } from './types';

interface OtpChallengeRow {
  id: string;
  phone: string;
  purpose: string;
  code_hash: string;
  channel: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

function toChallenge(row: OtpChallengeRow): OtpChallenge {
  return {
    id: row.id,
    phone: row.phone,
    purpose: row.purpose as OtpPurpose,
    channel: row.channel as OtpChannelName,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}

export class OtpRepository {
  async create(input: {
    phone: string;
    purpose: OtpPurpose;
    codeHash: string;
    channel: OtpChannelName;
    expiresAt: string;
    maxAttempts: number;
  }): Promise<OtpChallenge> {
    const { data, error } = await supabaseAdmin
      .from('otp_challenges')
      .insert({
        phone: input.phone,
        purpose: input.purpose,
        code_hash: input.codeHash,
        channel: input.channel,
        expires_at: input.expiresAt,
        max_attempts: input.maxAttempts,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toChallenge(data as OtpChallengeRow);
  }

  /** أحدث تحدٍّ غير مستهلَك لهذا الهاتف/الغرض — للتحقق لاحقاً؛ لا يفترض عدم وجود تحديات أقدم منتهية. */
  async findActiveByPhoneAndPurpose(phone: string, purpose: OtpPurpose): Promise<OtpChallenge | null> {
    const { data, error } = await supabaseAdmin
      .from('otp_challenges')
      .select('*')
      .eq('phone', phone)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? toChallenge(data as OtpChallengeRow) : null;
  }

  /** التجزئة لا تُعاد أبداً عبر toChallenge/OtpChallenge العام (لا تسرّب حتى داخلياً بلا داعٍ) — قراءة مباشرة منفصلة فقط للتحقق. */
  async getCodeHash(id: string): Promise<string | null> {
    const { data, error } = await supabaseAdmin.from('otp_challenges').select('code_hash').eq('id', id).maybeSingle();
    if (error) throw error;
    return data?.code_hash ?? null;
  }

  async incrementAttempts(id: string, currentAttempts: number): Promise<void> {
    const { error } = await supabaseAdmin.from('otp_challenges').update({ attempts: currentAttempts + 1 }).eq('id', id);
    if (error) throw error;
  }

  async markConsumed(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('otp_challenges').update({ consumed_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }
}

export const otpRepository = new OtpRepository();
