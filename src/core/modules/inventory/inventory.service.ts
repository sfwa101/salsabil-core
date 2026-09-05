// src/core/modules/inventory/inventory.service.ts
// فحص توفر المخزون فقط — لا استدعاء لقاعدة بيانات هنا مباشرة، فقط عبر inventoryRepository

import { inventoryRepository } from './inventory.repository';

export class InventoryService {
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

  // تعويضي (بند 3) — يُستدعى فقط عند فشل خطوة لاحقة في checkout() بعد reserve() ناجح لنفس المنتج.
  async release(productId: string, quantity: number): Promise<void> {
    return inventoryRepository.restore(productId, quantity);
  }
}

export const inventoryService = new InventoryService();
