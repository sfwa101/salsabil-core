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
  },
}));

vi.mock('../audit/audit.service', () => ({
  auditService: {
    log: vi.fn(),
  },
}));

const { catalogService } = await import('./catalog.service');
const { catalogRepository } = await import('./catalog.repository');
const { auditService } = await import('../audit/audit.service');

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
