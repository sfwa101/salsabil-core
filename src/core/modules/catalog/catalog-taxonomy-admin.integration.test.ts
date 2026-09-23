// src/core/modules/catalog/catalog-taxonomy-admin.integration.test.ts
// STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — اختبار تكامل حي ضد Supabase حقيقي
// (نفس نمط catalog-taxonomy.integration.test.ts) لسلوك الإدارة الجديد: حذف محروس، إخفاء عند
// category/subcategory (يتطلَّب عمود is_active الجديد)، عضوية عقدة عامة (يتطلَّب
// catalog_node_product_links الجديد)، رفض slug مكرَّر. كل صف يُنشئه هذا الاختبار يُنظَّف في afterAll —
// صفر أثر دائم على البيئة.
//
// ⚠️ نفس تحذير الملف الأصلي: عمود is_active على catalog_categories/catalog_subcategories وجدولا
// catalog_node_product_links/catalog_node_post_links مكتوبون في scripts/2026-09-23-founder-taxonomy-
// foundation.sql لكن **لم يُطبَّقا يدوياً بعد على أي بيئة** (تحقَّقتُ حياً: dev وstaging كلاهما بلا هذا
// العمود وقت كتابة هذا الاختبار) — لا اتصال Postgres مباشر متاح لتطبيقه من الكود، والتطبيق يدوي عبر
// SQL Editor حصراً (docs/DATABASE.md §8). هذا الاختبار يتخطّى نفسه تلقائياً (بدل الفشل) حتى يُطبَّق.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabaseAdmin } from '../../kernel/database/supabase-admin-client';
import { catalogService } from './catalog.service';

const actor = { id: 'test-admin', role: 'platform_admin' as const };
let schemaReady = false;
let districtId: string;
let categoryId: string;

beforeAll(async () => {
  const { error } = await supabaseAdmin.from('catalog_categories').select('is_active').limit(1);
  schemaReady = !error;
  if (!schemaReady) {
    console.warn(
      '⚠️ FOUNDER-TAXONOMY-FOUNDATION: catalog_categories.is_active غير موجود بعد على هذه القاعدة — ' +
        'scripts/2026-09-23-founder-taxonomy-foundation.sql لم يُطبَّق يدوياً بعد. تخطّي اختبارات الإدارة الجديدة حتى يُطبَّق.'
    );
    return;
  }

  const district = await catalogService.createDistrict(
    { slug: `test-admin-district-${Date.now()}`, nameAr: 'حي اختبار مؤقت', sortOrder: 999 },
    actor
  );
  districtId = district.id;
  const category = await catalogService.createCatalogCategory(
    { districtId, slug: `test-admin-category-${Date.now()}`, nameAr: 'قسم اختبار مؤقت', sortOrder: 1 },
    actor
  );
  categoryId = category.id;
});

afterAll(async () => {
  if (!schemaReady) return;
  // ترتيب الحذف من الأسفل للأعلى — أي صف تبقّى (فرعي أُنشئ داخل اختبار فشل مبكراً) يُحذَف أولاً.
  await supabaseAdmin.from('catalog_subcategories').delete().eq('category_id', categoryId);
  await supabaseAdmin.from('catalog_categories').delete().eq('id', categoryId);
  await supabaseAdmin.from('catalog_districts').delete().eq('id', districtId);
});

describe('CatalogService — إدارة التصنيف الجديدة (حذف محروس، إخفاء، عضوية عقدة)', () => {
  it('إخفاء قسم فرعي (isActive=false) يستبعده من القراءة العامة، والقراءة الإدارية تراه', async () => {
    if (!schemaReady) return;
    const sub = await catalogService.createCatalogSubcategory(
      { categoryId, slug: `test-sub-${Date.now()}`, nameAr: 'قسم فرعي اختبار', sortOrder: 1 },
      actor
    );
    await catalogService.updateCatalogSubcategory(sub.id, { nameAr: sub.nameAr, sortOrder: sub.sortOrder, isActive: false }, actor);

    const publicList = await catalogService.getSubcategoriesForCategory(categoryId);
    expect(publicList.find((s) => s.id === sub.id)).toBeUndefined();

    const adminList = await catalogService.listAllSubcategoriesForAdmin(categoryId);
    const adminRow = adminList.find((s) => s.id === sub.id);
    expect(adminRow).toBeDefined();
    expect(adminRow!.isActive).toBe(false);

    await supabaseAdmin.from('catalog_subcategories').delete().eq('id', sub.id);
  });

  it('حذف قسم رئيسي مرجعي (له قسم فرعي) يُرفَض صراحة، بلا حذف فعلي', async () => {
    if (!schemaReady) return;
    const sub = await catalogService.createCatalogSubcategory(
      { categoryId, slug: `test-sub-guard-${Date.now()}`, nameAr: 'قسم فرعي يحرس أباه', sortOrder: 2 },
      actor
    );

    const result = await catalogService.deleteCatalogCategory(categoryId, actor);

    expect(result).toEqual({ deleted: false, reason: expect.stringContaining('1') });
    const { data: stillExists } = await supabaseAdmin.from('catalog_categories').select('id').eq('id', categoryId).maybeSingle();
    expect(stillExists).not.toBeNull();

    await supabaseAdmin.from('catalog_subcategories').delete().eq('id', sub.id);
  });

  it('حذف قسم فرعي بلا أي مرجعية ينجح فعلياً', async () => {
    if (!schemaReady) return;
    const sub = await catalogService.createCatalogSubcategory(
      { categoryId, slug: `test-sub-safe-delete-${Date.now()}`, nameAr: 'قسم فرعي بلا مرجعية', sortOrder: 3 },
      actor
    );

    const result = await catalogService.deleteCatalogSubcategory(sub.id, actor);

    expect(result).toEqual({ deleted: true });
    const { data: gone } = await supabaseAdmin.from('catalog_subcategories').select('id').eq('id', sub.id).maybeSingle();
    expect(gone).toBeNull();
  });

  it('slug مكرَّر تحت نفس القسم الرئيسي يُرفَض برسالة مفهومة', async () => {
    if (!schemaReady) return;
    const sharedSlug = `test-dup-${Date.now()}`;
    const first = await catalogService.createCatalogSubcategory({ categoryId, slug: sharedSlug, nameAr: 'الأول', sortOrder: 4 }, actor);

    await expect(catalogService.createCatalogSubcategory({ categoryId, slug: sharedSlug, nameAr: 'الثاني', sortOrder: 5 }, actor)).rejects.toThrow('مستخدَم بالفعل');

    await supabaseAdmin.from('catalog_subcategories').delete().eq('id', first.id);
  });

  it('عضوية عامة: منتج مربوط بقسم فرعي عبر catalog_node_product_links يظهر في نتائج ذلك القسم بلا تكرار صف المنتج', async () => {
    if (!schemaReady) return;
    const { error: nodeLinksError } = await supabaseAdmin.from('catalog_node_product_links').select('*').limit(1);
    if (nodeLinksError) return; // نفس تحذير schemaReady — لا فشل، تخطٍّ فقط (الجدول غير موجود بعد)

    const { data: anyProduct } = await supabaseAdmin.from('products').select('id').eq('is_active', true).limit(1).maybeSingle();
    if (!anyProduct) return; // لا منتجات على هذه البيئة أصلاً — لا معنى للاختبار هنا

    const sub = await catalogService.createCatalogSubcategory(
      { categoryId, slug: `test-membership-${Date.now()}`, nameAr: 'قسم فرعي عضوية', sortOrder: 6 },
      actor
    );

    await catalogService.linkProductToNode({ catalogSubcategoryId: sub.id, productId: (anyProduct as { id: string }).id }, actor);
    const products = await catalogService.listProductsByCatalogSubcategory(sub.id);

    expect(products.map((p) => p.id)).toContain((anyProduct as { id: string }).id);
    expect(products.filter((p) => p.id === (anyProduct as { id: string }).id)).toHaveLength(1);

    await supabaseAdmin.from('catalog_node_product_links').delete().eq('catalog_subcategory_id', sub.id);
    await supabaseAdmin.from('catalog_subcategories').delete().eq('id', sub.id);
  });
});
