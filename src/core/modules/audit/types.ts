// src/core/modules/audit/types.ts
// سجل تدقيق عام (اليوم 12، ADR-014) — يغطي كل عملية حساسة خارج دورة حياة الطلب (التي تبقى في
// order_status_history كما هي، بلا لمس). راجع docs/DATABASE.md قسم audit_log.

import type { UserRole } from '../../kernel/khalil/types';

export type AuditActorRole = UserRole | 'system' | 'anonymous';

// نص حر منضبط عبر union type لا enum SQL — يتجنب هجرة ALTER TYPE عند كل عملية حساسة جديدة
// CRITICAL-FIXES-FROM-AUDIT-001/GUARDIAN-FINDINGS-REMEDIATION-001 — فشل استرجاع تعويضي حقيقي
// لمخزون خُصم أثناء checkout() ثم لزم إعادته بعد فشل خطوة لاحقة (orders.service.ts.performCheckout)
export type AuditAction =
  | 'merchant.activated'
  | 'merchant.deactivated'
  | 'auth.login_success'
  | 'auth.login_failed'
  | 'auth.password_changed'
  // CUSTOMER-IDENTITY-PHASE-1 — تسجيل حساب عميل جديد فقط (لا "ادّعاء" حساب ضيف موجود، مؤجَّل)
  | 'auth.register_success'
  // CUSTOMER-IDENTITY-CLAIM-FLOW (ADR-030) — ادّعاء حساب عميل ضيف موجود مسبقاً، بعد تحقق OTP ناجح
  | 'auth.account_claimed'
  | 'inventory.release_failed';

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorRole: AuditActorRole;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateAuditLogInput {
  actorId?: string | null;
  actorRole: AuditActorRole;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}
