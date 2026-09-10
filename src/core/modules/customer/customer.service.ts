// src/core/modules/customer/customer.service.ts
// CUSTOMER-IDENTITY-PHASE-1 — تسجيل/دخول عميل حقيقي (اختياري، Guest Mode يبقى الافتراضي — راجع
// docs/DECISIONS.md لتقرير الاستقصاء المعتمد). يعيد استخدام khalilService بالكامل — صفر تعديل
// على kernel/khalil نفسه، نفس آلية دخول التاجر/الإدارة بالضبط (ADR-026)، نمط موازٍ لا كود جديد.
//
// ⚠️ نطاق مقصود صراحة: `register` يرفض أي هاتف له صف users موجود مسبقاً بالكامل — حتى لو كان صفاً
// "ضيف" بلا كلمة مرور من Checkout سابق (findOrCreateCustomerByPhone القائم). لا "ادّعاء" حساب —
// ذلك المسار يحتاج تحقق هاتف حقيقياً (OTP) لمنع انتحال حساب عميل آخر بمجرد معرفة رقم هاتفه، ومزوّد
// الـOTP لم يُحسَم بعد (قرار مؤسس معلَّق). يُبنى كمهمة منفصلة صريحة بعد ذلك القرار.

import { khalilService } from '../../kernel/khalil/service';
import type { Session } from '../../kernel/khalil/types';
import { auditService } from '../audit/audit.service';

// عميل عادي، لا حساسية جلسة تاجر/إدارة — مدة أطول من MERCHANT_SESSION_TTL_SECONDS (7 أيام) مقبولة
// هنا (قرار تصميم، لا قرار مؤسس صريح منفصل مطلوب لهذه القيمة تحديداً بعكس مدة جلسة التاجر).
export const CUSTOMER_SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export type RegisterResult = { token: string; session: Session } | { error: 'account_exists' };

export class CustomerService {
  /**
   * تسجيل عميل جديد لم يطلب من قبل إطلاقاً (لا كضيف ولا مسجَّل) — راجع تحذير النطاق أعلى الملف.
   */
  async register(input: { fullName: string; phone: string; password: string }): Promise<RegisterResult> {
    const existing = await khalilService.findUserByPhone(input.phone);
    if (existing) {
      return { error: 'account_exists' };
    }

    // findOrCreateCustomerByPhone آمنة هنا رغم اسمها ("find or create"): الفحص أعلاه يضمن أن
    // المسار الشائع دائماً "create" فعلياً؛ فرع "find" النادر (سباق حقيقي: طلبان متزامنان لنفس
    // الهاتف الجديد كلياً) يُعامَل هنا كنفس نمط سباق Checkout المقبول صراحة (ADR-022 — لا قفل
    // موزَّع لحالة نادرة كهذه)، لا خطأً يحتاج معالجة إضافية.
    const user = await khalilService.findOrCreateCustomerByPhone(input.fullName, input.phone);
    await khalilService.setNewPassword(user.id, input.password);

    const result = await khalilService.createSession({
      userId: user.id,
      tenantId: null,
      role: 'customer',
      ttlSeconds: CUSTOMER_SESSION_TTL_SECONDS,
      mustChangePassword: false,
    });

    await auditService.log({
      actorId: user.id,
      actorRole: 'customer',
      action: 'auth.register_success',
      entityType: 'user',
      entityId: user.id,
      metadata: { phone: input.phone },
    });

    return result;
  }

  /**
   * دخول عميل بالهاتف + كلمة مرور — نفس نمط merchantService.loginOwnerByPhone/
   * adminService.loginByPhone حرفياً (رسالة رفض موحَّدة تمنع Enumeration Attack، تدقيق داخلي دقيق
   * لا يُسرَّب للعميل — specs/identity/PASSWORD_AUTH_SPEC.md §5).
   */
  async login(phone: string, password: string): Promise<{ token: string; session: Session } | null> {
    const auth = await khalilService.verifyPasswordForPhone(phone, password);
    if (!auth.ok) {
      await auditService.log({
        actorId: auth.user?.id ?? null,
        actorRole: auth.user?.role ?? 'anonymous',
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: auth.user?.id ?? null,
        metadata: { phone, attemptedRole: 'customer', reason: auth.reason },
      });
      return null;
    }

    if (auth.user.role !== 'customer') {
      await auditService.log({
        actorId: auth.user.id,
        actorRole: auth.user.role,
        action: 'auth.login_failed',
        entityType: 'user',
        entityId: auth.user.id,
        metadata: { phone, attemptedRole: 'customer' },
      });
      return null;
    }

    const result = await khalilService.createSession({
      userId: auth.user.id,
      tenantId: null,
      role: 'customer',
      ttlSeconds: CUSTOMER_SESSION_TTL_SECONDS,
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
}

export const customerService = new CustomerService();
