// src/core/modules/merchant/merchant.service.ts
// منطق تسجيل التاجر والتحقق من النطاق والمستأجر — لا استدعاء لقاعدة بيانات هنا مباشرة

import type { Session } from '../../kernel/khalil/types';
import type { Merchant, MerchantAgreement, MerchantRegistrationInput } from './types';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class MerchantService {
  /**
   * يتحقق من صلاحية بيانات تسجيل تاجر جديد
   */
  validateRegistration(input: MerchantRegistrationInput): boolean {
    if (!input.businessName.trim()) return false;
    if (!input.phone.trim()) return false;
    if (!SLUG_PATTERN.test(input.slug)) return false;
    if (input.commissionRate < 0 || input.commissionRate > 100) return false;
    return true;
  }

  /**
   * القاعدة الذهبية: tenant_id يُقارَن دائماً بمعرّف الجلسة القادم من JWT،
   * أبداً بما يرسله العميل مباشرة (SALSABIL_CONSTITUTION.md §5)
   */
  canAccessTenant(session: Session, merchant: Merchant): boolean {
    if (session.role === 'platform_admin') return true;
    return session.tenantId === merchant.id;
  }

  isOwner(merchant: Merchant, userId: string): boolean {
    return merchant.ownerId === userId;
  }

  toAgreement(merchant: Merchant): MerchantAgreement {
    return {
      merchantId: merchant.id,
      commissionRate: merchant.commissionRate,
      isActive: merchant.isActive,
    };
  }
}

export const merchantService = new MerchantService();
