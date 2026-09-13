// src/core/modules/inventory/types.ts
// المخزون — فحص التوفر فقط، بلا حجز/تجميد (ذلك يخص Orders لاحقاً، اليوم 9)

export interface InventoryRecord {
  productId: string;
  quantityAvailable: number;
  costPrice?: number; // تكلفة شراء التاجر الخاصة به — مستقلة عن base_price/سعر البيع (CATALOG-IMPORT-WORKFLOW، ADR-025)
  updatedAt: string;
}
