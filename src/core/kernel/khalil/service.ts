// src/core/kernel/khalil/khalil.service.ts
// منطق الأعمال الخاص بخليل — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر khalilRepository

import { khalilRepository } from './khalil.repository';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from '../security/password';
import type { User, Session, UserRole, UserPersona, World } from './types';

// URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — نتيجة تمييزية (Discriminated Union) عمداً بدل
// null بسيط: تسمح للمستدعي (merchant.service/admin.service) بتسجيل تدقيق دقيق داخلياً (سبب الفشل
// الحقيقي) بينما يبقى الرد الخارجي للمتصفح رسالة رفض موحَّدة واحدة (specs/identity/PASSWORD_AUTH_SPEC.md
// §5) — لا تناقض: التمييز الداخلي في السجل لا يُسرَّب للعميل أبداً، فقط يُستهلَك داخل service.ts.
export type PasswordVerificationResult =
  | { ok: true; user: User; mustChangePassword: boolean }
  | { ok: false; reason: 'not_found' | 'no_password_set' | 'wrong_password'; user: User | null };

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
   * بحث بالمعرّف — لعرض بيانات المستخدم الحالي (اسم/هاتف) بعد التحقق من الجلسة (مثال:
   * account/page.tsx تعرض اسم العميل المسجَّل). Session لا تحمل fullName نفسها عمداً (تصميم
   * قائم أصلاً، Session رقيقة: userId/tenantId/role/expiresAt/mustChangePassword فقط).
   */
  async findUserById(id: string): Promise<User | null> {
    return khalilRepository.findUserById(id);
  }

  /**
   * كل العوالم النشطة من جدول worlds — مُستهلَكة أولاً عبر bayan.service.ts (اليوم 23) لتحديد
   * عالم individuals، ولاحقاً عبر مبدّل العوالم في الواجهة (اليوم 29). تمريرة رقيقة فقط —
   * dependency-cruiser يمنع أي نطاق خارج kernel/khalil/ من استيراد khalilRepository مباشرة.
   */
  async listActiveWorlds(): Promise<World[]> {
    return khalilRepository.listActiveWorlds();
  }

  async createSession(input: {
    userId: string;
    tenantId: string | null;
    role: UserRole;
    ttlSeconds: number;
    mustChangePassword?: boolean;
  }): Promise<{ token: string; session: Session }> {
    return khalilRepository.createSession(input);
  }

  /**
   * تحقق كلمة مرور موحَّد لتدفقَي دخول التاجر/الإدارة معاً (URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH) —
   * لا فحص دور هنا عمداً (مسؤولية المستدعي: merchant.service يتوقع merchant_owner، admin.service
   * يتوقع platform_admin، نفس فصل المسؤولية القائم أصلاً في findUserByPhone). راجع
   * specs/identity/PASSWORD_AUTH_SPEC.md §5.
   *
   * FIX-TIMING-ATTACK-VULNERABILITY-AUTH — Guardian Review DEEP (NOT APPROVED، الدفعة الأولى) كشف
   * أن مساري not_found/no_password_set كانا يرجعان فوراً بلا أي حساب scrypt، بينما wrong_password
   * وحده يُنفِّذ verifyPassword() الحقيقي — فرق زمني قابل للقياس يسمح بتعداد أرقام هواتف تجار
   * مسجَّلين (Timing Attack، PASSWORD_AUTH_SPEC.md §10). الإصلاح: كلا المسارين الآن يُنفِّذان
   * verifyPassword() فعلياً مقابل DUMMY_PASSWORD_HASH (تجزئة وهمية ثابتة بنفس معاملات scrypt، لا
   * تطابق أي حساب حقيقي أبداً) **قبل** إرجاع الرفض — فتُنفَق نفس الكلفة الزمنية تقريباً في المسارات
   * الثلاثة جميعاً. النتيجة نفسها (`matches`) تُهمَل عمداً (دائماً false منطقياً بما أن كلمة المرور
   * لن تطابق تجزئة عشوائية) — الغرض الوحيد هو استهلاك نفس زمن الحساب، لا التحقق الفعلي.
   */
  async verifyPasswordForPhone(phone: string, password: string): Promise<PasswordVerificationResult> {
    const auth = await khalilRepository.findAuthByPhone(phone);
    if (!auth) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      return { ok: false, reason: 'not_found', user: null };
    }
    if (!auth.passwordHash) {
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      return { ok: false, reason: 'no_password_set', user: auth.user };
    }

    const matches = await verifyPassword(password, auth.passwordHash);
    if (!matches) return { ok: false, reason: 'wrong_password', user: auth.user };

    return { ok: true, user: auth.user, mustChangePassword: auth.mustChangePassword };
  }

  /** يُجزّئ كلمة مرور جديدة ويحفظها — يُسقِط mustChangePassword على users (المستخدم غيَّرها طواعية). */
  async setNewPassword(userId: string, newPasswordPlain: string): Promise<void> {
    const hash = await hashPassword(newPasswordPlain);
    await khalilRepository.setPassword(userId, hash, false);
  }

  /**
   * يُجزّئ كلمة مرور مؤقتة (صادرة من النظام، لا من المستخدم) ويحفظها مع رفع علم "يجب التغيير" —
   * مُستهلَكة من scripts/create-merchant-account.ts وscripts/backfill-existing-owner-passwords.ts.
   */
  async setTemporaryPassword(userId: string, tempPasswordPlain: string): Promise<void> {
    const hash = await hashPassword(tempPasswordPlain);
    await khalilRepository.setPassword(userId, hash, true);
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