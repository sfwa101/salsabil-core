// src/core/kernel/khalil/khalil.service.ts
// منطق الأعمال الخاص بخليل — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر khalilRepository

import { khalilRepository } from './khalil.repository';
import type { User, Session, UserRole, UserPersona, World } from './types';

// اليوم 19 (ADR-018) — الصف الوحيد المزروع في worlds حتى الآن. راجع docs/DECISIONS.md → CONFLICT-006
// لسبب حصر النطاق (لا عالم "أعمال" أو غيره بعد).
const INDIVIDUALS_WORLD_SLUG = 'individuals';

export class KhalilService {
  /**
   * يبحث عن مستخدم بالهاتف أو ينشئ واحداً جديداً (دور customer دائماً) — Checkout بلا تسجيل
   * دخول حقيقي (اليوم 8). لا يُحدَّث الاسم إن وُجد مستخدم مطابق مسبقاً (لا نستبدل بياناً
   * صحيحة بخطأ إملائي محتمل في النموذج).
   *
   * اليوم 21 (ADR-019): يضمن الآن أيضاً وجود شخصية افتراضية في عالم "الأفراد" لهذا المستخدم —
   * لعميل موجود مسبقاً (Backfill اليوم 19 يفترض تغطيته، لكن التحقق دفاعي لا مكلف) ولعميل جديد
   * على حدٍّ سواء.
   */
  async findOrCreateCustomerByPhone(fullName: string, phone: string): Promise<User> {
    const existing = await khalilRepository.findUserByPhoneAdmin(phone);
    const user = existing ?? (await khalilRepository.createUser({ fullName, phone, role: 'customer' }));
    await this.ensureIndividualPersona(user.id);
    return user;
  }

  /**
   * يضمن أن يملك المستخدم شخصية افتراضية في عالم "الأفراد" (individuals) — يبحث أولاً، ينشئ
   * فقط عند عدم الوجود (idempotent، نفس عُرف findOrCreateCustomerByPhone). اليوم 21 (ADR-019).
   */
  async ensureIndividualPersona(userId: string): Promise<UserPersona> {
    const world = await khalilRepository.findWorldBySlug(INDIVIDUALS_WORLD_SLUG);
    if (!world) {
      throw new Error(`عالم "${INDIVIDUALS_WORLD_SLUG}" غير موجود في worlds — راجع scripts/day19-context-engine-schema.sql`);
    }
    const existing = await khalilRepository.findPersonaByUserAndWorld(userId, world.id);
    if (existing) return existing;
    return khalilRepository.createPersona({ userId, worldId: world.id, isDefault: true });
  }

  /**
   * بحث بالهاتف بلا إنشاء تلقائي — لتدفقات تسجيل الدخول (اليوم 10) حيث عدم وجود
   * مستخدم مطابق يعني "بيانات دخول خاطئة"، لا "عميل جديد" كما في findOrCreateCustomerByPhone
   */
  async findUserByPhone(phone: string): Promise<User | null> {
    return khalilRepository.findUserByPhoneAdmin(phone);
  }

  /**
   * كل العوالم النشطة من جدول worlds — مُستهلَكة أولاً عبر bayan.service.ts (اليوم 23) لتحديد
   * عالم individuals، ولاحقاً عبر مبدّل العوالم في الواجهة (اليوم 29). تمريرة رقيقة فقط —
   * dependency-cruiser يمنع أي نطاق خارج kernel/khalil/ من استيراد khalilRepository مباشرة.
   */
  async listActiveWorlds(): Promise<World[]> {
    return khalilRepository.listActiveWorlds();
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