// src/core/modules/catalog/catalog.service.ts
// محرك حساب السعر والتحقق — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر catalogRepository

import { catalogRepository } from './catalog.repository';
import { inventoryService } from '../inventory/inventory.service';
import { auditService } from '../audit/audit.service';
import { normalizeProductName } from './text-normalize';
import type {
  Category,
  MasterCatalogItem,
  MerchantImportResult,
  MerchantImportRow,
  Product,
  ProductSelection,
  ReviewQueueItem,
} from './types';
import type { UserRole } from '../../kernel/khalil/types';

export class CatalogService {
  async listCategories(): Promise<Category[]> {
    return catalogRepository.findCategories();
  }

  async getCategoryBySlug(slug: string): Promise<Category | null> {
    return catalogRepository.findCategoryBySlug(slug);
  }

  async listProductsByCategory(categoryId: string): Promise<Product[]> {
    return catalogRepository.findProductsByCategory(categoryId);
  }

  async listAllProducts(): Promise<Product[]> {
    return catalogRepository.findAllProducts();
  }

  async getProductById(id: string): Promise<Product | null> {
    return catalogRepository.findProductById(id);
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    return catalogRepository.findProductsByIds(ids);
  }

  /**
   * يتحقق من أن الاختيار (الحجم/الإضافات) صالح لهذا المنتج
   */
  validateSelection(product: Product, selection: ProductSelection): boolean {
    const sizeOptions = product.options.filter((o) => o.type === 'size');
    const addonOptions = product.options.filter((o) => o.type === 'addon');

    if (sizeOptions.length > 0) {
      if (!selection.sizeId) return false;
      if (!sizeOptions.some((o) => o.id === selection.sizeId)) return false;
    }

    for (const addonId of selection.addonIds ?? []) {
      if (!addonOptions.some((o) => o.id === addonId)) return false;
    }

    return true;
  }

  /**
   * يحسب السعر النهائي بناءً على السعر الأساسي وتعديلات الحجم والإضافات
   */
  calculatePrice(product: Product, selection: ProductSelection = {}): number {
    if (!this.validateSelection(product, selection)) {
      throw new Error(`اختيار غير صالح للمنتج ${product.id}`);
    }

    let price = product.basePrice;

    if (selection.sizeId) {
      const size = product.options.find((o) => o.type === 'size' && o.id === selection.sizeId);
      if (size) price += size.priceModifier;
    }

    for (const addonId of selection.addonIds ?? []) {
      const addon = product.options.find((o) => o.type === 'addon' && o.id === addonId);
      if (addon) price += addon.priceModifier;
    }

    return price;
  }

  // ==========================================================================
  // سير عمل الكتالوج المبسَّط للإطلاق (CATALOG-IMPORT-WORKFLOW) — راجع docs/DECISIONS.md → ADR-031
  // ==========================================================================

  async listMasterItems(): Promise<MasterCatalogItem[]> {
    return catalogRepository.listMasterItems();
  }

  async createMasterItem(
    input: { categoryId: string; name: string; description?: string; basePrice: number; unit: string; imageUrl?: string },
    actor: { id: string; role: UserRole }
  ): Promise<MasterCatalogItem> {
    const item = await catalogRepository.insertMasterItem(input);
    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'catalog.master_item_created',
      entityType: 'catalog_master_item',
      entityId: item.id,
      metadata: { name: item.name, basePrice: item.basePrice, categoryId: item.categoryId },
    });
    return item;
  }

  // يُحدِّث سعر البيع المرجعي، ثم يُطبِّقه فوراً على كل صف منتج تاجر مُستنسَخ منه — "سعر البيع
  // يحدده المالك فقط" (طلب المهمة) يعني تعديله هنا وحده يكفي، لا تعديل يدوي لكل تاجر على حدة.
  async updateMasterItemPrice(id: string, basePrice: number, actor: { id: string; role: UserRole }): Promise<MasterCatalogItem> {
    const before = await catalogRepository.findMasterItemById(id);
    if (!before) throw new Error('عنصر الكتالوج الأساسي غير موجود');

    const updated = await catalogRepository.updateMasterItemBasePrice(id, basePrice);
    const linkedProductsUpdated = await catalogRepository.cascadeBasePriceToLinkedProducts(id, basePrice);

    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'catalog.master_item_price_updated',
      entityType: 'catalog_master_item',
      entityId: id,
      metadata: { before: before.basePrice, after: basePrice, linkedProductsUpdated },
    });

    return updated;
  }

  // ينشئ/يُحدِّث صف منتج التاجر (تاجر + عنصر كتالوج أساسي) ثم يضبط مخزونه (كمية + تكلفة) — نقطة
  // الالتقاء الوحيدة بين مسار المطابقة التلقائية ومسار حسم قائمة المراجعة (approve/merge)، لا تكرار.
  private async upsertTenantProductFromMaster(
    tenantId: string,
    master: MasterCatalogItem,
    quantity: number,
    costPrice: number
  ): Promise<Product> {
    let product = await catalogRepository.findTenantProductByMasterItem(tenantId, master.id);
    if (!product) {
      product = await catalogRepository.insertProductFromMaster(tenantId, master);
    }
    await inventoryService.setStockForImport(product.id, quantity, costPrice);
    return product;
  }

  // استيراد Excel تاجر — لكل صف: تطابق حرفي (بعد تطبيع الاسم، لا تقريبي) مع الكتالوج الأساسي، أو
  // قائمة مراجعة إن لم يوجد تطابق. tenantId يصل من جلسة التاجر في Server Action المستدعية، لا من
  // أي مدخل عميل — عزل المستأجرين (INV-TEN-001) يبقى بلا تغيير.
  async importMerchantExcel(tenantId: string, rows: MerchantImportRow[]): Promise<MerchantImportResult> {
    const masterItems = await catalogRepository.listMasterItems();
    const byNormalizedName = new Map(masterItems.map((item) => [normalizeProductName(item.name), item]));

    let matched = 0;
    let queued = 0;

    for (const row of rows) {
      const master = byNormalizedName.get(normalizeProductName(row.name));
      if (master) {
        await this.upsertTenantProductFromMaster(tenantId, master, row.quantity, row.costPrice);
        matched++;
        continue;
      }

      const existingPending = await catalogRepository.findPendingReviewQueueItem(tenantId, row.name);
      if (!existingPending) {
        await catalogRepository.insertReviewQueueItem({ tenantId, rawName: row.name, quantity: row.quantity, costPrice: row.costPrice });
      }
      queued++;
    }

    return { matched, queued, errors: [] };
  }

  async listReviewQueue(): Promise<ReviewQueueItem[]> {
    return catalogRepository.listReviewQueue('pending');
  }

  // المالك يعتبر صف المراجعة منتجاً جديداً كلياً — يحدد بنفسه الاسم/التصنيف/سعر البيع/الوحدة
  // (لا شيء منها في ملف التاجر أصلاً)، والكمية/التكلفة تُؤخَذان من الصف الأصلي المستورَد.
  async resolveReviewQueueAsNew(
    queueId: string,
    input: { categoryId: string; name: string; description?: string; basePrice: number; unit: string; imageUrl?: string },
    actor: { id: string; role: UserRole }
  ): Promise<MasterCatalogItem> {
    const queueItem = await catalogRepository.findReviewQueueItemById(queueId);
    if (!queueItem || queueItem.status !== 'pending') throw new Error('صف المراجعة غير موجود أو تم حسمه بالفعل');

    const master = await this.createMasterItem(input, actor);
    const product = await this.upsertTenantProductFromMaster(queueItem.tenantId, master, queueItem.quantity, queueItem.costPrice);

    await catalogRepository.resolveReviewQueueItem(queueId, {
      status: 'approved_new',
      resolvedMasterItemId: master.id,
      resolvedProductId: product.id,
      resolvedBy: actor.id,
    });

    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'catalog.review_queue_resolved_new',
      entityType: 'catalog_review_queue',
      entityId: queueId,
      metadata: { rawName: queueItem.rawName, tenantId: queueItem.tenantId, newMasterItemId: master.id },
    });

    return master;
  }

  // المالك يدمج صف المراجعة مع عنصر كتالوج أساسي موجود بالفعل — يمنع تكرار منتج قائم (سبب وجود
  // قائمة المراجعة أصلاً، راجع طلب المهمة: 10 من 70 تاجراً سوبرماركت بمنتجات متداخلة).
  async resolveReviewQueueAsMerge(queueId: string, masterItemId: string, actor: { id: string; role: UserRole }): Promise<void> {
    const queueItem = await catalogRepository.findReviewQueueItemById(queueId);
    if (!queueItem || queueItem.status !== 'pending') throw new Error('صف المراجعة غير موجود أو تم حسمه بالفعل');

    const master = await catalogRepository.findMasterItemById(masterItemId);
    if (!master) throw new Error('عنصر الكتالوج الأساسي المطلوب الدمج معه غير موجود');

    const product = await this.upsertTenantProductFromMaster(queueItem.tenantId, master, queueItem.quantity, queueItem.costPrice);

    await catalogRepository.resolveReviewQueueItem(queueId, {
      status: 'merged',
      resolvedMasterItemId: master.id,
      resolvedProductId: product.id,
      resolvedBy: actor.id,
    });

    await auditService.log({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'catalog.review_queue_resolved_merge',
      entityType: 'catalog_review_queue',
      entityId: queueId,
      metadata: { rawName: queueItem.rawName, tenantId: queueItem.tenantId, mergedIntoMasterItemId: master.id },
    });
  }
}

export const catalogService = new CatalogService();
