// src/core/modules/merchant/merchant.repository.ts
// الاتصال بقاعدة البيانات الخاص بالتاجر — لا منطق أعمال هنا، فقط قراءة/كتابة

import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type { Merchant, MerchantRegistrationInput } from './types';

interface MerchantRow {
  id: string;
  owner_id: string;
  business_name: string;
  phone: string;
  slug: string;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
}

function toMerchant(row: MerchantRow): Merchant {
  return {
    id: row.id,
    ownerId: row.owner_id,
    businessName: row.business_name,
    phone: row.phone,
    slug: row.slug,
    commissionRate: row.commission_rate,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export class MerchantRepository {
  async findById(id: string): Promise<Merchant | null> {
    const { data, error } = await supabaseAdmin.from('merchants').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toMerchant(data as MerchantRow) : null;
  }

  async findBySlug(slug: string): Promise<Merchant | null> {
    const { data, error } = await supabaseAdmin.from('merchants').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? toMerchant(data as MerchantRow) : null;
  }

  async findByOwnerId(ownerId: string): Promise<Merchant | null> {
    const { data, error } = await supabaseAdmin.from('merchants').select('*').eq('owner_id', ownerId).maybeSingle();
    if (error) throw error;
    return data ? toMerchant(data as MerchantRow) : null;
  }

  async create(input: MerchantRegistrationInput): Promise<Merchant> {
    const { data, error } = await supabaseAdmin
      .from('merchants')
      .insert({
        owner_id: input.ownerId,
        business_name: input.businessName,
        phone: input.phone,
        slug: input.slug,
        commission_rate: input.commissionRate,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toMerchant(data as MerchantRow);
  }

  async findAll(): Promise<Merchant[]> {
    const { data, error } = await supabaseAdmin.from('merchants').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data as MerchantRow[]).map(toMerchant);
  }

  async setActiveStatus(id: string, isActive: boolean): Promise<Merchant> {
    const { data, error } = await supabaseAdmin.from('merchants').update({ is_active: isActive }).eq('id', id).select('*').single();
    if (error) throw error;
    return toMerchant(data as MerchantRow);
  }
}

export const merchantRepository = new MerchantRepository();
