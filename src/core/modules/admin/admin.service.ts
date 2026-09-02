// src/core/modules/admin/admin.service.ts
// تجميع قراءات/عمليات إدارية عبر نطاقات متعددة (Merchant, Orders) — لا جدول خاص به، نفس دور
// orders.service.ts في تنسيق نطاقات أخرى عبر service.ts لا repository.ts (docs/ARCHITECTURE.md §3)

import { khalilService } from '../../kernel/khalil/service';
import { merchantService } from '../merchant/merchant.service';
import { auditService } from '../audit/audit.service';
import type { Session } from '../../kernel/khalil/types';
import type { Merchant } from '../merchant/types';

// TODO: مدة الجلسة (7 أيام) قيمة عملية غير معتمدة رسمياً — نفس نمط BR-016/ADR-012 (OPEN_QUESTION)
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export class AdminService {
  /**
   * تسجيل دخول إدارة بلا كلمة مرور (نفس نمط MerchantService.loginOwnerByPhone، ADR-012) —
   * يرفض بصمت (null) عند أي فشل: رقم غير مسجَّل، أو مسجَّل لكن دوره ليس platform_admin.
   * tenantId دائماً null — الإدارة لا تنتمي لأي تاجر واحد.
   */
  async loginByPhone(phone: string): Promise<{ token: string; session: Session } | null> {
    const user = await khalilService.findUserByPhone(phone);
    if (!user || user.role !== 'platform_admin') {
      await auditService.log({
        actorId: user?.id ?? null,
        actorRole: user?.role ?? 'anonymous',
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: user?.id ?? null,
        metadata: { phone, attemptedRole: 'platform_admin' },
      });
      return null;
    }

    const result = await khalilService.createSession({
      userId: user.id,
      tenantId: null,
      role: user.role,
      ttlSeconds: ADMIN_SESSION_TTL_SECONDS,
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

  async listMerchants(): Promise<Merchant[]> {
    return merchantService.listAll();
  }

  // اليوم 12: يستقبل الفاعل صراحة لتسجيل التدقيق (ADR-014) — بلا هذا، فجوة "تفعيل/تعطيل التاجر
  // بلا سجل" المذكورة صراحة في ADR-013 تبقى مفتوحة.
  async setMerchantActiveStatus(id: string, isActive: boolean, actor: { id: string; role: Session['role'] }): Promise<Merchant> {
    const before = await merchantService.findById(id);
    const updated = await merchantService.setActiveStatus(id, isActive);

    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: isActive ? 'merchant.activated' : 'merchant.deactivated',
      entityType: 'merchant',
      entityId: id,
      metadata: { before: { isActive: before?.isActive ?? null }, after: { isActive: updated.isActive } },
    });

    return updated;
  }
}

export const adminService = new AdminService();
