// src/core/modules/catalog/catalog.service.ts
// محرك حساب السعر والتحقق — لا استدعاء لقاعدة بيانات هنا مباشرة

import type { Product, ProductSelection } from './types';

export class CatalogService {
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
}

export const catalogService = new CatalogService();
