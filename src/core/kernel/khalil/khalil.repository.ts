// src/core/kernel/khalil/khalil.repository.ts
// الاتصال بقاعدة البيانات الخاص بخليل — لا منطق أعمال هنا، فقط قراءة/كتابة

import { supabase } from '../database/supabase-client';
import { supabaseAdmin } from '../database/supabase-admin-client';
import type { User, Tenant, UserRole, Session } from './types';

interface UserRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: User['role'];
  created_at: string;
}

interface TenantRow {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
}

interface SessionRow {
  token: string;
  user_id: string;
  tenant_id: string | null;
  role: string;
  expires_at: string;
  created_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email ?? undefined,
    role: row.role,
    createdAt: row.created_at,
  };
}

function toTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toSession(row: SessionRow): Session {
  return {
    userId: row.user_id,
    tenantId: row.tenant_id,
    role: row.role as UserRole,
    expiresAt: row.expires_at,
  };
}

export class KhalilRepository {
  async findUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toUser(data as UserRow) : null;
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    const { data, error } = await supabase.from('users').select('*').eq('phone', phone).maybeSingle();
    if (error) throw error;
    return data ? toUser(data as UserRow) : null;
  }

  async findTenantById(id: string): Promise<Tenant | null> {
    const { data, error } = await supabase.from('tenants').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toTenant(data as TenantRow) : null;
  }

  /**
   * بحث بالهاتف عبر service_role — ضروري لأن سياسة RLS الوحيدة على users
   * (auth.uid() = id) لا تنطبق أبداً بلا مصادقة حقيقية (راجع خطة CHECKOUT-001)
   */
  async findUserByPhoneAdmin(phone: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('phone', phone).maybeSingle();
    if (error) throw error;
    return data ? toUser(data as UserRow) : null;
  }

  async createUser(input: { fullName: string; phone: string; role: UserRole }): Promise<User> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({ full_name: input.fullName, phone: input.phone, role: input.role })
      .select('*')
      .single();
    if (error) throw error;
    return toUser(data as UserRow);
  }

  async createSession(input: { userId: string; tenantId: string | null; role: UserRole; ttlSeconds: number }): Promise<{ token: string; session: Session }> {
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({ user_id: input.userId, tenant_id: input.tenantId, role: input.role, expires_at: expiresAt })
      .select('*')
      .single();
    if (error) throw error;
    const row = data as SessionRow;
    return { token: row.token, session: toSession(row) };
  }

  async findSessionByToken(token: string): Promise<Session | null> {
    const { data, error } = await supabaseAdmin.from('sessions').select('*').eq('token', token).maybeSingle();
    if (error) throw error;
    return data ? toSession(data as SessionRow) : null;
  }

  async deleteSession(token: string): Promise<void> {
    const { error } = await supabaseAdmin.from('sessions').delete().eq('token', token);
    if (error) throw error;
  }
}

export const khalilRepository = new KhalilRepository();
