// src/core/modules/inventory/inventory.repository.ts
// الاتصال بقاعدة البيانات الخاص بالمخزون — لا منطق أعمال هنا، فقط قراءة
// قراءة عامة (RLS يسمح بها فعلاً — docs/DATABASE.md §6)، فالعميل العام كافٍ هنا

import { supabase } from '../../kernel/database/supabase-client';
import type { InventoryRecord } from './types';

interface InventoryRow {
  product_id: string;
  quantity_available: number;
  updated_at: string;
}

function toInventoryRecord(row: InventoryRow): InventoryRecord {
  return {
    productId: row.product_id,
    quantityAvailable: row.quantity_available,
    updatedAt: row.updated_at,
  };
}

export class InventoryRepository {
  async findByProductId(productId: string): Promise<InventoryRecord | null> {
    const { data, error } = await supabase.from('inventory').select('*').eq('product_id', productId).maybeSingle();
    if (error) throw error;
    return data ? toInventoryRecord(data as InventoryRow) : null;
  }
}

export const inventoryRepository = new InventoryRepository();
