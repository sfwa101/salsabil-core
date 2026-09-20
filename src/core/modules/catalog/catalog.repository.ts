// src/core/modules/catalog/catalog.repository.ts
// الاتصال بقاعدة البيانات الخاص بالكتالوج — لا منطق أعمال هنا، فقط قراءة/كتابة
// كل القراءات (categories/products) تستخدم العميل العام (anon) — RLS يسمح بقراءة عامة (النمط 1،
// docs/DATABASE.md §6). كل الكتابات الجديدة (CATALOG-IMPORT-WORKFLOW، ADR-031) تستخدم service_role
// — لا سياسة كتابة anon على products/categories، نفس القاعدة المتَّبعة لكل جدول آخر في المشروع
// (merchants/carts/orders/inventory...) — يحسم OPEN_QUESTION الموثَّق في docs/DATABASE.md §6.

import { supabase } from '../../kernel/database/supabase-client';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import type {
  CatalogCategory,
  CatalogSubcategory,
  Category,
  District,
  MasterCatalogItem,
  Product,
  ProductOption,
  ReviewQueueItem,
  ReviewQueueStatus,
} from './types';

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
  category_id: string | null;
  tenant_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  unit: string;
  image_url: string | null;
  options: ProductOption[];
  is_active: boolean;
  created_at: string;
  district_id: string | null;
  catalog_category_id: string | null;
  catalog_subcategory_id: string | null;
}

// شجرة التصنيف الجديدة (TASK-17 بيانات، TASK-18 واجهة) — راجع types.ts لسبب اختلاف التسمية عن
// Category/CategoryRow القديمين.
interface DistrictRow {
  id: string;
  slug: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
}

interface CatalogCategoryRow {
  id: string;
  district_id: string;
  slug: string;
  name_ar: string;
  sort_order: number;
}

interface CatalogSubcategoryRow {
  id: string;
  category_id: string;
  slug: string;
  name_ar: string;
  sort_order: number;
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
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description ?? undefined,
    basePrice: row.base_price,
    unit: row.unit,
    imageUrl: row.image_url ?? undefined,
    options: row.options ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
    districtId: row.district_id,
    catalogCategoryId: row.catalog_category_id,
    catalogSubcategoryId: row.catalog_subcategory_id,
  };
}

function toDistrict(row: DistrictRow): District {
  return {
    id: row.id,
    slug: row.slug,
    nameAr: row.name_ar,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function toCatalogCategory(row: CatalogCategoryRow): CatalogCategory {
  return {
    id: row.id,
    districtId: row.district_id,
    slug: row.slug,
    nameAr: row.name_ar,
    sortOrder: row.sort_order,
  };
}

function toCatalogSubcategory(row: CatalogSubcategoryRow): CatalogSubcategory {
  return {
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    nameAr: row.name_ar,
    sortOrder: row.sort_order,
  };
}

interface MasterCatalogItemRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  base_price: number;
  unit: string;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function toMasterCatalogItem(row: MasterCatalogItemRow): MasterCatalogItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description ?? undefined,
    basePrice: row.base_price,
    unit: row.unit,
    imageUrl: row.image_url ?? undefined,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ReviewQueueRow {
  id: string;
  tenant_id: string;
  raw_name: string;
  quantity: number;
  cost_price: number;
  status: ReviewQueueStatus;
  resolved_master_item_id: string | null;
  resolved_product_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

function toReviewQueueItem(row: ReviewQueueRow): ReviewQueueItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    rawName: row.raw_name,
    quantity: row.quantity,
    costPrice: row.cost_price,
    status: row.status,
    resolvedMasterItemId: row.resolved_master_item_id ?? undefined,
    resolvedProductId: row.resolved_product_id ?? undefined,
    resolvedBy: row.resolved_by ?? undefined,
    resolvedAt: row.resolved_at ?? undefined,
    createdAt: row.created_at,
  };
}

export class CatalogRepository {
  async findCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*').order('display_order');
    if (error) throw error;
    return (data as CategoryRow[]).map(toCategory);
  }

  async findCategoryBySlug(slug: string): Promise<Category | null> {
    const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? toCategory(data as CategoryRow) : null;
  }

  async findProductsByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').eq('category_id', categoryId);
    if (error) throw error;
    return (data as ProductRow[]).map(toProduct);
  }

  // بلا فلتر — لمنتقي المنتج في لوحة إدارة بيان (اليوم 24). لا خطر أداء اليوم (كتالوج صغير جداً،
  // قسم تجريبي واحد) — يُعاد تقييمه (تصفح/بحث) عند نمو الكتالوج فعلياً.
  async findAllProducts(): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').eq('is_active', true);
    if (error) throw error;
    return (data as ProductRow[]).map(toProduct);
  }

  // دفعة واحدة لعدة معرّفات — نفس نمط findPostMediaByPostIds في bayan.repository.ts (اليوم 23).
  // مستهلكها الأول: خلاصة بيان (اليوم 27) لحل رف المنتجات المرتبط بمنشور (post_products) لمنتجات
  // كاملة. is_active=true بنفس قاعدة findAllProducts — لا تُعرَض منتجات موقوفة في رف الخلاصة حتى لو
  // بقي ربطها في post_products من قِبل الأدمن.
  async findProductsByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from('products').select('*').in('id', ids).eq('is_active', true);
    if (error) throw error;
    return (data as ProductRow[]).map(toProduct);
  }

  // §31 بند 3 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md) — منتجات قابلة للشراء فعلياً (tenant_id
  // حقيقي، لا الاستيراد الأولي بلا تاجر الذي يشكّل 99.3% من الكتالوج) لرف "منتجات حقيقية" على
  // الرئيسية، بمعزل عن مسار بيان/المنشورات. fetchLimit أعلى من المطلوب فعلياً عمداً — الاستبعاد
  // الفعلي لتجار تجريبيين (poultry-test) يحدث لاحقاً في catalogService بعد الجلب، لا هنا (فلترة
  // بالاسم في SQL هشة، أسهل وأوضح بعد التحويل لكائنات JS في طبقة الخدمة).
  async findPurchasableProducts(fetchLimit: number): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .not('tenant_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(fetchLimit);
    if (error) throw error;
    return (data as ProductRow[]).map(toProduct);
  }

  async findProductsByTenant(tenantId: string): Promise<Product[]> {
    const { data, error } = await supabase.from('products').select('*').eq('tenant_id', tenantId);
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

  // ==========================================================================
  // شجرة التصنيف الجديدة (TASK-17 بيانات، TASK-18 واجهة) — حي → قسم رئيسي → قسم فرعي. قراءة عامة
  // (anon) بنفس نمط findCategories/findProductsByCategory أعلاه — راجع scripts/
  // 03-catalog-taxonomy-rls.sql لسياسة RLS المطلوبة (غير مُطبَّقة بعد على dev وقت كتابة هذا الكود،
  // TASK-18 تحقّق حي).
  // ==========================================================================

  async findDistricts(): Promise<District[]> {
    const { data, error } = await supabase
      .from('catalog_districts')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return (data as DistrictRow[]).map(toDistrict);
  }

  async findDistrictBySlug(slug: string): Promise<District | null> {
    const { data, error } = await supabase
      .from('catalog_districts')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data ? toDistrict(data as DistrictRow) : null;
  }

  async findCategoriesForDistrict(districtId: string): Promise<CatalogCategory[]> {
    const { data, error } = await supabase
      .from('catalog_categories')
      .select('*')
      .eq('district_id', districtId)
      .order('sort_order');
    if (error) throw error;
    return (data as CatalogCategoryRow[]).map(toCatalogCategory);
  }

  async findCatalogCategoryBySlug(districtId: string, slug: string): Promise<CatalogCategory | null> {
    const { data, error } = await supabase
      .from('catalog_categories')
      .select('*')
      .eq('district_id', districtId)
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toCatalogCategory(data as CatalogCategoryRow) : null;
  }

  async findSubcategoriesForCategory(categoryId: string): Promise<CatalogSubcategory[]> {
    const { data, error } = await supabase
      .from('catalog_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('sort_order');
    if (error) throw error;
    return (data as CatalogSubcategoryRow[]).map(toCatalogSubcategory);
  }

  async findCatalogSubcategoryBySlug(categoryId: string, slug: string): Promise<CatalogSubcategory | null> {
    const { data, error } = await supabase
      .from('catalog_subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toCatalogSubcategory(data as CatalogSubcategoryRow) : null;
  }

  async findProductsByCatalogCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('catalog_category_id', categoryId)
      .eq('is_active', true);
    if (error) throw error;
    return (data as ProductRow[]).map(toProduct);
  }

  async findProductsByCatalogSubcategory(subcategoryId: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('catalog_subcategory_id', subcategoryId)
      .eq('is_active', true);
    if (error) throw error;
    return (data as ProductRow[]).map(toProduct);
  }

  // ==========================================================================
  // الكتالوج الأساسي (CATALOG-IMPORT-WORKFLOW، ADR-031) — كتابة عبر service_role حصراً
  // ==========================================================================

  async listMasterItems(): Promise<MasterCatalogItem[]> {
    const { data, error } = await supabaseAdmin.from('catalog_master_items').select('*').order('name');
    if (error) throw error;
    return (data as MasterCatalogItemRow[]).map(toMasterCatalogItem);
  }

  async findMasterItemById(id: string): Promise<MasterCatalogItem | null> {
    const { data, error } = await supabaseAdmin.from('catalog_master_items').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toMasterCatalogItem(data as MasterCatalogItemRow) : null;
  }

  async insertMasterItem(input: {
    categoryId: string;
    name: string;
    description?: string;
    basePrice: number;
    unit: string;
    imageUrl?: string;
  }): Promise<MasterCatalogItem> {
    const { data, error } = await supabaseAdmin
      .from('catalog_master_items')
      .insert({
        category_id: input.categoryId,
        name: input.name,
        description: input.description ?? null,
        base_price: input.basePrice,
        unit: input.unit,
        image_url: input.imageUrl ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toMasterCatalogItem(data as MasterCatalogItemRow);
  }

  async updateMasterItemBasePrice(id: string, basePrice: number): Promise<MasterCatalogItem> {
    const { data, error } = await supabaseAdmin
      .from('catalog_master_items')
      .update({ base_price: basePrice, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toMasterCatalogItem(data as MasterCatalogItemRow);
  }

  // يُحافظ على "سعر البيع يحدده المالك فقط" (طلب المهمة) — كل صف منتج تاجر مرتبط بهذا العنصر
  // يتبع سعره تلقائياً عند تعديله، بلا لمس CatalogService.calculatePrice نفسها (INV-SEC-001، DEEP).
  async cascadeBasePriceToLinkedProducts(masterItemId: string, basePrice: number): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ base_price: basePrice })
      .eq('master_item_id', masterItemId)
      .select('id');
    if (error) throw error;
    return (data as { id: string }[]).length;
  }

  // ==========================================================================
  // صف منتج تاجر مُستنسَخ من عنصر كتالوج أساسي (منتج ذاته يبقى في نفس جدول products الحالي —
  // نفس نموذج عزل المستأجرين القائم، بلا أي تغيير على Orders/Cart)
  // ==========================================================================

  async findTenantProductByMasterItem(tenantId: string, masterItemId: string): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('master_item_id', masterItemId)
      .maybeSingle();
    if (error) throw error;
    return data ? toProduct(data as ProductRow) : null;
  }

  async insertProductFromMaster(tenantId: string, master: MasterCatalogItem): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        category_id: master.categoryId,
        tenant_id: tenantId,
        master_item_id: master.id,
        name: master.name,
        description: master.description ?? null,
        base_price: master.basePrice,
        unit: master.unit,
        image_url: master.imageUrl ?? null,
        options: [],
        is_active: true,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toProduct(data as ProductRow);
  }

  // ==========================================================================
  // قائمة مراجعة الاستيراد (catalog_review_queue) — كتابة/قراءة عبر service_role حصراً
  // ==========================================================================

  // يمنع تكديس صفوف مراجعة مكرَّرة لنفس (تاجر، اسم خام) عند إعادة رفع نفس الملف قبل أن يبت المالك
  // في الصف الأول — لا يُغيّر الكمية/التكلفة المعروضة (تبقى من أول استيراد حتى الحسم، لا تحديثاً صامتاً).
  async findPendingReviewQueueItem(tenantId: string, rawName: string): Promise<ReviewQueueItem | null> {
    const { data, error } = await supabaseAdmin
      .from('catalog_review_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('raw_name', rawName)
      .eq('status', 'pending')
      .maybeSingle();
    if (error) throw error;
    return data ? toReviewQueueItem(data as ReviewQueueRow) : null;
  }

  async insertReviewQueueItem(input: { tenantId: string; rawName: string; quantity: number; costPrice: number }): Promise<ReviewQueueItem> {
    const { data, error } = await supabaseAdmin
      .from('catalog_review_queue')
      .insert({
        tenant_id: input.tenantId,
        raw_name: input.rawName,
        quantity: input.quantity,
        cost_price: input.costPrice,
      })
      .select('*')
      .single();
    if (error) throw error;
    return toReviewQueueItem(data as ReviewQueueRow);
  }

  async listReviewQueue(status: ReviewQueueStatus = 'pending'): Promise<ReviewQueueItem[]> {
    const { data, error } = await supabaseAdmin
      .from('catalog_review_queue')
      .select('*')
      .eq('status', status)
      .order('created_at');
    if (error) throw error;
    return (data as ReviewQueueRow[]).map(toReviewQueueItem);
  }

  async findReviewQueueItemById(id: string): Promise<ReviewQueueItem | null> {
    const { data, error } = await supabaseAdmin.from('catalog_review_queue').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toReviewQueueItem(data as ReviewQueueRow) : null;
  }

  async resolveReviewQueueItem(
    id: string,
    input: { status: 'approved_new' | 'merged'; resolvedMasterItemId: string; resolvedProductId: string; resolvedBy: string }
  ): Promise<ReviewQueueItem> {
    const { data, error } = await supabaseAdmin
      .from('catalog_review_queue')
      .update({
        status: input.status,
        resolved_master_item_id: input.resolvedMasterItemId,
        resolved_product_id: input.resolvedProductId,
        resolved_by: input.resolvedBy,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toReviewQueueItem(data as ReviewQueueRow);
  }
}

export const catalogRepository = new CatalogRepository();
