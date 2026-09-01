// src/core/kernel/khalil/khalil.repository.ts
// الاتصال بقاعدة البيانات الخاص بخليل — لا منطق أعمال هنا، فقط قراءة/كتابة

import { supabase } from '../database/supabase-client';
import type { User, Tenant } from './types';

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
}

export const khalilRepository = new KhalilRepository();
