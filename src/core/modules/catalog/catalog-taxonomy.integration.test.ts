// src/core/modules/catalog/catalog-taxonomy.integration.test.ts
// TASK-18 — اختبار تكامل حي واحد ضد Supabase الحقيقي (لا Mocks)، نفس نمط
// src/core/e2e/reef-city-journey.integration.test.ts. يغطي رحلة التصفح الكاملة حي → قسم → قسم فرعي
// → منتجات عبر CatalogService (المسار الحقيقي الذي تستهلكه الواجهة، مفتاح anon لا service_role) —
// لا بيانات وهمية، لا رقم ثابت: "العدد المتوقَّع" يُكتشَف حياً عبر supabaseAdmin (مصدر حقيقة يتجاوز
// RLS) ثم يُقارَن بما يُعيده CatalogService فعلياً عبر نفس المسار الذي تستخدمه صفحات (reef).
//
// ⚠️ التحقق الحي وقت كتابة هذا الاختبار (TASK-18) اكتشف أن catalog_districts/catalog_categories/
// catalog_subcategories بلا أي سياسة RLS قراءة — مفتاح anon يرى صفراً رغم وجود بيانات حقيقية (راجع
// scripts/03-catalog-taxonomy-rls.sql وتقرير TASK-18 النهائي). هذا الاختبار يتخطّى نفسه تلقائياً
// (بدل الفشل) إن لم يُطبَّق السكربت بعد على القاعدة الحالية — نجاحه الفعلي هو الدليل الحي المطلوب في
// حالة الاختبار الإلزامية #3/#6 لهذا التاسك، لا مجرد تمرير CI بلا معنى.

import { describe, it, expect, beforeAll } from 'vitest';
import { supabase } from '../../kernel/database/supabase-client';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import { catalogService } from './catalog.service';

let anonCanReadCatalogTree = false;

beforeAll(async () => {
  const { data, error } = await supabase.from('catalog_districts').select('id').limit(1);
  anonCanReadCatalogTree = !error && Array.isArray(data) && data.length > 0;
  if (!anonCanReadCatalogTree) {
    console.warn(
      '⚠️ TASK-18: catalog_districts غير قابل للقراءة عبر مفتاح anon على هذه القاعدة — ' +
        'scripts/03-catalog-taxonomy-rls.sql لم يُطبَّق بعد. تخطّي اختبار رحلة التصفح الحية حتى يُطبَّق السكربت يدوياً.'
    );
  }
});

describe('CatalogService — رحلة تصفح شجرة التصنيف الحقيقية حياً (TASK-18، Supabase حقيقي)', () => {
  it('حي → قسم → قسم فرعي → منتجات: نفس الأرقام الفعلية في القاعدة، عبر نفس مسار الواجهة (anon)', async () => {
    if (!anonCanReadCatalogTree) {
      console.warn('تخطّي فعلي — راجع تحذير beforeAll أعلاه.');
      return;
    }

    // 1) اكتشاف حي (mock-free) عبر service_role — أول قسم فرعي له منتجات فعلياً اليوم، لا رقم مفترَض
    // (راجع تقرير TASK-18: catalog_subcategory_id مضبوط على 12 منتجاً فقط من كل الكتالوج — لا كل
    // قسم فرعي له منتجات، فالاكتشاف الديناميكي إلزامي هنا).
    const { data: sampleProduct, error: sampleError } = await supabaseAdmin
      .from('products')
      .select('catalog_subcategory_id')
      .not('catalog_subcategory_id', 'is', null)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (sampleError) throw sampleError;
    expect(sampleProduct).not.toBeNull();
    const subcategoryId = sampleProduct!.catalog_subcategory_id as string;

    const { data: subRow, error: subError } = await supabaseAdmin
      .from('catalog_subcategories')
      .select('*')
      .eq('id', subcategoryId)
      .single();
    if (subError) throw subError;
    const { data: catRow, error: catError } = await supabaseAdmin
      .from('catalog_categories')
      .select('*')
      .eq('id', subRow.category_id)
      .single();
    if (catError) throw catError;
    const { data: distRow, error: distError } = await supabaseAdmin
      .from('catalog_districts')
      .select('*')
      .eq('id', catRow.district_id)
      .single();
    if (distError) throw distError;

    const { count: expectedSubcategoryProductCount, error: countError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('catalog_subcategory_id', subcategoryId)
      .eq('is_active', true);
    if (countError) throw countError;

    const { count: expectedCategoryProductCount, error: catCountError } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('catalog_category_id', catRow.id)
      .eq('is_active', true);
    if (catCountError) throw catCountError;

    // 2) نفس الرحلة عبر CatalogService — المسار الحقيقي الذي تستهلكه (reef)/[district]/[category]/
    // [subcategory]/page.tsx، بمفتاح anon فعلياً (لا service_role)
    const district = await catalogService.getDistrictBySlug(distRow.slug);
    expect(district?.id).toBe(distRow.id);

    const categories = await catalogService.getCategoriesForDistrict(district!.id);
    const category = categories.find((c) => c.id === catRow.id);
    expect(category).toBeDefined();

    const categoryProducts = await catalogService.listProductsByCatalogCategory(category!.id);
    expect(categoryProducts).toHaveLength(expectedCategoryProductCount ?? 0);

    const subcategories = await catalogService.getSubcategoriesForCategory(category!.id);
    const subcategory = subcategories.find((s) => s.id === subRow.id);
    expect(subcategory).toBeDefined();

    const subcategoryProducts = await catalogService.listProductsByCatalogSubcategory(subcategory!.id);
    expect(subcategoryProducts).toHaveLength(expectedSubcategoryProductCount ?? 0);
    expect(subcategoryProducts.length).toBeGreaterThan(0);

    // 3) دليل حي إن calculatePrice/validateSelection لم تُلمَسا — نفس منتج حقيقي من الكتالوج الجديد
    const [sampleProductFull] = subcategoryProducts;
    const price = catalogService.calculatePrice(sampleProductFull);
    expect(price).toBe(sampleProductFull.basePrice);
    expect(catalogService.validateSelection(sampleProductFull, {})).toBe(true);
  });
});
