// src/core/modules/merchant/merchant.service.ts
// منطق تسجيل التاجر والتحقق من النطاق والمستأجر — لا استدعاء لقاعدة بيانات هنا مباشرة

import { khalilService } from '../../kernel/khalil/service';
import type { Session } from '../../kernel/khalil/types';
import { merchantRepository } from './merchant.repository';
import { auditService } from '../audit/audit.service';
import type { Merchant, MerchantAgreement, MerchantRegistrationInput } from './types';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// مدة الجلسة (7 أيام) — قرار مؤسس صريح (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH، سؤال مفتوح 3
// من specs/identity/PASSWORD_AUTH_SPEC.md): تبقى كما هي، لا تُغيَّر. مُصدَّرة لاستهلاكها من
// src/app/merchant/change-password/actions.ts (إعادة إنشاء الجلسة بعد تغيير كلمة المرور).
export const MERCHANT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

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
   * تسجيل دخول تاجر بالهاتف + كلمة مرور (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — يُغلق
   * DD-001/INV-AUTHN-001 الذي كان يقبل الهاتف وحده). بالهاتف الشخصي لمالك التاجر (role:
   * merchant_owner في users)، لا هاتف العمل التجاري في merchants.phone. يرفض بصمت (null، لا
   * استثناء) عند أي فشل — رقم غير مسجَّل، كلمة مرور خاطئة/غير مضبوطة، دور غير merchant_owner، لا
   * تاجر مرتبط، أو تاجر معطَّل — **رسالة رفض موحَّدة واحدة للمستدعي الخارجي** (يمنع تعداد أرقام
   * هواتف تجار حقيقيين، Enumeration Attack)، لكن تدقيق داخلي دقيق (`reason`) لكل حالة —
   * راجع specs/identity/PASSWORD_AUTH_SPEC.md §5.
   */
  async loginOwnerByPhone(phone: string, password: string): Promise<{ token: string; session: Session } | null> {
    const auth = await khalilService.verifyPasswordForPhone(phone, password);
    if (!auth.ok) {
      await auditService.log({
        actorId: auth.user?.id ?? null,
        actorRole: auth.user?.role ?? 'anonymous',
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: auth.user?.id ?? null,
        metadata: { phone, attemptedRole: 'merchant_owner', reason: auth.reason },
      });
      return null;
    }

    if (auth.user.role !== 'merchant_owner') {
      await auditService.log({
        actorId: auth.user.id,
        actorRole: auth.user.role,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: auth.user.id,
        metadata: { phone, attemptedRole: 'merchant_owner' },
      });
      return null;
    }

    const merchant = await merchantRepository.findByOwnerId(auth.user.id);
    if (!merchant || !merchant.isActive) {
      await auditService.log({
        actorId: auth.user.id,
        actorRole: auth.user.role,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: auth.user.id,
        metadata: { phone, reason: merchant ? 'merchant_inactive' : 'no_merchant_linked' },
      });
      return null;
    }

    const result = await khalilService.createSession({
      userId: auth.user.id,
      tenantId: merchant.id,
      role: auth.user.role,
      ttlSeconds: MERCHANT_SESSION_TTL_SECONDS,
      mustChangePassword: auth.mustChangePassword,
    });

    await auditService.log({
      actorId: auth.user.id,
      actorRole: auth.user.role,
      action: 'auth.login_success',
      entityType: 'user',
      entityId: auth.user.id,
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

  // §31 بند 7 — مسار تسجيل دخول موظف التاجر يحتاج تحديد التاجر صراحة (لا حل تلقائي عبر كل التجار
  // التي قد ينتمي لها المستخدم — قرار معماري موثَّق أصلاً في merchantStaff/types.ts). التاجر يُدخِل
  // "معرّف متجره" (slug)، لا معرّفاً تقنياً (UUID).
  async findBySlug(slug: string): Promise<Merchant | null> {
    return merchantRepository.findBySlug(slug);
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
