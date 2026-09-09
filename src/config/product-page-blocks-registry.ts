// src/config/product-page-blocks-registry.ts
// COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 3) — السجل المركزي لـ"بلوكات صفحة/شيت
// المنتج" — نفس نمط theme-registry.ts/neighborhood-identity-registry.ts/content-type-registry.ts
// حرفياً (Zero Hardcode، سجل بيانات ثابت في الكود، لا مبعثر داخل المكوّنات). البنية فقط في هذه
// الدفعة — لا واجهة إدارة (تفعيل/ترتيب/حذف من لوحة تحكم) بعد، هذا خارج النطاق صراحة كما ورد في
// موجّه المهمة. الهدف: أي بلوك مستقبلي (أو تعطيل/إعادة ترتيب بلوك حالي) من لوحة الإدارة يحتاج فقط
// تعديل هذا الملف — لا إعادة كتابة ProductOptions.tsx/product/[id]/page.tsx نفسيهما.
//
// ⚠️ ملاحظة أمانة معمارية (AGENTS.md §5 — Never Infer Missing Architecture): موجّه المهمة يفترض
// وجود "بلوك طريقة التحضير" (PrepMethodOption) و"بلوك التغليف" (PackagingOption) كبلوكين "معروفين
// اليوم" — هذا غير دقيق. `ProductOptionType` الفعلي في src/core/modules/catalog/types.ts يحتوي
// حصراً 'size' | 'addon' — لا نوع 'prepMethod' ولا 'packaging' في المخطط أو في CatalogService
// (validateSelection/calculatePrice) اليوم. إضافة نوع جديد لـProductOption تمس قاعدة عمل حقيقية
// (التسعير/التحقق من الاختيار، ADR-004) — Guardian Matrix DEEP وفق docs/AGENTS.md §17 (Financial
// logic)، تحتاج قراراً مؤسس صريحاً منفصلاً، لا تُخترَع هنا كجزء من دفعة بصرية. البلوكان مُسجَّلان
// أدناه بمعرّف/ترتيب/تسمية جاهزين (البنية موجودة كما طُلب)، لكن `isVisible` لكل منهما يعيد `false`
// دائماً — لا مستهلك بيانات حقيقي حتى تُضاف الأنواع فعلياً لـProductOptionType (قرار مستقل مستقبلي).

import type { Product, ProductOptionType } from '@/core/modules/catalog/types';

export type ProductPageBlockId =
  | 'gallery'
  | 'titleDescription'
  | 'sizeOption'
  | 'prepMethodOption'
  | 'addonOption'
  | 'packagingOption'
  | 'price'
  | 'addToCartButton'
  | 'upsellShelf';

// أين يُستهلَك هذا البلوك فعلياً — صفحة المنتج الكاملة (هيرو/عنوان/Upsell، عرض ثابت لا تفاعل حالة)،
// أم داخل ProductOptions.tsx (بلوكات الاختيار/السعر/الإضافة للسلة، تشترك حالة React واحدة: sizeId/
// addonIds/price). فصل ضروري لأن كلا الملفين مكوّن منفصل تماماً اليوم — سجل واحد، مستهلكان مختلفان.
export type ProductPageBlockLocation = 'page' | 'options';

export interface ProductPageBlockDefinition {
  id: ProductPageBlockId;
  location: ProductPageBlockLocation;
  /** ترتيب افتراضي (تصاعدي) — فجوات مقصودة بين كل بلوك للسماح بإدراج بلوك جديد بينها مستقبلاً بلا
   *  إعادة ترقيم الكل (نفس نمط categories.display_order/posts.priority القائمَين في قاعدة البيانات). */
  defaultOrder: number;
  /** تسمية عربية — لوحة إدارة مستقبلية (تفعيل/ترتيب)، لا مستهلك واجهة حالياً. */
  labelAr: string;
  /** شرط الظهور — منتج بلا بيانات هذا البلوك لا يعرضه (مثال: بلوك الوزن يظهر فقط لمنتج له
   *  sizeOptions فعلياً). `true` دائماً = بلوك أساسي لا يعتمد على بيانات اختيارية. */
  isVisible: (product: Product) => boolean;
}

function hasOptionType(product: Product, type: ProductOptionType): boolean {
  return product.options.some((o) => o.type === type);
}

export const PRODUCT_PAGE_BLOCKS_REGISTRY: ProductPageBlockDefinition[] = [
  { id: 'gallery', location: 'page', defaultOrder: 0, labelAr: 'صورة/معرض', isVisible: () => true },
  { id: 'titleDescription', location: 'page', defaultOrder: 10, labelAr: 'عنوان ووصف', isVisible: () => true },
  { id: 'sizeOption', location: 'options', defaultOrder: 20, labelAr: 'بلوك الوزن', isVisible: (p) => hasOptionType(p, 'size') },
  // CONCEPTUAL — راجع تحذير أعلى الملف. لا 'prepMethod' في ProductOptionType اليوم.
  { id: 'prepMethodOption', location: 'options', defaultOrder: 30, labelAr: 'بلوك طريقة التحضير', isVisible: () => false },
  { id: 'addonOption', location: 'options', defaultOrder: 40, labelAr: 'بلوك الإضافات', isVisible: (p) => hasOptionType(p, 'addon') },
  // CONCEPTUAL — راجع تحذير أعلى الملف. لا 'packaging' في ProductOptionType اليوم.
  { id: 'packagingOption', location: 'options', defaultOrder: 50, labelAr: 'بلوك التغليف', isVisible: () => false },
  { id: 'price', location: 'options', defaultOrder: 60, labelAr: 'بلوك السعر', isVisible: () => true },
  { id: 'addToCartButton', location: 'options', defaultOrder: 70, labelAr: 'زر الإضافة للسلة', isVisible: () => true },
  { id: 'upsellShelf', location: 'page', defaultOrder: 80, labelAr: 'رف منتجات قد تعجبك', isVisible: () => true },
];

/** أرقام البلوكات الظاهرة لهذا المنتج، بترتيب العرض الفعلي، لموقع استهلاك واحد (page أو options). */
export function getVisibleProductPageBlockIds(product: Product, location: ProductPageBlockLocation): ProductPageBlockId[] {
  return PRODUCT_PAGE_BLOCKS_REGISTRY.filter((b) => b.location === location && b.isVisible(product))
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((b) => b.id);
}
