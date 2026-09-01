// src/core/modules/catalog/catalog.repository.ts
// الاتصال بقاعدة البيانات الخاص بالكتالوج — لا منطق أعمال هنا، فقط قراءة/كتابة

import { supabase } from '../../kernel/database/supabase-client';
import type { Category, Product, ProductOption } from './types';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  display_order: number;
  is_active: boolean;
}

interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  unit: string;
  image_url: string | null;
  options: ProductOption[];
  is_active: boolean;
  created_at: string;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parent_id,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? undefined,
    basePrice: row.base_price,
    unit: row.unit,
    imageUrl: row.image_url ?? undefined,
    options: row.options ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export class CatalogRepository {
  async findCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').order('display_order');
    if (error) throw error;
    return (data as CategoryRow[]).map(toCategory);
  }

  async findProductsByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').eq('category_id', categoryId);
    if (error) throw error;
    return (data as ProductRow[]).map(toProduct);
  }

  async findProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toProduct(data as ProductRow) : null;
  }

  async findProductByName(name: string): Promise<Product | null> {
    const { data, error } = await supabase.from('products').select('*').eq('name', name).maybeSingle();
    if (error) throw error;
    return data ? toProduct(data as ProductRow) : null;
  }
}

export const catalogRepository = new CatalogRepository();
