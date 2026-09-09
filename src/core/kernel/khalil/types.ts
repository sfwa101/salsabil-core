// src/core/kernel/khalil/types.ts
// خليل — محرك الهوية والسياق (Identity & Context Engine)

export type UserRole = 'platform_admin' | 'merchant_owner' | 'merchant_manager' | 'employee' | 'customer';

export interface User {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: UserRole;
  createdAt: string;
}

export interface Session {
  userId: string;
  tenantId: string | null; // null للعملاء العاديين، موجود للتجار
  role: UserRole;
  expiresAt: string;
  // URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — نسخة "يجب تغيير كلمة المرور" وقت إنشاء الجلسة
  // (لا تُقرأ من users في كل طلب لاحق). المصدر الحقيقي يبقى users.must_change_password —
  // راجع specs/identity/PASSWORD_AUTH_SPEC.md §0/§5.
  mustChangePassword: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}

// اليوم 19 (ADR-018) — Context Engine. لا يُخلَط مع WorldSlug/WORLD_THEMES
// (src/config/theme-registry.ts) — ذاك ثيمات CSS بصرية، هذا سياق هوية/صلاحيات (راجع docs/DATABASE.md §3).
export interface World {
  id: string;
  slug: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserPersona {
  id: string;
  userId: string;
  worldId: string;
  isDefault: boolean;
  createdAt: string;
}