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
}

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  isActive: boolean;
  createdAt: string;
}