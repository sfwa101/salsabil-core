// src/core/kernel/khalil/khalil.service.ts
// منطق الأعمال الخاص بخليل — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر khalilRepository

import { khalilRepository } from './khalil.repository';
import type { User, Session, UserRole } from './types';

export class KhalilService {
  /**
   * يبحث عن مستخدم بالهاتف أو ينشئ واحداً جديداً (دور customer دائماً) — Checkout بلا تسجيل
   * دخول حقيقي (اليوم 8). لا يُحدَّث الاسم إن وُجد مستخدم مطابق مسبقاً (لا نستبدل بياناً
   * صحيحة بخطأ إملائي محتمل في النموذج).
   */
  async findOrCreateCustomerByPhone(fullName: string, phone: string): Promise<User> {
    const existing = await khalilRepository.findUserByPhoneAdmin(phone);
    if (existing) return existing;
    return khalilRepository.createUser({ fullName, phone, role: 'customer' });
  }

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