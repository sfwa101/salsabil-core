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
}

export const inventoryService = new InventoryService();
