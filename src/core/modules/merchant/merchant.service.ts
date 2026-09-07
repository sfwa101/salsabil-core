// src/core/modules/merchant/merchant.service.ts
// منطق تسجيل التاجر والتحقق من النطاق والمستأجر — لا استدعاء لقاعدة بيانات هنا مباشرة

import { khalilService } from '../../kernel/khalil/service';
import type { Session } from '../../kernel/khalil/types';
import { merchantRepository } from './merchant.repository';
import { auditService } from '../audit/audit.service';
import type { Merchant, MerchantAgreement, MerchantRegistrationInput } from './types';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// TODO: مدة الجلسة (7 أيام) قيمة عملية غير معتمدة رسمياً من المؤسس بعد — نفس نمط BR-016 (OPEN_QUESTION)
const MERCHANT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

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
   * تسجيل دخول تاجر بلا كلمة مرور (اليوم 10) — بالهاتف الشخصي لمالك التاجر (role: merchant_owner
   * في users)، لا هاتف العمل التجاري في merchants.phone. يرفض بصمت (null، لا استثناء) عند أي
   * فشل — رقم غير مسجَّل، دور غير merchant_owner، لا تاجر مرتبط، أو تاجر معطَّل — بلا تمييز
   * الأسباب للمستدعي (يمنع تسريب معلومة "هذا الرقم مسجَّل لكن ليس تاجراً" لطرف خبيث).
   */
  async loginOwnerByPhone(phone: string): Promise<{ token: string; session: Session } | null> {
    const user = await khalilService.findUserByPhone(phone);
    if (!user || user.role !== 'merchant_owner') {
      await auditService.log({
        actorId: user?.id ?? null,
        actorRole: user?.role ?? 'anonymous',
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: user?.id ?? null,
        metadata: { phone, attemptedRole: 'merchant_owner' },
      });
      return null;
    }

    const merchant = await merchantRepository.findByOwnerId(user.id);
    if (!merchant || !merchant.isActive) {
      await auditService.log({
        actorId: user.id,
        actorRole: user.role,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: user.id,
        metadata: { phone, reason: merchant ? 'merchant_inactive' : 'no_merchant_linked' },
      });
      return null;
    }

    const result = await khalilService.createSession({
      userId: user.id,
      tenantId: merchant.id,
      role: user.role,
      ttlSeconds: MERCHANT_SESSION_TTL_SECONDS,
    });

    await auditService.log({
      actorId: user.id,
      actorRole: user.role,
      action: 'auth.login_success',
      entityType: 'user',
      entityId: user.id,
      metadata: { phone },
    });

    return result;
  }

  isOwner(merchant: Merchant, userId: string): boolean {
    return merchant.ownerId === userId;
  }

  // اليوم 11 — قراءة/تفعيل شاملان لكل التجار، للوحة الإدارة (AdminService) حصراً. لا تحقق
  // صلاحية هنا — مسؤولية المستدعي التأكد أن الفاعل platform_admin قبل الوصول لهاتين الدالتين.
  async listAll(): Promise<Merchant[]> {
    return merchantRepository.findAll();
  }

  async findById(id: string): Promise<Merchant | null> {
    return merchantRepository.findById(id);
  }

  async getByIds(ids: string[]): Promise<Merchant[]> {
    return merchantRepository.findByIds(ids);
  }

  async setActiveStatus(id: string, isActive: boolean): Promise<Merchant> {
    return merchantRepository.setActiveStatus(id, isActive);
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
