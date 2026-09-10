// src/core/modules/catalog/types.ts
// كتالوج المنتجات — الأنواع والخيارات المرنة (SALSABIL_CONSTITUTION.md §8, §14)

// تحوُّط تسمية (PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH، بند 1) — كان `ProductOptionType`. نفس
// مفهوم "خيار قابل للاختيار يغيّر السعر/المحتوى" (وزن/إضافة اليوم) متوقَّع الحاجة إليه مستقبلاً في
// عوالم أخرى غير ريف (درجة رحلة/فندق في أسراب، نوع خدمة في نبض) — rename بحت بلا أي منطق جديد، لا
// "محرك اختيارات عام". راجع docs/DECISIONS.md لملاحظة القرار الكاملة.
export type SelectableOptionType = 'size' | 'addon';

export type AddonUnavailableAction = 'continue_without' | 'ask_me' | 'cancel_order';

export interface SizeOption {
  id: string;
  type: 'size';
  label: string;
  priceModifier: number;
}

export interface AddonOption {
  id: string;
  type: 'addon';
  label: string;
  priceModifier: number;
  optional?: boolean;
  ifUnavailable?: AddonUnavailableAction;
}

export type ProductOption = SizeOption | AddonOption;

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Product {
  id: string;
  categoryId: string;
  tenantId: string | null; // معرّف التاجر المالك للمنتج — عزل المستأجرين (§5, §26)
  name: string;
  description?: string;
  basePrice: number;
  unit: string;
  imageUrl?: string;
  options: ProductOption[];
  isActive: boolean;
  createdAt: string;
}

// اختيار العميل عند إضافة المنتج للسلة
export interface ProductSelection {
  sizeId?: string;
  addonIds?: string[];
}
