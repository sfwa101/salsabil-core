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
   * بحث بالهاتف بلا إنشاء تلقائي — لتدفقات تسجيل الدخول (اليوم 10) حيث عدم وجود
   * مستخدم مطابق يعني "بيانات دخول خاطئة"، لا "عميل جديد" كما في findOrCreateCustomerByPhone
   */
  async findUserByPhone(phone: string): Promise<User | null> {
    return khalilRepository.findUserByPhoneAdmin(phone);
  }

  async createSession(input: { userId: string; tenantId: string | null; role: UserRole; ttlSeconds: number }): Promise<{ token: string; session: Session }> {
    return khalilRepository.createSession(input);
  }

  /**
   * يعيد الجلسة إن كان الرمز موجوداً وسارياً فقط — لا يميّز بين "غير موجود" و"منتهي الصلاحية"
   * للمستدعي (كلاهما "بلا جلسة صالحة" من منظور الاستدعاء)
   */
  async validateSessionToken(token: string): Promise<Session | null> {
    const session = await khalilRepository.findSessionByToken(token);
    if (!session) return null;
    return this.isSessionValid(session) ? session : null;
  }

  async destroySession(token: string): Promise<void> {
    return khalilRepository.deleteSession(token);
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