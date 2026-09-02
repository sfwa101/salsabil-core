// src/core/modules/admin/admin.service.ts
// تجميع قراءات/عمليات إدارية عبر نطاقات متعددة (Merchant, Orders) — لا جدول خاص به، نفس دور
// orders.service.ts في تنسيق نطاقات أخرى عبر service.ts لا repository.ts (docs/ARCHITECTURE.md §3)

import { khalilService } from '../../kernel/khalil/service';
import { merchantService } from '../merchant/merchant.service';
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
    if (!user || user.role !== 'platform_admin') return null;

    return khalilService.createSession({
      userId: user.id,
      tenantId: null,
      role: user.role,
      ttlSeconds: ADMIN_SESSION_TTL_SECONDS,
    });
  }

  async listMerchants(): Promise<Merchant[]> {
    return merchantService.listAll();
  }

  async setMerchantActiveStatus(id: string, isActive: boolean): Promise<Merchant> {
    return merchantService.setActiveStatus(id, isActive);
  }
}

export const adminService = new AdminService();
