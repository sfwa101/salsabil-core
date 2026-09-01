// src/core/modules/inventory/types.ts
// المخزون — فحص التوفر فقط، بلا حجز/تجميد (ذلك يخص Orders لاحقاً، اليوم 9)

export interface InventoryRecord {
  productId: string;
  quantityAvailable: number;
  updatedAt: string;
}
