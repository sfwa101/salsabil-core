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

// STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — لا نظام Migrations رسمي
// (docs/DATABASE.md §8)، فلا ضمان أن SQL الجديد (is_active على catalog_categories/subcategories،
// جدولا catalog_node_*_links) طُبِّق يدوياً على أي بيئة معيَّنة وقت نشر هذا الكود. هذه الأكواد
// (PostgREST) تُميِّز "عمود غير موجود" عن "جدول غير موجود" — تُستخدَم لتفريق الحالتين عن أي خطأ حقيقي
// آخر يجب أن يبقى يفشل بصوت عالٍ كالمعتاد.
const UNDEFINED_COLUMN_ERROR_CODE = '42703';
const MISSING_TABLE_ERROR_CODE = 'PGRST205';

const warnedMissingIsActiveColumns = new Set<string>();
function warnMissingIsActiveColumnOnce(table: string): void {
  if (warnedMissingIsActiveColumns.has(table)) return;
  warnedMissingIsActiveColumns.add(table);
  console.warn(
    `⚠️ ${table}.is_active غير موجود بعد على هذه البيئة — scripts/2026-09-23-founder-taxonomy-foundation.sql لم يُطبَّق يدوياً. فلترة الإخفاء معطَّلة مؤقتاً (كل الصفوف تُعامَل كنشطة).`
  );
}

let warnedMissingNodeLinksTable = false;
function warnMissingNodeLinksTableOnce(): void {
  if (warnedMissingNodeLinksTable) return;
  warnedMissingNodeLinksTable = true;
  console.warn(
    '⚠️ catalog_node_product_links غير موجود بعد على هذه البيئة — scripts/2026-09-23-founder-taxonomy-foundation.sql لم يُطبَّق يدوياً. عضوية المنتجات (سلال/خير البلد/الميزان) معطَّلة مؤقتاً، المنتجات المملوكة مباشرة تعمل بشكل طبيعي.'
  );
}

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
  tagline: string | null;
  sort_order: number;
  is_active: boolean;
}

interface CatalogCategoryRow {
  id: string;
  district_id: string;
  slug: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
}

interface CatalogSubcategoryRow {
  id: string;
  category_id: string;
  slug: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
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
    tagline: row.tagline,
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
    isActive: row.is_active,
  };
}

function toCatalogSubcategory(row: CatalogSubcategoryRow): CatalogSubcategory {
  return {
    id: row.id,
    categoryId: row.category_id,
    slug: row.slug,
    nameAr: row.name_ar,
    sortOrder: row.sort_order,
    isActive: row.is_active,
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

  // STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — is_active جديد على
  // catalog_categories، يُطبَّق يدوياً عبر scripts/2026-09-23-founder-taxonomy-foundation.sql (لا
  // نظام Migrations رسمي، docs/DATABASE.md §8 — لا ضمان توقيت التطبيق قبل نشر هذا الكود). لو لم
  // يُطبَّق العمود بعد على هذه البيئة تحديداً (42703 = undefined_column)، يُعاد المحاولة بلا فلتر
  // is_active — يُبقي الواجهة العامة تعمل بسلوكها القديم (كل الأقسام ظاهرة) بدل كسر الصفحة كاملة،
  // حتى يُطبَّق العمود. بعد التطبيق، الفلتر يعمل تلقائياً بلا أي تغيير كود آخر.
  async findCategoriesForDistrict(districtId: string): Promise<CatalogCategory[]> {
    const filtered = await supabase.from('catalog_categories').select('*').eq('district_id', districtId).eq('is_active', true).order('sort_order');
    if (filtered.error?.code === UNDEFINED_COLUMN_ERROR_CODE) {
      warnMissingIsActiveColumnOnce('catalog_categories');
      const fallback = await supabase.from('catalog_categories').select('*').eq('district_id', districtId).order('sort_order');
      if (fallback.error) throw fallback.error;
      return (fallback.data as CatalogCategoryRow[]).map((row) => toCatalogCategory({ ...row, is_active: true }));
    }
    if (filtered.error) throw filtered.error;
    return (filtered.data as CatalogCategoryRow[]).map(toCatalogCategory);
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

  // نفس تحفُّظ findCategoriesForDistrict أعلاه — is_active على catalog_subcategories جديد أيضاً،
  // بلا ضمان توقيت تطبيق يدوي على أي بيئة معيَّنة.
  async findSubcategoriesForCategory(categoryId: string): Promise<CatalogSubcategory[]> {
    const filtered = await supabase.from('catalog_subcategories').select('*').eq('category_id', categoryId).eq('is_active', true).order('sort_order');
    if (filtered.error?.code === UNDEFINED_COLUMN_ERROR_CODE) {
      warnMissingIsActiveColumnOnce('catalog_subcategories');
      const fallback = await supabase.from('catalog_subcategories').select('*').eq('category_id', categoryId).order('sort_order');
      if (fallback.error) throw fallback.error;
      return (fallback.data as CatalogSubcategoryRow[]).map((row) => toCatalogSubcategory({ ...row, is_active: true }));
    }
    if (filtered.error) throw filtered.error;
    return (filtered.data as CatalogSubcategoryRow[]).map(toCatalogSubcategory);
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

  // ==========================================================================
  // §31 بند 8 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §12/§29 بند 15) — CRUD إدارة حقيقي فوق
  // نفس الشجرة أعلاه، بدل سكريبتات SQL يدوية لمرة واحدة. كتابة عبر service_role حصراً (نفس نمط
  // catalog_master_items/merchants — لا سياسة كتابة anon على جداول التصنيف). القراءة هنا (لوحة
  // الإدارة) لا تُصفّى بـis_active=true كما في findDistricts العامة أعلاه — المدير يجب أن يرى
  // الأحياء المُعطَّلة أيضاً ليتمكَّن من إعادة تفعيلها.
  // ==========================================================================

  async findAllDistrictsForAdmin(): Promise<District[]> {
    const { data, error } = await supabaseAdmin.from('catalog_districts').select('*').order('sort_order');
    if (error) throw error;
    return (data as DistrictRow[]).map(toDistrict);
  }

  async insertDistrict(input: { slug: string; nameAr: string; tagline?: string | null; sortOrder: number }): Promise<District> {
    const { data, error } = await supabaseAdmin
      .from('catalog_districts')
      .insert({ slug: input.slug, name_ar: input.nameAr, tagline: input.tagline ?? null, sort_order: input.sortOrder, is_active: true })
      .select('*')
      .single();
    if (error) throw error;
    return toDistrict(data as DistrictRow);
  }

  async updateDistrict(
    id: string,
    input: { slug?: string; nameAr: string; tagline?: string | null; sortOrder: number; isActive: boolean }
  ): Promise<District> {
    const { data, error } = await supabaseAdmin
      .from('catalog_districts')
      .update({
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        name_ar: input.nameAr,
        tagline: input.tagline ?? null,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toDistrict(data as DistrictRow);
  }

  // يُرجِع صفراً لو كان الحي مرجعاً فعلياً (قسم رئيسي واحد على الأقل تابع له) — الحذف الفعلي عبر
  // deleteDistrict في catalog.service.ts يتحقَّق من هذا قبل الاستدعاء الفعلي هنا (فصل التحقق عن التنفيذ،
  // لا تكراراً — الفحص الفعلي في مكان واحد).
  async countCategoriesForDistrict(districtId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('catalog_categories')
      .select('*', { count: 'exact', head: true })
      .eq('district_id', districtId);
    if (error) throw error;
    return count ?? 0;
  }

  async deleteDistrict(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('catalog_districts').delete().eq('id', id);
    if (error) throw error;
  }

  async findAllCategoriesForAdmin(districtId: string): Promise<CatalogCategory[]> {
    const { data, error } = await supabaseAdmin.from('catalog_categories').select('*').eq('district_id', districtId).order('sort_order');
    if (error) throw error;
    return (data as CatalogCategoryRow[]).map(toCatalogCategory);
  }

  async insertCatalogCategory(input: { districtId: string; slug: string; nameAr: string; sortOrder: number }): Promise<CatalogCategory> {
    const { data, error } = await supabaseAdmin
      .from('catalog_categories')
      .insert({ district_id: input.districtId, slug: input.slug, name_ar: input.nameAr, sort_order: input.sortOrder, is_active: true })
      .select('*')
      .single();
    if (error) throw error;
    return toCatalogCategory(data as CatalogCategoryRow);
  }

  async updateCatalogCategory(
    id: string,
    input: { slug?: string; nameAr: string; sortOrder: number; isActive: boolean }
  ): Promise<CatalogCategory> {
    const { data, error } = await supabaseAdmin
      .from('catalog_categories')
      .update({
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        name_ar: input.nameAr,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toCatalogCategory(data as CatalogCategoryRow);
  }

  async moveCatalogCategory(id: string, newDistrictId: string): Promise<CatalogCategory> {
    const { data, error } = await supabaseAdmin
      .from('catalog_categories')
      .update({ district_id: newDistrictId })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toCatalogCategory(data as CatalogCategoryRow);
  }

  async countSubcategoriesForCategory(categoryId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('catalog_subcategories')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', categoryId);
    if (error) throw error;
    return count ?? 0;
  }

  async deleteCatalogCategory(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('catalog_categories').delete().eq('id', id);
    if (error) throw error;
  }

  async findAllSubcategoriesForAdmin(categoryId: string): Promise<CatalogSubcategory[]> {
    const { data, error } = await supabaseAdmin.from('catalog_subcategories').select('*').eq('category_id', categoryId).order('sort_order');
    if (error) throw error;
    return (data as CatalogSubcategoryRow[]).map(toCatalogSubcategory);
  }

  async insertCatalogSubcategory(input: { categoryId: string; slug: string; nameAr: string; sortOrder: number }): Promise<CatalogSubcategory> {
    const { data, error } = await supabaseAdmin
      .from('catalog_subcategories')
      .insert({ category_id: input.categoryId, slug: input.slug, name_ar: input.nameAr, sort_order: input.sortOrder, is_active: true })
      .select('*')
      .single();
    if (error) throw error;
    return toCatalogSubcategory(data as CatalogSubcategoryRow);
  }

  async updateCatalogSubcategory(
    id: string,
    input: { slug?: string; nameAr: string; sortOrder: number; isActive: boolean }
  ): Promise<CatalogSubcategory> {
    const { data, error } = await supabaseAdmin
      .from('catalog_subcategories')
      .update({
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        name_ar: input.nameAr,
        sort_order: input.sortOrder,
        is_active: input.isActive,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toCatalogSubcategory(data as CatalogSubcategoryRow);
  }

  async findCatalogCategoryById(id: string): Promise<CatalogCategory | null> {
    const { data, error } = await supabaseAdmin.from('catalog_categories').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toCatalogCategory(data as CatalogCategoryRow) : null;
  }

  async moveCatalogSubcategory(id: string, newCategoryId: string): Promise<CatalogSubcategory> {
    const { data, error } = await supabaseAdmin
      .from('catalog_subcategories')
      .update({ category_id: newCategoryId })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return toCatalogSubcategory(data as CatalogSubcategoryRow);
  }

  // مرجعية = منتج (ملكية مباشرة أو عضوية) — لا حذف فعلي هنا لو أي منهما > 0 (الفحص في service).
  async countProductsOwningCatalogSubcategory(subcategoryId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('catalog_subcategory_id', subcategoryId);
    if (error) throw error;
    return count ?? 0;
  }

  async countMembershipsForCatalogSubcategory(subcategoryId: string): Promise<number> {
    const [productLinks, postLinks] = await Promise.all([
      supabaseAdmin.from('catalog_node_product_links').select('*', { count: 'exact', head: true }).eq('catalog_subcategory_id', subcategoryId),
      supabaseAdmin.from('catalog_node_post_links').select('*', { count: 'exact', head: true }).eq('catalog_subcategory_id', subcategoryId),
    ]);
    if (productLinks.error) throw productLinks.error;
    if (postLinks.error) throw postLinks.error;
    return (productLinks.count ?? 0) + (postLinks.count ?? 0);
  }

  async deleteCatalogSubcategory(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('catalog_subcategories').delete().eq('id', id);
    if (error) throw error;
  }

  // يجمع بين المنتجات المملوكة أصلاً لهذا القسم الفرعي (catalog_subcategory_id) والمنتجات المُلحَقة
  // به فقط عبر عضوية (catalog_node_product_links — الأحياء التجميعية/الهجينة/الوصفية: السلال/خير
  // البلد/الميزان) بلا أي تكرار لصف المنتج نفسه. Set على id يمنع ظهور نفس المنتج مرتين لو كان مملوكاً
  // للقسم وله عضوية فيه أيضاً في نفس الوقت (حالة نظرية، لا تُفترَض مستحيلة).
  // STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — catalog_node_product_links جديد،
  // يُطبَّق يدوياً (نفس تحفُّظ findCategoriesForDistrict أعلاه). لو الجدول غير موجود بعد على هذه
  // البيئة (PGRST205 = جدول غير موجود في الـschema cache)، يُتجاهَل جانب العضوية تماماً ويُرجَع فقط
  // المنتجات المملوكة مباشرة — نفس السلوك القديم قبل هذه الميزة، بدل كسر الصفحة.
  async findProductsByCatalogSubcategory(subcategoryId: string): Promise<Product[]> {
    const [ownedResult, linkedResult] = await Promise.all([
      supabase.from('products').select('*').eq('catalog_subcategory_id', subcategoryId).eq('is_active', true),
      supabase
        .from('catalog_node_product_links')
        .select('sort_order, products(*)')
        .eq('catalog_subcategory_id', subcategoryId)
        .order('sort_order'),
    ]);
    if (ownedResult.error) throw ownedResult.error;
    if (linkedResult.error && linkedResult.error.code !== MISSING_TABLE_ERROR_CODE) throw linkedResult.error;
    if (linkedResult.error) warnMissingNodeLinksTableOnce();

    const seen = new Set<string>();
    const products: Product[] = [];
    for (const row of ownedResult.data as ProductRow[]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      products.push(toProduct(row));
    }
    if (!linkedResult.error) {
      for (const link of linkedResult.data as unknown as Array<{ products: ProductRow | null }>) {
        const row = link.products;
        if (!row || !row.is_active || seen.has(row.id)) continue;
        seen.add(row.id);
        products.push(toProduct(row));
      }
    }
    return products;
  }

  // عضوية عامة (قسم فرعي ← منتج) — لا تُغيِّر catalog_subcategory_id الأصلي للمنتج، فقط تُلحقه ضمن
  // نتائج findProductsByCatalogSubcategory لقسم فرعي آخر (السلال/خير البلد/الميزان). كتابة عبر
  // service_role حصراً، نفس نمط بقية جداول التصنيف.
  async linkProductToNode(input: { catalogSubcategoryId: string; productId: string; sortOrder?: number }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('catalog_node_product_links')
      .upsert(
        { catalog_subcategory_id: input.catalogSubcategoryId, product_id: input.productId, sort_order: input.sortOrder ?? 0 },
        { onConflict: 'catalog_subcategory_id,product_id' }
      );
    if (error) throw error;
  }

  async unlinkProductFromNode(catalogSubcategoryId: string, productId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('catalog_node_product_links')
      .delete()
      .eq('catalog_subcategory_id', catalogSubcategoryId)
      .eq('product_id', productId);
    if (error) throw error;
  }

  async listLinkedProductsForNode(catalogSubcategoryId: string): Promise<Product[]> {
    const { data, error } = await supabaseAdmin
      .from('catalog_node_product_links')
      .select('sort_order, products(*)')
      .eq('catalog_subcategory_id', catalogSubcategoryId)
      .order('sort_order');
    if (error) throw error;
    return (data as unknown as Array<{ products: ProductRow | null }>)
      .map((row) => row.products)
      .filter((row): row is ProductRow => row !== null)
      .map(toProduct);
  }

  // نفس المبدأ لمنشورات بيان (الوصفات = محتوى + روابط منتجات — راجع DD-024، لا جدول recipes جديد).
  async linkPostToNode(input: { catalogSubcategoryId: string; postId: string; sortOrder?: number }): Promise<void> {
    const { error } = await supabaseAdmin
      .from('catalog_node_post_links')
      .upsert(
        { catalog_subcategory_id: input.catalogSubcategoryId, post_id: input.postId, sort_order: input.sortOrder ?? 0 },
        { onConflict: 'catalog_subcategory_id,post_id' }
      );
    if (error) throw error;
  }

  async unlinkPostFromNode(catalogSubcategoryId: string, postId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('catalog_node_post_links')
      .delete()
      .eq('catalog_subcategory_id', catalogSubcategoryId)
      .eq('post_id', postId);
    if (error) throw error;
  }

  async listLinkedPostIdsForNode(catalogSubcategoryId: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin
      .from('catalog_node_post_links')
      .select('post_id')
      .eq('catalog_subcategory_id', catalogSubcategoryId)
      .order('sort_order');
    if (error) throw error;
    return (data as Array<{ post_id: string }>).map((row) => row.post_id);
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

  // §31 بند 5 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md) — بحث التاجر في Product Library بالاسم
  // (لا Barcode، المفهوم غير موجود إطلاقاً في المخطط، §4/§9 من تقرير التدقيق). ilike بلا تطبيع (على
  // عكس المطابقة الحرفية الصارمة لاستيراد Excel، ADR-031) — هذا بحث تفاعلي للتاجر يختار منه يدوياً،
  // لا مطابقة آلية تُطبَّق بلا مراجعة بشرية، فلا خطر دمج خاطئ صامت هنا. supabaseAdmin بنفس نمط
  // listMasterItems/findMasterItemById أعلاه (نفس الجدول).
  async searchMasterItemsByName(query: string, limit = 20): Promise<MasterCatalogItem[]> {
    const { data, error } = await supabaseAdmin.from('catalog_master_items').select('*').ilike('name', `%${query}%`).order('name').limit(limit);
    if (error) throw error;
    return (data as MasterCatalogItemRow[]).map(toMasterCatalogItem);
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
