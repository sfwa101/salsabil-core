'use server';
// تسجيل دخول التاجر بالهاتف بلا كلمة مرور (اليوم 10) — docs/DECISIONS.md ADR-012

import { merchantService } from '@/core/modules/merchant/merchant.service';
import { setMerchantSessionCookie } from '@/core/modules/merchant/merchant-session';

type LoginResult = { success: true } | { error: string };

export async function loginMerchantAction(phone: string): Promise<LoginResult> {
  const result = await merchantService.loginOwnerByPhone(phone);
  if (!result) {
    return { error: 'رقم الهاتف غير مسجَّل كتاجر، أو الحساب غير مفعَّل' };
  }
  await setMerchantSessionCookie(result.token);
  return { success: true };
}
