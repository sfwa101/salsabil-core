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

// ============================================================================
// سير عمل الكتالوج المبسَّط للإطلاق (CATALOG-IMPORT-WORKFLOW) — راجع docs/DECISIONS.md → ADR-025
// ============================================================================

// الكتالوج الأساسي — يديره platform_admin حصراً (اسم + سعر بيع + تصنيف). صفوف products الخاصة
// بكل تاجر تُستنسَخ من هذا العنصر (master_item_id)، ويُقفَل عليها سعر البيع (لا يُعدِّله التاجر).
export interface MasterCatalogItem {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  basePrice: number;
  unit: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReviewQueueStatus = 'pending' | 'approved_new' | 'merged';

// صف استيراد تاجر لم يُطابِق أي عنصر في الكتالوج الأساسي (بعد تطبيع الاسم) — بانتظار قرار المالك:
// إما اعتباره منتجاً جديداً (approved_new) أو دمجه مع عنصر موجود (merged).
export interface ReviewQueueItem {
  id: string;
  tenantId: string;
  rawName: string;
  quantity: number;
  costPrice: number;
  status: ReviewQueueStatus;
  resolvedMasterItemId?: string;
  resolvedProductId?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

// صف واحد من ملف Excel المستورَد — 3 أعمدة فقط (قرار مؤسس صريح): اسم المنتج، الكمية، التكلفة.
// لا سعر بيع هنا إطلاقاً — يحدده المالك فقط عبر الكتالوج الأساسي.
export interface MerchantImportRow {
  name: string;
  quantity: number;
  costPrice: number;
}

export interface MerchantImportRowError {
  row: number; // رقم السطر في ملف Excel (1-indexed، يشمل صف العناوين)
  message: string;
}

export interface MerchantImportResult {
  matched: number; // طابق عنصر كتالوج أساسي موجود تلقائياً — أُنشئ/حُدِّث صف منتج التاجر مباشرة
  queued: number; // لم يطابق أي عنصر — أُرسِل لقائمة مراجعة المالك
  errors: MerchantImportRowError[]; // صفوف مرفوضة كلياً (اسم فارغ، كمية/تكلفة غير صالحة)
}
