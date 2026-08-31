// src/core/kernel/khalil/khalil.service.ts
// منطق الأعمال الخاص بخليل — لا استدعاء لقاعدة بيانات هنا مباشرة

import type { User, Session, UserRole } from './types';

export class KhalilService {
  /**
   * يتحقق من أن المستخدم يملك أحد الأدوار المطلوبة
   */
  hasRole(session: Session, allowedRoles: UserRole[]): boolean {
    return allowedRoles.includes(session.role);
  }

  /**
   * يتحقق من أن الجلسة سارية (لم تنتهِ صلاحيتها)
   */
  isSessionValid(session: Session): boolean {
    return new Date(session.expiresAt).getTime() > Date.now();
  }

  /**
   * يتحقق من أن المستخدم يملك صلاحية الوصول لمستأجر معين
   */
  canAccessTenant(session: Session, tenantId: string): boolean {
    if (session.role === 'platform_admin') return true;
    return session.tenantId === tenantId;
  }
}

export const khalilService = new KhalilService();