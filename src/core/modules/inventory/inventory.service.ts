// src/core/modules/inventory/inventory.service.ts
// فحص توفر المخزون فقط — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر inventoryRepository

import { inventoryRepository } from './inventory.repository';
import type { InventoryRecord } from './types';

export class InventoryService {
  // §31 بند 5 — لوحة "عروضي" في بوابة التاجر (كمية/سعر توريد كل منتجاته معاً).
  async getStockForProducts(productIds: string[]): Promise<InventoryRecord[]> {
    return inventoryRepository.findByProductIds(productIds);
  }

  /**
   * يتحقق من توفر الكمية المطلوبة. عدم وجود سجل مخزون يُعامَل كـ "غير متاح"
   * (لا استثناء صامت لصالح البيع بلا رقابة)
   */
  async isAvailable(productId: string, quantity: number): Promise<boolean> {
    const record = await inventoryRepository.findByProductId(productId);
    if (!record) return false;
    return record.quantityAvailable >= quantity;
  }

  // CRITICAL-FIXES-FROM-AUDIT-001، بند 2 — نقطة الاستهلاك الفعلية (تُستدعى من checkout() فقط،
  // لا من إضافة السلة — إضافة عنصر للسلة لا تحجز مخزوناً، هذا هو أول استهلاك فعلي له). خصم ذرّي
  // شرطي حقيقي، لا فحص ثم قرار منفصل كما في isAvailable أعلاه — راجع
  // inventory.repository.ts.decrementIfAvailable للتفصيل الكامل لآلية الذرّية.
  async reserve(productId: string, quantity: number): Promise<boolean> {
    return inventoryRepository.decrementIfAvailable(productId, quantity);
  }

  // تعويضي (بند 3) — يُستدعى عند فشل خطوة لاحقة في checkout() بعد reserve() ناجح لنفس المنتج، وأيضاً
  // (TASK-08) من orders.service.ts → transitionStatus عند إلغاء طلب موجود فعلياً (* → cancelled)
  // لكل بند من order_items. restore() نفسها محمية بقفل تفاؤلي (inventory.repository.ts) يمنع فقد
  // أثر استرجاع تحت تزامن حقيقي بين مستدعيَين معاً.
  async release(productId: string, quantity: number): Promise<void> {
    return inventoryRepository.restore(productId, quantity);
  }

  // CATALOG-IMPORT-WORKFLOW (ADR-031) — يُستدعى من catalogService.importMerchantExcel فقط، بعد
  // إنشاء/إيجاد صف منتج التاجر. استبدال كامل، لا جمع تراكمي (راجع تعليق inventory.repository.ts).
  async setStockForImport(productId: string, quantityAvailable: number, costPrice: number): Promise<void> {
    await inventoryRepository.upsertForImport(productId, quantityAvailable, costPrice);
  }
}

export const inventoryService = new InventoryService();
