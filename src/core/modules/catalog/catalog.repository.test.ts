// src/core/modules/catalog/catalog.repository.test.ts
// اختبار وحدة (mocked) لـ findProductsByIds فقط (اليوم 27، BAYAN-HOME-FEED-001) — أول اختبار لهذا
// الملف؛ بقية دوال catalog.repository.ts (findCategories، findProductById، إلخ) لم تُختبَر وحدياً من
// قبل في هذا المستودع (لا فجوة يفتحها هذا الملف تحديداً، خارج نطاق مهمة اليوم 27 إغلاقها الآن).
// نفس نمط bayan.repository.test.ts (تمويه عميل supabase مباشرة، builder يدعم .in()).

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../kernel/database/supabase-client', () => ({
  supabase: { from: vi.fn() },
}));

const { catalogRepository } = await import('./catalog.repository');
const { supabase } = await import('../../kernel/database/supabase-client');

function makeQueryBuilder(terminal: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    in: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    // order() تُستخدَم في findDistricts/findCategoriesForDistrict/findSubcategoriesForCategory
    // (TASK-18) — ترجع نفس builder (thenable) تماماً كـ eq/select، لا استعلاماً منفصلاً.
    order: vi.fn(() => builder),
    // maybeSingle() طرف نهائي حقيقي في supabase-js (يُعيد Promise مباشرة، لا chain إضافي) — يُستخدَم
    // في findDistrictBySlug/findCatalogCategoryBySlug/findCatalogSubcategoryBySlug (TASK-18).
    maybeSingle: vi.fn(() => Promise.resolve(terminal)),
    then: (onFulfilled: (value: typeof terminal) => unknown) => Promise.resolve(terminal).then(onFulfilled),
  };
  return builder;
}

const productRow = {
  id: 'prod-1',
  category_id: 'cat-1',
  tenant_id: null,
  name: 'منتج اختبار',
  description: null,
  base_price: 10,
  unit: 'قطعة',
  image_url: 'https://example.com/p.jpg',
  options: [],
  is_active: true,
  created_at: '2026-09-06T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

const districtRow = {
  id: 'district-1',
  slug: 'hy-alrjl',
  name_ar: 'حي الرجل',
  sort_order: 1,
  is_active: true,
};

const catalogCategoryRow = {
  id: 'cat-1',
  district_id: 'district-1',
  slug: 'anaya-whlaqa',
  name_ar: 'عناية وحلاقة',
  sort_order: 1,
};

const catalogSubcategoryRow = {
  id: 'sub-1',
  category_id: 'cat-1',
  slug: 'shfrat-wmakynat-hlaqa',
  name_ar: 'شفرات وماكينات حلاقة',
  sort_order: 1,
};

describe('CatalogRepository.findProductsByIds', () => {
  it('يعيد مصفوفة فارغة بلا نداء قاعدة بيانات عند مصفوفة معرّفات فارغة', async () => {
    const result = await catalogRepository.findProductsByIds([]);

    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('يجلب المنتجات النشطة فقط عبر .in(id) و.eq(is_active, true)', async () => {
    const builder = makeQueryBuilder({ data: [productRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findProductsByIds(['prod-1']);

    expect(supabase.from).toHaveBeenCalledWith('products');
    expect(builder.in).toHaveBeenCalledWith('id', ['prod-1']);
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'prod-1', name: 'منتج اختبار', basePrice: 10 });
  });

  it('يرمي الخطأ إن أعاده Supabase', async () => {
    const builder = makeQueryBuilder({ data: null, error: new Error('db error') });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    await expect(catalogRepository.findProductsByIds(['prod-1'])).rejects.toThrow('db error');
  });
});

// ============================================================================
// شجرة التصنيف الجديدة (TASK-18) — حي → قسم رئيسي → قسم فرعي. نفس نمط findProductsByIds أعلاه
// (تمويه عميل supabase مباشرة عبر makeQueryBuilder الموسَّع بـorder/maybeSingle).
// ============================================================================
describe('CatalogRepository — شجرة التصنيف الجديدة (TASK-18)', () => {
  it('findDistricts يستعلم catalog_districts، يفلتر is_active، يرتّب بـsort_order', async () => {
    const builder = makeQueryBuilder({ data: [districtRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findDistricts();

    expect(supabase.from).toHaveBeenCalledWith('catalog_districts');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(builder.order).toHaveBeenCalledWith('sort_order');
    expect(result).toEqual([{ id: 'district-1', slug: 'hy-alrjl', nameAr: 'حي الرجل', sortOrder: 1, isActive: true }]);
  });

  it('findDistrictBySlug يعيد null إن لم يوجد صف', async () => {
    const builder = makeQueryBuilder({ data: null, error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findDistrictBySlug('missing-slug');

    expect(builder.eq).toHaveBeenCalledWith('slug', 'missing-slug');
    expect(result).toBeNull();
  });

  it('findCategoriesForDistrict يفلتر بـdistrict_id ويرتّب بـsort_order', async () => {
    const builder = makeQueryBuilder({ data: [catalogCategoryRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findCategoriesForDistrict('district-1');

    expect(supabase.from).toHaveBeenCalledWith('catalog_categories');
    expect(builder.eq).toHaveBeenCalledWith('district_id', 'district-1');
    expect(result).toEqual([{ id: 'cat-1', districtId: 'district-1', slug: 'anaya-whlaqa', nameAr: 'عناية وحلاقة', sortOrder: 1 }]);
  });

  it('findCatalogCategoryBySlug يفلتر بـdistrict_id وslug معاً', async () => {
    const builder = makeQueryBuilder({ data: catalogCategoryRow, error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findCatalogCategoryBySlug('district-1', 'anaya-whlaqa');

    expect(builder.eq).toHaveBeenCalledWith('district_id', 'district-1');
    expect(builder.eq).toHaveBeenCalledWith('slug', 'anaya-whlaqa');
    expect(result?.id).toBe('cat-1');
  });

  it('findSubcategoriesForCategory يفلتر بـcategory_id ويرتّب بـsort_order', async () => {
    const builder = makeQueryBuilder({ data: [catalogSubcategoryRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findSubcategoriesForCategory('cat-1');

    expect(supabase.from).toHaveBeenCalledWith('catalog_subcategories');
    expect(builder.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    expect(result).toEqual([
      { id: 'sub-1', categoryId: 'cat-1', slug: 'shfrat-wmakynat-hlaqa', nameAr: 'شفرات وماكينات حلاقة', sortOrder: 1 },
    ]);
  });

  it('findCatalogSubcategoryBySlug يفلتر بـcategory_id وslug معاً', async () => {
    const builder = makeQueryBuilder({ data: catalogSubcategoryRow, error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findCatalogSubcategoryBySlug('cat-1', 'shfrat-wmakynat-hlaqa');

    expect(builder.eq).toHaveBeenCalledWith('category_id', 'cat-1');
    expect(builder.eq).toHaveBeenCalledWith('slug', 'shfrat-wmakynat-hlaqa');
    expect(result?.id).toBe('sub-1');
  });

  it('findProductsByCatalogCategory يفلتر بـcatalog_category_id وis_active=true', async () => {
    const builder = makeQueryBuilder({ data: [productRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findProductsByCatalogCategory('cat-1');

    expect(supabase.from).toHaveBeenCalledWith('products');
    expect(builder.eq).toHaveBeenCalledWith('catalog_category_id', 'cat-1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(result).toHaveLength(1);
  });

  it('findProductsByCatalogSubcategory يفلتر بـcatalog_subcategory_id وis_active=true', async () => {
    const builder = makeQueryBuilder({ data: [productRow], error: null });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    const result = await catalogRepository.findProductsByCatalogSubcategory('sub-1');

    expect(builder.eq).toHaveBeenCalledWith('catalog_subcategory_id', 'sub-1');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(result).toHaveLength(1);
  });

  it('يرمي الخطأ إن أعاده Supabase (findDistricts)', async () => {
    const builder = makeQueryBuilder({ data: null, error: new Error('db error') });
    vi.mocked(supabase.from).mockReturnValue(builder as never);

    await expect(catalogRepository.findDistricts()).rejects.toThrow('db error');
  });

  // STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — is_active على
  // catalog_categories/catalog_subcategories وجدول catalog_node_product_links جديدون، يُطبَّقان يدوياً
  // (لا نظام Migrations رسمي). هذه المجموعة تثبّت أن findCategoriesForDistrict/
  // findSubcategoriesForCategory/findProductsByCatalogSubcategory تتدهور بلطف (Graceful degradation)
  // بدل كسر الصفحة كاملة، لو نُشِر هذا الكود قبل تطبيق السكربت يدوياً على بيئة معيَّنة — تحقَّقتُ من
  // كود الخطأ الفعلي حياً (42703 لعمود غير موجود، PGRST205 لجدول غير موجود) قبل كتابة هذا الاختبار.
  describe('التدهور اللطيف عند غياب schema الجديد (is_active/catalog_node_product_links) مؤقتاً', () => {
    it('findCategoriesForDistrict يتراجع لاستعلام بلا is_active عند 42703، ويُعامِل كل الصفوف كنشطة', async () => {
      const failing = makeQueryBuilder({ data: null, error: { code: '42703', message: 'column catalog_categories.is_active does not exist' } });
      const fallback = makeQueryBuilder({ data: [catalogCategoryRow], error: null });
      vi.mocked(supabase.from).mockReturnValueOnce(failing as never).mockReturnValueOnce(fallback as never);

      const result = await catalogRepository.findCategoriesForDistrict('district-1');

      expect(result).toEqual([{ id: 'cat-1', districtId: 'district-1', slug: 'anaya-whlaqa', nameAr: 'عناية وحلاقة', sortOrder: 1, isActive: true }]);
    });

    it('findSubcategoriesForCategory يتراجع لاستعلام بلا is_active عند 42703', async () => {
      const failing = makeQueryBuilder({ data: null, error: { code: '42703', message: 'column catalog_subcategories.is_active does not exist' } });
      const fallback = makeQueryBuilder({ data: [catalogSubcategoryRow], error: null });
      vi.mocked(supabase.from).mockReturnValueOnce(failing as never).mockReturnValueOnce(fallback as never);

      const result = await catalogRepository.findSubcategoriesForCategory('cat-1');

      expect(result).toEqual([
        { id: 'sub-1', categoryId: 'cat-1', slug: 'shfrat-wmakynat-hlaqa', nameAr: 'شفرات وماكينات حلاقة', sortOrder: 1, isActive: true },
      ]);
    });

    it('findCategoriesForDistrict يرمي أي خطأ آخر غير 42703 كما هو، بلا تراجع صامت', async () => {
      const failing = makeQueryBuilder({ data: null, error: { code: '500', message: 'server error' } });
      vi.mocked(supabase.from).mockReturnValue(failing as never);

      await expect(catalogRepository.findCategoriesForDistrict('district-1')).rejects.toMatchObject({ code: '500' });
    });

    it('findProductsByCatalogSubcategory يتجاهل جانب العضوية عند PGRST205 (الجدول غير موجود بعد)، ويُرجع المنتجات المملوكة فقط', async () => {
      const ownedBuilder = makeQueryBuilder({ data: [productRow], error: null });
      const linkedBuilder = makeQueryBuilder({ data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.catalog_node_product_links'" } });
      vi.mocked(supabase.from).mockImplementation((table: string) => (table === 'products' ? ownedBuilder : linkedBuilder) as never);

      const result = await catalogRepository.findProductsByCatalogSubcategory('sub-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('prod-1');
    });
  });
});
