// src/core/modules/merchantStaff/merchantStaff.repository.ts
// الاتصال بقاعدة البيانات الخاص بموظفي التاجر — لا منطق أعمال هنا، فقط قراءة/كتابة
// جدول merchant_staff (TASK-12، مُنفَّذ فعلياً على dev — تحقُّق حي 2026-09-19) — RLS مفعَّل بلا أي
// policy (النمط 2)، وصول حصري عبر service_role، نفس نمط merchants/orders
// (راجع specs/orders/PHASE_2_DOMAIN_DESIGN.md §6).

import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { MerchantStaff, MerchantStaffRole } from './types';

interface MerchantStaffRow {
  id: string;
  tenant_id: string;
  user_id: string;
  role: MerchantStaffRole;
  is_active: boolean;
  created_at: string;
}

function toMerchantStaff(row: MerchantStaffRow): MerchantStaff {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export class MerchantStaffRepository {
  async create(tenantId: string, userId: string): Promise<MerchantStaff> {
    const { data, error } = await supabaseAdmin
      .from('merchant_staff')
      .insert({ tenant_id: tenantId, user_id: userId, role: 'staff' })
      .select('*')
      .single();
    if (error) throw error;
    return toMerchantStaff(data as MerchantStaffRow);
  }

  async findById(id: string): Promise<MerchantStaff | null> {
    const { data, error } = await supabaseAdmin.from('merchant_staff').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toMerchantStaff(data as MerchantStaffRow) : null;
  }

  async findByTenantAndUser(tenantId: string, userId: string): Promise<MerchantStaff | null> {
    const { data, error } = await supabaseAdmin
      .from('merchant_staff')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? toMerchantStaff(data as MerchantStaffRow) : null;
  }

  async listByTenant(tenantId: string): Promise<MerchantStaff[]> {
    const { data, error } = await supabaseAdmin
      .from('merchant_staff')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as MerchantStaffRow[]).map(toMerchantStaff);
  }

  async setActiveStatus(id: string, isActive: boolean): Promise<MerchantStaff> {
    const { data, error } = await supabaseAdmin
      .from('merchant_staff')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toMerchantStaff(data as MerchantStaffRow);
  }
}

export const merchantStaffRepository = new MerchantStaffRepository();
