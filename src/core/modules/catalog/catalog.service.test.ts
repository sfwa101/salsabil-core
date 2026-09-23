// src/core/modules/catalog/catalog.service.test.ts
// اختبار وحدة لـ CatalogService — TASK-06 (DD-004، منطق مالي، Guardian: DEEP).
// يغطي: getProductsByIds (موجود سابقاً، اليوم 27/BAYAN-HOME-FEED-001)، validateSelection،
// calculatePrice، وتعاقب سعر العنصر الرئيسي (updateMasterItemPrice cascade، راجع ADR-031).
// لا تعديل على catalog.service.ts في هذه المهمة — اختبارات فقط.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AddonOption, MasterCatalogItem, Product, ProductSelection, SizeOption } from './types';
import type { UserRole } from '../../kernel/khalil/types';

vi.mock('./catalog.repository', () => ({
  catalogRepository: {
    findProductsByIds: vi.fn(),
    findMasterItemById: vi.fn(),
    updateMasterItemBasePrice: vi.fn(),
    cascadeBasePriceToLinkedProducts: vi.fn(),
    findDistricts: vi.fn(),
    findDistrictBySlug: vi.fn(),
    findCategoriesForDistrict: vi.fn(),
    findCatalogCategoryBySlug: vi.fn(),
    findSubcategoriesForCategory: vi.fn(),
    findCatalogSubcategoryBySlug: vi.fn(),
    findProductsByCatalogCategory: vi.fn(),
    findProductsByCatalogSubcategory: vi.fn(),
    findPurchasableProducts: vi.fn(),
    searchMasterItemsByName: vi.fn(),
    findProductsByTenant: vi.fn(),
    findProductById: vi.fn(),
    findTenantProductByMasterItem: vi.fn(),
    insertProductFromMaster: vi.fn(),
    findAllDistrictsForAdmin: vi.fn(),
    insertDistrict: vi.fn(),
    updateDistrict: vi.fn(),
    countCategoriesForDistrict: vi.fn(),
    deleteDistrict: vi.fn(),
    findAllCategoriesForAdmin: vi.fn(),
    insertCatalogCategory: vi.fn(),
    updateCatalogCategory: vi.fn(),
    moveCatalogCategory: vi.fn(),
    countSubcategoriesForCategory: vi.fn(),
    deleteCatalogCategory: vi.fn(),
    findAllSubcategoriesForAdmin: vi.fn(),
    insertCatalogSubcategory: vi.fn(),
    updateCatalogSubcategory: vi.fn(),
    findCatalogCategoryById: vi.fn(),
    moveCatalogSubcategory: vi.fn(),
    countProductsOwningCatalogSubcategory: vi.fn(),
    countMembershipsForCatalogSubcategory: vi.fn(),
    deleteCatalogSubcategory: vi.fn(),
    linkProductToNode: vi.fn(),
    unlinkProductFromNode: vi.fn(),
    listLinkedProductsForNode: vi.fn(),
    linkPostToNode: vi.fn(),
    unlinkPostFromNode: vi.fn(),
    listLinkedPostIdsForNode: vi.fn(),
  },
}));

vi.mock('../audit/audit.service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

vi.mock('../merchant/merchant.service', () => ({
  merchantService: {
    listAll: vi.fn(async () => []),
  },
}));

vi.mock('../inventory/inventory.service', () => ({
  inventoryService: {
    setStockForImport: vi.fn(),
  },
}));

const { catalogService } = await import('./catalog.service');
const { catalogRepository } = await import('./catalog.repository');
const { auditService } = await import('../audit/audit.service');
const { merchantService } = await import('../merchant/merchant.service');
const { inventoryService } = await import('../inventory/inventory.service');

const product: Product = {
  id: 'prod-1',
  categoryId: 'cat-1',
  tenantId: null,
  name: 'منتج اختبار',
  basePrice: 10,
  unit: 'قطعة',
  options: [],
  isActive: true,
  createdAt: '2026-09-06T00:00:00.000Z',
};

const sizeOption: SizeOption = { id: 'size-1', type: 'size', label: 'كبير', priceModifier: 5 };
const addonOption1: AddonOption = { id: 'addon-1', type: 'addon', label: 'إضافة 1', priceModifier: 2 };
const addonOption2: AddonOption = { id: 'addon-2', type: 'addon', label: 'إضافة 2', priceModifier: 3 };

function withOptions(options: Product['options']): Product {
  return { ...product, options };
}

const actor = { id: 'admin-1', role: 'platform_admin' as UserRole };

const masterItem: MasterCatalogItem = {
  id: 'master-1',
  categoryId: 'cat-1',
  name: 'أرز مصري 5 كجم',
  basePrice: 10,
  unit: 'كيس',
  isActive: true,
  createdAt: '2026-09-06T00:00:00.000Z',
  updatedAt: '2026-09-06T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CatalogService.getProductsByIds', () => {
  it('يفوّض إلى catalogRepository.findProductsByIds بنفس المعرّفات', async () => {
    vi.mocked(catalogRepository.findProductsByIds).mockResolvedValue([product]);

    const result = await catalogService.getProductsByIds(['prod-1']);

    expect(catalogRepository.findProductsByIds).toHaveBeenCalledWith(['prod-1']);
    expect(result).toEqual([product]);
  });
});

describe('CatalogService.validateSelection', () => {
  it('يقبل منتجاً بلا خيارات حجم إطلاقاً بدون إرسال sizeId', () => {
    const noSizeProduct = withOptions([]);

    expect(catalogService.validateSelection(noSizeProduct, {})).toBe(true);
  });

  it('يرفض منتجاً بخيارات حجم عند عدم إرسال sizeId', () => {
    const sizedProduct = withOptions([sizeOption]);

    expect(catalogService.validateSelection(sizedProduct, {})).toBe(false);
  });

  it('يرفض sizeId غير موجود أصلاً ضمن أحجام المنتج', () => {
    const sizedProduct = withOptions([sizeOption]);

    expect(catalogService.validateSelection(sizedProduct, { sizeId: 'no-such-size' })).toBe(false);
  });

  it(
    '[فجوة موثَّقة P2 — غير متماثلة، لا تُصلَح هنا] يقبل sizeId وهمياً لمنتج بلا خيارات حجم إطلاقاً، ' +
      'خلافاً لسلوك addonId الذي يُرفَض دائماً حتى بلا خيارات إضافات',
    () => {
      const noSizeProduct = withOptions([]);

      // هذا يثبت الفجوة غير المتماثلة المذكورة في التقرير (§20 P2): لا فحص على sizeOptions.length === 0
      // في catalog.service.ts، فيُقبَل أي sizeId وهمي صامتاً. calculatePrice لا يتأثر مالياً من هذه
      // الحالة تحديداً (لا يوجد خيار حجم مطابق فيُضاف 0)، لكن validateSelection نفسها ترجع true خطأً.
      expect(catalogService.validateSelection(noSizeProduct, { sizeId: 'ghost-size-id' })).toBe(true);
    }
  );

  it('يرفض addonId غير موجود دائماً — حتى لو لم توجد أي خيارات إضافات للمنتج (سلوك متماثل، بعكس sizeId)', () => {
    const noAddonProduct = withOptions([]);

    expect(catalogService.validateSelection(noAddonProduct, { addonIds: ['ghost-addon-id'] })).toBe(false);
  });

  it('يقبل إضافات صحيحة، بما فيها معرّف إضافة مكرَّر — لا فحص تكرار في الكود الحالي (سلوك فعلي، لا افتراض)', () => {
    const productWithAddons = withOptions([addonOption1, addonOption2]);

    expect(
      catalogService.validateSelection(productWithAddons, { addonIds: ['addon-1', 'addon-1'] })
    ).toBe(true);
  });
});

describe('CatalogService.calculatePrice', () => {
  it('يعيد السعر الأساسي فقط لمنتج بلا حجم ولا إضافات', () => {
    expect(catalogService.calculatePrice(product, {})).toBe(10);
  });

  it('يضيف priceModifier الخاص بالحجم المُختار إلى السعر الأساسي', () => {
    const sizedProduct = withOptions([sizeOption]);

    expect(catalogService.calculatePrice(sizedProduct, { sizeId: 'size-1' })).toBe(15);
  });

  it('يجمع priceModifier لعدة إضافات مع السعر الأساسي', () => {
    const productWithAddons = withOptions([addonOption1, addonOption2]);

    expect(
      catalogService.calculatePrice(productWithAddons, { addonIds: ['addon-1', 'addon-2'] })
    ).toBe(15); // 10 + 2 + 3
  });

  it('يحسب كل تكرار addonId على حدة بلا دمج (dedupe) — يوثّق السلوك الفعلي الحالي، لا افتراضاً', () => {
    const productWithAddons = withOptions([addonOption1]);

    expect(
      catalogService.calculatePrice(productWithAddons, { addonIds: ['addon-1', 'addon-1'] })
    ).toBe(14); // 10 + 2 + 2 — كل تكرار يُحسَب فعلياً، لا يُرفَض ولا يُدمَج
  });

  it('يرمي خطأً لاختيار غير صالح بدل حساب سعر لاختيار مرفوض', () => {
    const sizedProduct = withOptions([sizeOption]);

    expect(() => catalogService.calculatePrice(sizedProduct, { sizeId: 'no-such-size' })).toThrow();
  });

  it('[أمان مالي — DD-004] لا سعر يأتي أبداً من مدخلات العميل: أي حقل سعر مُدخَل ضمن selection يُتجاهَل كلياً', () => {
    const sizedProduct = withOptions([sizeOption]);
    const legitimateSelection: ProductSelection = { sizeId: 'size-1' };
    const expectedPrice = catalogService.calculatePrice(sizedProduct, legitimateSelection);

    // selection لا يملك نوعياً (types.ts) أي حقل سعر أصلاً — هذا محاكاة لمدخل عميل خبيث فعلي (طلب HTTP
    // متلاعَب به) يحاول حقن حقول سعر إضافية عبر JSON، لإثبات أن calculatePrice تتجاهلها فعلياً لا افتراضاً.
    const maliciousSelection = {
      sizeId: 'size-1',
      addonIds: [],
      price: 1,
      unitPrice: 1,
      basePrice: 1,
      total: 1,
      finalPrice: 0.01,
    } as unknown as ProductSelection;

    const actualPrice = catalogService.calculatePrice(sizedProduct, maliciousSelection);

    expect(actualPrice).toBe(expectedPrice);
    expect(actualPrice).not.toBe(1);
    expect(actualPrice).not.toBe(0.01);
  });
});

describe('CatalogService.updateMasterItemPrice — Master-Item Price Cascade (ADR-031)', () => {
  it(
    'يحدّث سعر العنصر الأساسي عبر catalogRepository.updateMasterItemBasePrice ثم يُسري السعر الجديد ' +
      'فوراً (تحديث صريح، لا قراءة حية) على كل صف منتج تاجر مرتبط بنفس المعرّف',
    async () => {
      vi.mocked(catalogRepository.findMasterItemById).mockResolvedValue({ ...masterItem, basePrice: 10 });
      vi.mocked(catalogRepository.updateMasterItemBasePrice).mockResolvedValue({ ...masterItem, basePrice: 15 });
      vi.mocked(catalogRepository.cascadeBasePriceToLinkedProducts).mockResolvedValue(3);

      const result = await catalogService.updateMasterItemPrice('master-1', 15, actor);

      expect(catalogRepository.updateMasterItemBasePrice).toHaveBeenCalledWith('master-1', 15);
      // نفس المعرّف بالضبط يُمرَّر لدالة الـcascade — هذا هو الدليل (على مستوى الخدمة) أن الإسراء
      // صريح ومربوط بمعرّف العنصر تحديداً، لا استعلاماً حياً عاماً. آلية الفلترة الفعلية في قاعدة
      // البيانات (`.eq('master_item_id', masterItemId)`) موثَّقة بفحص كود catalog.repository.ts:229-237
      // في التقرير (لا اختبار حي — خارج نطاق اختبارات الخدمة الوحدوية).
      expect(catalogRepository.cascadeBasePriceToLinkedProducts).toHaveBeenCalledWith('master-1', 15);
      expect(result.basePrice).toBe(15);
    }
  );

  it('يمرّر معرّف العنصر الأساسي المُحدَّث فقط لدالة الـcascade — لا يخلط معرّف عنصر آخر غير مرتبط', async () => {
    const masterA = { ...masterItem, id: 'master-A', basePrice: 8 };
    vi.mocked(catalogRepository.findMasterItemById).mockResolvedValue(masterA);
    vi.mocked(catalogRepository.updateMasterItemBasePrice).mockResolvedValue({ ...masterA, basePrice: 20 });
    vi.mocked(catalogRepository.cascadeBasePriceToLinkedProducts).mockResolvedValue(1);

    await catalogService.updateMasterItemPrice('master-A', 20, actor);

    expect(catalogRepository.cascadeBasePriceToLinkedProducts).toHaveBeenCalledTimes(1);
    expect(catalogRepository.cascadeBasePriceToLinkedProducts).toHaveBeenCalledWith('master-A', 20);
    expect(catalogRepository.cascadeBasePriceToLinkedProducts).not.toHaveBeenCalledWith('master-B', expect.anything());
  });

  it('يرمي خطأً ولا يُنفّذ أي تحديث سعر أو cascade أو تدقيق إن كان العنصر الأساسي غير موجود', async () => {
    vi.mocked(catalogRepository.findMasterItemById).mockResolvedValue(null);

    await expect(catalogService.updateMasterItemPrice('missing-id', 99, actor)).rejects.toThrow(
      'عنصر الكتالوج الأساسي غير موجود'
    );

    expect(catalogRepository.updateMasterItemBasePrice).not.toHaveBeenCalled();
    expect(catalogRepository.cascadeBasePriceToLinkedProducts).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('يسجّل السعر قبل/بعد وعدد المنتجات المتأثرة بالـcascade في سجل التدقيق', async () => {
    vi.mocked(catalogRepository.findMasterItemById).mockResolvedValue({ ...masterItem, basePrice: 10 });
    vi.mocked(catalogRepository.updateMasterItemBasePrice).mockResolvedValue({ ...masterItem, basePrice: 15 });
    vi.mocked(catalogRepository.cascadeBasePriceToLinkedProducts).mockResolvedValue(4);

    await catalogService.updateMasterItemPrice('master-1', 15, actor);

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'catalog.master_item_price_updated',
        entityType: 'catalog_master_item',
        entityId: 'master-1',
        metadata: expect.objectContaining({ before: 10, after: 15, linkedProductsUpdated: 4 }),
      })
    );
  });
});

// ============================================================================
// شجرة التصنيف الجديدة (TASK-18) — تفويض بسيط لـcatalogRepository، نفس نمط getProductsByIds
// أعلى الملف. لا منطق حساب هنا (calculatePrice/validateSelection بلا لمس، راجع تعليق أعلى الملف).
// ============================================================================
describe('CatalogService — شجرة التصنيف الجديدة (TASK-18، تفويض لـ catalogRepository)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getDistricts يفوّض لـ findDistricts', async () => {
    const districts = [{ id: 'd-1', slug: 'hy-alrjl', nameAr: 'حي الرجل', tagline: null, sortOrder: 1, isActive: true }];
    vi.mocked(catalogRepository.findDistricts).mockResolvedValue(districts);

    const result = await catalogService.getDistricts();

    expect(catalogRepository.findDistricts).toHaveBeenCalled();
    expect(result).toBe(districts);
  });

  it('getDistrictBySlug يفوّض لـ findDistrictBySlug بنفس الـslug', async () => {
    vi.mocked(catalogRepository.findDistrictBySlug).mockResolvedValue(null);

    await catalogService.getDistrictBySlug('hy-alrjl');

    expect(catalogRepository.findDistrictBySlug).toHaveBeenCalledWith('hy-alrjl');
  });

  it('getCategoriesForDistrict يفوّض لـ findCategoriesForDistrict بنفس districtId', async () => {
    vi.mocked(catalogRepository.findCategoriesForDistrict).mockResolvedValue([]);

    await catalogService.getCategoriesForDistrict('d-1');

    expect(catalogRepository.findCategoriesForDistrict).toHaveBeenCalledWith('d-1');
  });

  it('getCategoryBySlugInDistrict يفوّض لـ findCatalogCategoryBySlug بنفس districtId/slug', async () => {
    vi.mocked(catalogRepository.findCatalogCategoryBySlug).mockResolvedValue(null);

    await catalogService.getCategoryBySlugInDistrict('d-1', 'anaya-whlaqa');

    expect(catalogRepository.findCatalogCategoryBySlug).toHaveBeenCalledWith('d-1', 'anaya-whlaqa');
  });

  it('getSubcategoriesForCategory يفوّض لـ findSubcategoriesForCategory بنفس categoryId', async () => {
    vi.mocked(catalogRepository.findSubcategoriesForCategory).mockResolvedValue([]);

    await catalogService.getSubcategoriesForCategory('cat-1');

    expect(catalogRepository.findSubcategoriesForCategory).toHaveBeenCalledWith('cat-1');
  });

  it('getSubcategoryBySlugInCategory يفوّض لـ findCatalogSubcategoryBySlug بنفس categoryId/slug', async () => {
    vi.mocked(catalogRepository.findCatalogSubcategoryBySlug).mockResolvedValue(null);

    await catalogService.getSubcategoryBySlugInCategory('cat-1', 'shfrat-wmakynat-hlaqa');

    expect(catalogRepository.findCatalogSubcategoryBySlug).toHaveBeenCalledWith('cat-1', 'shfrat-wmakynat-hlaqa');
  });

  it('listProductsByCatalogCategory يفوّض لـ findProductsByCatalogCategory بنفس categoryId', async () => {
    vi.mocked(catalogRepository.findProductsByCatalogCategory).mockResolvedValue([]);

    await catalogService.listProductsByCatalogCategory('cat-1');

    expect(catalogRepository.findProductsByCatalogCategory).toHaveBeenCalledWith('cat-1');
  });

  it('listProductsByCatalogSubcategory يفوّض لـ findProductsByCatalogSubcategory بنفس subcategoryId', async () => {
    vi.mocked(catalogRepository.findProductsByCatalogSubcategory).mockResolvedValue([]);

    await catalogService.listProductsByCatalogSubcategory('sub-1');

    expect(catalogRepository.findProductsByCatalogSubcategory).toHaveBeenCalledWith('sub-1');
  });
});

describe('CatalogService.listPurchasableProducts', () => {
  // §31 بند 3 — رف "منتجات حقيقية" على الرئيسية، مستقل عن مسار بيان. يستبعد صراحة تاجر العرض
  // التجريبي poultry-test (موجود فعلياً على staging بـtenant_id حقيقي و41 منتجاً is_active=true —
  // كان سيتسرَّب لهذا الرف بلا استبعاد صريح، راجع سجل البناء الليلي 2026-09-20 بند 3).
  it('يستبعد منتجات تاجر poultry-test حتى لو كانت is_active بـtenant_id حقيقي', async () => {
    const realProduct = withOptions([]); // tenantId: null افتراضياً — نموّه هنا بمعرّف حقيقي أدناه
    const demoProduct: Product = { ...product, id: 'prod-demo', tenantId: 'demo-tenant-id', name: 'منتج poultry-test وهمي' };
    const legitProduct: Product = { ...product, id: 'prod-real', tenantId: 'real-tenant-id', name: 'منتج تاجر حقيقي' };
    vi.mocked(catalogRepository.findPurchasableProducts).mockResolvedValue([demoProduct, legitProduct]);
    vi.mocked(merchantService.listAll).mockResolvedValue([
      { id: 'demo-tenant-id', ownerId: 'o1', businessName: 'محل تجريبي', phone: '010', slug: 'poultry-test', commissionRate: 0, isActive: true, createdAt: '', defaultSettlementModel: null },
      { id: 'real-tenant-id', ownerId: 'o2', businessName: 'محل حقيقي', phone: '011', slug: 'pilot-merchant-01', commissionRate: 0, isActive: true, createdAt: '', defaultSettlementModel: null },
    ]);
    void realProduct;

    const result = await catalogService.listPurchasableProducts(10);

    expect(result).toEqual([legitProduct]);
    expect(catalogRepository.findPurchasableProducts).toHaveBeenCalledWith(40); // limit × FETCH_BUFFER_MULTIPLIER (4)
  });

  it('لا يستبعد شيئاً لو لم يوجد تاجر بـslug poultry-test على هذه البيئة', async () => {
    const legitProduct: Product = { ...product, id: 'prod-real', tenantId: 'real-tenant-id' };
    vi.mocked(catalogRepository.findPurchasableProducts).mockResolvedValue([legitProduct]);
    vi.mocked(merchantService.listAll).mockResolvedValue([]);

    const result = await catalogService.listPurchasableProducts(5);

    expect(result).toEqual([legitProduct]);
  });

  it('يقتصر على limit المطلوب بعد الاستبعاد', async () => {
    const products: Product[] = Array.from({ length: 5 }, (_, i) => ({ ...product, id: `prod-${i}`, tenantId: `tenant-${i}` }));
    vi.mocked(catalogRepository.findPurchasableProducts).mockResolvedValue(products);
    vi.mocked(merchantService.listAll).mockResolvedValue([]);

    const result = await catalogService.listPurchasableProducts(2);

    expect(result).toHaveLength(2);
  });
});

describe('CatalogService.searchMasterItems (§31 بند 5)', () => {
  it('يفوّض لـ searchMasterItemsByName بعد trim، بلا استعلام لنص فارغ', async () => {
    vi.mocked(catalogRepository.searchMasterItemsByName).mockResolvedValue([masterItem]);

    const result = await catalogService.searchMasterItems('  أرز  ');

    expect(catalogRepository.searchMasterItemsByName).toHaveBeenCalledWith('أرز');
    expect(result).toEqual([masterItem]);
  });

  it('يعيد مصفوفة فارغة لنص بحث فارغ بلا استدعاء المستودع', async () => {
    const result = await catalogService.searchMasterItems('   ');

    expect(result).toEqual([]);
    expect(catalogRepository.searchMasterItemsByName).not.toHaveBeenCalled();
  });
});

describe('CatalogService.addMerchantOfferFromMasterItem (§31 بند 5)', () => {
  it('يرفض كمية سالبة قبل أي قراءة/كتابة', async () => {
    await expect(catalogService.addMerchantOfferFromMasterItem('tenant-a', 'master-1', -1, 5, actor)).rejects.toThrow('الكمية');
    expect(catalogRepository.findMasterItemById).not.toHaveBeenCalled();
  });

  it('يرفض سعر توريد سالب قبل أي قراءة/كتابة', async () => {
    await expect(catalogService.addMerchantOfferFromMasterItem('tenant-a', 'master-1', 5, -1, actor)).rejects.toThrow('سعر التوريد');
    expect(catalogRepository.findMasterItemById).not.toHaveBeenCalled();
  });

  it('يرفض عنصر كتالوج أساسي غير موجود', async () => {
    vi.mocked(catalogRepository.findMasterItemById).mockResolvedValue(null);

    await expect(catalogService.addMerchantOfferFromMasterItem('tenant-a', 'missing', 5, 5, actor)).rejects.toThrow('غير موجود');
  });

  it('ينشئ منتج تاجر جديد من العنصر الأساسي، يضبط المخزون، ويسجّل تدقيقاً — لو لم يكن للتاجر منتج مرتبط بهذا العنصر بعد', async () => {
    vi.mocked(catalogRepository.findMasterItemById).mockResolvedValue(masterItem);
    vi.mocked(catalogRepository.findTenantProductByMasterItem).mockResolvedValue(null);
    vi.mocked(catalogRepository.insertProductFromMaster).mockResolvedValue({ ...product, id: 'prod-new', tenantId: 'tenant-a' });

    const result = await catalogService.addMerchantOfferFromMasterItem('tenant-a', masterItem.id, 20, 8, actor);

    expect(catalogRepository.insertProductFromMaster).toHaveBeenCalledWith('tenant-a', masterItem);
    expect(inventoryService.setStockForImport).toHaveBeenCalledWith('prod-new', 20, 8);
    expect(result.id).toBe('prod-new');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalog.merchant_offer_added', entityId: 'prod-new', metadata: expect.objectContaining({ tenantId: 'tenant-a', quantity: 20, costPrice: 8 }) })
    );
  });

  it('يُحدِّث المخزون فقط (لا صف منتج جديد) لو كان للتاجر بالفعل منتج مرتبط بهذا العنصر', async () => {
    vi.mocked(catalogRepository.findMasterItemById).mockResolvedValue(masterItem);
    vi.mocked(catalogRepository.findTenantProductByMasterItem).mockResolvedValue({ ...product, id: 'prod-existing', tenantId: 'tenant-a' });

    await catalogService.addMerchantOfferFromMasterItem('tenant-a', masterItem.id, 30, 9, actor);

    expect(catalogRepository.insertProductFromMaster).not.toHaveBeenCalled();
    expect(inventoryService.setStockForImport).toHaveBeenCalledWith('prod-existing', 30, 9);
  });
});

describe('CatalogService.updateMerchantOfferStock (§31 بند 5)', () => {
  it('يرفض تعديل منتج لا يخص تاجر الطلب (عزل مستأجرين)', async () => {
    vi.mocked(catalogRepository.findProductById).mockResolvedValue({ ...product, id: 'prod-1', tenantId: 'tenant-other' });

    await expect(catalogService.updateMerchantOfferStock('tenant-a', 'prod-1', 5, 5, actor)).rejects.toThrow('لا يخص متجرك');
    expect(inventoryService.setStockForImport).not.toHaveBeenCalled();
  });

  it('يرفض منتجاً غير موجود إطلاقاً', async () => {
    vi.mocked(catalogRepository.findProductById).mockResolvedValue(null);

    await expect(catalogService.updateMerchantOfferStock('tenant-a', 'missing', 5, 5, actor)).rejects.toThrow('لا يخص متجرك');
  });

  it('يضبط المخزون ويسجّل تدقيقاً لمنتج يخص التاجر فعلاً', async () => {
    vi.mocked(catalogRepository.findProductById).mockResolvedValue({ ...product, id: 'prod-1', tenantId: 'tenant-a' });

    await catalogService.updateMerchantOfferStock('tenant-a', 'prod-1', 12, 6, actor);

    expect(inventoryService.setStockForImport).toHaveBeenCalledWith('prod-1', 12, 6);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'catalog.merchant_offer_updated', entityId: 'prod-1', metadata: expect.objectContaining({ tenantId: 'tenant-a', quantity: 12, costPrice: 6 }) })
    );
  });
});

// §31 بند 8 — إدارة تصنيفات/أحياء من لوحة الإدارة
describe('CatalogService — إدارة شجرة التصنيف (§31 بند 8)', () => {
  const district = { id: 'district-1', slug: 'nasr-city', nameAr: 'مدينة نصر', tagline: null, sortOrder: 1, isActive: true };
  const category = { id: 'cat-1', districtId: 'district-1', slug: 'daily-food', nameAr: 'أطعمة يومية', sortOrder: 1, isActive: true };
  const subcategory = { id: 'sub-1', categoryId: 'cat-1', slug: 'dairy', nameAr: 'ألبان', sortOrder: 1, isActive: true };

  it('listAllDistrictsForAdmin يفوّض لـ findAllDistrictsForAdmin', async () => {
    vi.mocked(catalogRepository.findAllDistrictsForAdmin).mockResolvedValue([district]);

    const result = await catalogService.listAllDistrictsForAdmin();

    expect(result).toEqual([district]);
  });

  it('createDistrict ينشئ حياً ويسجّل تدقيقاً', async () => {
    vi.mocked(catalogRepository.insertDistrict).mockResolvedValue(district);

    const result = await catalogService.createDistrict({ slug: 'nasr-city', nameAr: 'مدينة نصر', sortOrder: 1 }, actor);

    expect(result).toEqual(district);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.district_created', entityId: district.id }));
  });

  it('updateDistrict يُحدِّث ويسجّل تدقيقاً', async () => {
    vi.mocked(catalogRepository.updateDistrict).mockResolvedValue({ ...district, nameAr: 'اسم جديد' });

    const result = await catalogService.updateDistrict('district-1', { nameAr: 'اسم جديد', sortOrder: 2, isActive: false }, actor);

    expect(result.nameAr).toBe('اسم جديد');
    expect(catalogRepository.updateDistrict).toHaveBeenCalledWith('district-1', { nameAr: 'اسم جديد', sortOrder: 2, isActive: false });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.district_updated', entityId: 'district-1' }));
  });

  it('deleteDistrict يُرفَض لو له أقسام رئيسية تابعة، لا يستدعي الحذف الفعلي', async () => {
    vi.mocked(catalogRepository.countCategoriesForDistrict).mockResolvedValue(2);

    const result = await catalogService.deleteDistrict('district-1', actor);

    expect(result).toEqual({ deleted: false, reason: expect.stringContaining('2') });
    expect(catalogRepository.deleteDistrict).not.toHaveBeenCalled();
  });

  it('deleteDistrict ينفّذ الحذف الفعلي ويسجّل تدقيقاً لو بلا أقسام تابعة', async () => {
    vi.mocked(catalogRepository.countCategoriesForDistrict).mockResolvedValue(0);

    const result = await catalogService.deleteDistrict('district-1', actor);

    expect(result).toEqual({ deleted: true });
    expect(catalogRepository.deleteDistrict).toHaveBeenCalledWith('district-1');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.district_deleted', entityId: 'district-1' }));
  });

  it('createCatalogCategory ينشئ حياً ويسجّل تدقيقاً', async () => {
    vi.mocked(catalogRepository.insertCatalogCategory).mockResolvedValue(category);

    const result = await catalogService.createCatalogCategory({ districtId: 'district-1', slug: 'daily-food', nameAr: 'أطعمة يومية', sortOrder: 1 }, actor);

    expect(result).toEqual(category);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.category_created', entityId: category.id }));
  });

  it('updateCatalogCategory يُحدِّث ويسجّل تدقيقاً', async () => {
    vi.mocked(catalogRepository.updateCatalogCategory).mockResolvedValue({ ...category, sortOrder: 3 });

    const result = await catalogService.updateCatalogCategory('cat-1', { nameAr: 'أطعمة يومية', sortOrder: 3, isActive: true }, actor);

    expect(result.sortOrder).toBe(3);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.category_updated', entityId: 'cat-1' }));
  });

  it('moveCatalogCategory يرفض حياً هدفاً غير موجود قبل أي كتابة', async () => {
    vi.mocked(catalogRepository.findAllDistrictsForAdmin).mockResolvedValue([district]);

    await expect(catalogService.moveCatalogCategory('cat-1', 'missing-district', actor)).rejects.toThrow('غير موجود');
    expect(catalogRepository.moveCatalogCategory).not.toHaveBeenCalled();
  });

  it('moveCatalogCategory ينقل ويسجّل تدقيقاً لحي هدف موجود فعلاً', async () => {
    vi.mocked(catalogRepository.findAllDistrictsForAdmin).mockResolvedValue([district, { ...district, id: 'district-2', slug: 'other' }]);
    vi.mocked(catalogRepository.moveCatalogCategory).mockResolvedValue({ ...category, districtId: 'district-2' });

    const result = await catalogService.moveCatalogCategory('cat-1', 'district-2', actor);

    expect(result.districtId).toBe('district-2');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.category_moved', entityId: 'cat-1' }));
  });

  it('deleteCatalogCategory يُرفَض لو له أقسام فرعية تابعة', async () => {
    vi.mocked(catalogRepository.countSubcategoriesForCategory).mockResolvedValue(1);

    const result = await catalogService.deleteCatalogCategory('cat-1', actor);

    expect(result).toEqual({ deleted: false, reason: expect.stringContaining('1') });
    expect(catalogRepository.deleteCatalogCategory).not.toHaveBeenCalled();
  });

  it('createCatalogSubcategory ينشئ حياً ويسجّل تدقيقاً', async () => {
    vi.mocked(catalogRepository.insertCatalogSubcategory).mockResolvedValue(subcategory);

    const result = await catalogService.createCatalogSubcategory({ categoryId: 'cat-1', slug: 'dairy', nameAr: 'ألبان', sortOrder: 1 }, actor);

    expect(result).toEqual(subcategory);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.subcategory_created', entityId: subcategory.id }));
  });

  it('updateCatalogSubcategory يُحدِّث ويسجّل تدقيقاً', async () => {
    vi.mocked(catalogRepository.updateCatalogSubcategory).mockResolvedValue({ ...subcategory, nameAr: 'ألبان وأجبان' });

    const result = await catalogService.updateCatalogSubcategory('sub-1', { nameAr: 'ألبان وأجبان', sortOrder: 1, isActive: true }, actor);

    expect(result.nameAr).toBe('ألبان وأجبان');
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.subcategory_updated', entityId: 'sub-1' }));
  });

  it('deleteCatalogSubcategory يُرفَض لو له منتجات مملوكة أو عضويات', async () => {
    vi.mocked(catalogRepository.countProductsOwningCatalogSubcategory).mockResolvedValue(3);
    vi.mocked(catalogRepository.countMembershipsForCatalogSubcategory).mockResolvedValue(0);

    const result = await catalogService.deleteCatalogSubcategory('sub-1', actor);

    expect(result).toEqual({ deleted: false, reason: expect.stringContaining('3') });
    expect(catalogRepository.deleteCatalogSubcategory).not.toHaveBeenCalled();
  });

  it('deleteCatalogSubcategory ينفّذ الحذف الفعلي لو بلا منتجات مملوكة وبلا عضويات', async () => {
    vi.mocked(catalogRepository.countProductsOwningCatalogSubcategory).mockResolvedValue(0);
    vi.mocked(catalogRepository.countMembershipsForCatalogSubcategory).mockResolvedValue(0);

    const result = await catalogService.deleteCatalogSubcategory('sub-1', actor);

    expect(result).toEqual({ deleted: true });
    expect(catalogRepository.deleteCatalogSubcategory).toHaveBeenCalledWith('sub-1');
  });

  it('linkProductToNode يربط منتجاً كنسياً بقسم فرعي إضافي ويسجّل تدقيقاً — بلا إنشاء صف منتج جديد', async () => {
    await catalogService.linkProductToNode({ catalogSubcategoryId: 'sub-basket', productId: 'prod-1' }, actor);

    expect(catalogRepository.linkProductToNode).toHaveBeenCalledWith({ catalogSubcategoryId: 'sub-basket', productId: 'prod-1' });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'catalog.node_product_linked', entityId: 'sub-basket' }));
  });
});
