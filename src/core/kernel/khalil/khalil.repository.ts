// src/core/kernel/khalil/khalil.repository.ts
// الاتصال بقاعدة البيانات الخاص بخليل — لا منطق أعمال هنا، فقط قراءة/كتابة

import { supabase } from '../database/supabase-client';
import { supabaseAdmin } from '../database/supabase-admin-client';
import type { User, Tenant, UserRole, Session, World, UserPersona } from './types';

interface UserRow {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  role: User['role'];
  created_at: string;
  // URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH — لا تُنسَخ إلى User عبر toUser() أبداً (لا تُعرَض
  // خارج هذا الملف إلا عبر findAuthByPhone المُخصَّصة). راجع specs/identity/PASSWORD_AUTH_SPEC.md.
  password_hash: string | null;
  must_change_password: boolean;
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
  must_change_password: boolean;
}

interface WorldRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface UserPersonaRow {
  id: string;
  user_id: string;
  world_id: string;
  is_default: boolean;
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
    mustChangePassword: row.must_change_password,
  };
}

function toWorld(row: WorldRow): World {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function toUserPersona(row: UserPersonaRow): UserPersona {
  return {
    id: row.id,
    userId: row.user_id,
    worldId: row.world_id,
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

export class KhalilRepository {
  // CUSTOMER-IDENTITY-PHASE-1 — أول مستهلك حقيقي فعلي لهذه الدالة (khalilService.findUserById،
  // account/page.tsx). كانت تستخدم العميل العام (anon) — موثَّق صراحة في ADR-009 كدالة "لا تعمل
  // فعلياً" (سياسة RLS الوحيدة على users هي auth.uid()=id، لا تنطبق أبداً بلا Supabase Auth حقيقية)
  // لكن "غير مستخدَمة فلا انحدار وقع". الآن مُستخدَمة فعلياً — service_role إلزامي، نفس نمط
  // findUserByPhoneAdmin المجاورة تماماً (لا يجوز فتح ثغرة سباق أخرى بترك النسخة القديمة صامتة).
  async findUserById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', id).maybeSingle();
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

  // TASK-14 (merchantStaffService.addStaff) — ترقية دور مستخدم موجود (عادة 'customer' إلى
  // 'employee' عند إضافته موظف تاجر لأول مرة، §6.2 من specs/orders/PHASE_2_DOMAIN_DESIGN.md).
  async setUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabaseAdmin.from('users').update({ role }).eq('id', userId);
    if (error) throw error;
  }

  /**
   * سجل خام لتدفق الدخول فقط — يُرجِع passwordHash/mustChangePassword صراحة، بعكس
   * findUserByPhone/findUserByPhoneAdmin التي تُسقطهما عمداً (User لا يحملهما أبداً).
   * لا Zero حماية إضافية هنا غير النطاق (مُستهلَك حصراً من khalilService.verifyPasswordForPhone) —
   * راجع specs/identity/PASSWORD_AUTH_SPEC.md §0.
   */
  async findAuthByPhone(phone: string): Promise<{ user: User; passwordHash: string | null; mustChangePassword: boolean } | null> {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('phone', phone).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as UserRow;
    return { user: toUser(row), passwordHash: row.password_hash, mustChangePassword: row.must_change_password };
  }

  /**
   * يضبط كلمة مرور جديدة (مُجزَّأة مسبقاً). `mustChangePassword` افتراضه `false` (المستخدم غيَّر
   * كلمة مروره طواعية من جلسته — لا حاجة لإجباره مجدداً)؛ `true` صريحة لحالة "كلمة مرور مؤقتة
   * صادرة من النظام" (scripts/create-merchant-account.ts، scripts/backfill-existing-owner-passwords.ts).
   */
  async setPassword(userId: string, passwordHash: string, mustChangePassword = false): Promise<void> {
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash, must_change_password: mustChangePassword })
      .eq('id', userId);
    if (error) throw error;
  }

  async createSession(input: {
    userId: string;
    tenantId: string | null;
    role: UserRole;
    ttlSeconds: number;
    mustChangePassword?: boolean;
  }): Promise<{ token: string; session: Session }> {
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: input.userId,
        tenant_id: input.tenantId,
        role: input.role,
        expires_at: expiresAt,
        must_change_password: input.mustChangePassword ?? false,
      })
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

  // اليوم 19 (ADR-018) — worlds/user_personas مقفولان بالكامل (RLS بلا أي policy، نفس نمط
  // sessions/merchants) — service_role إلزامي، لا عميل anon هنا كما في findUserById/findUserByPhone.

  async findWorldBySlug(slug: string): Promise<World | null> {
    const { data, error } = await supabaseAdmin.from('worlds').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? toWorld(data as WorldRow) : null;
  }

  async listActiveWorlds(): Promise<World[]> {
    const { data, error } = await supabaseAdmin.from('worlds').select('*').eq('is_active', true);
    if (error) throw error;
    return (data as WorldRow[]).map(toWorld);
  }

  async findPersonaByUserAndWorld(userId: string, worldId: string): Promise<UserPersona | null> {
    const { data, error } = await supabaseAdmin
      .from('user_personas')
      .select('*')
      .eq('user_id', userId)
      .eq('world_id', worldId)
      .maybeSingle();
    if (error) throw error;
    return data ? toUserPersona(data as UserPersonaRow) : null;
  }

  async createPersona(input: { userId: string; worldId: string; isDefault?: boolean }): Promise<UserPersona> {
    const { data, error } = await supabaseAdmin
      .from('user_personas')
      .insert({ user_id: input.userId, world_id: input.worldId, is_default: input.isDefault ?? false })
      .select('*')
      .single();
    if (error) throw error;
    return toUserPersona(data as UserPersonaRow);
  }
}

export const khalilRepository = new KhalilRepository();
