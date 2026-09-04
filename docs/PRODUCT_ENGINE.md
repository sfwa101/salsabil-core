---
title: محرك المنتج
status: ACTIVE
version: 1.0
last_updated: 2026-09-01
owner: Claude + المؤسس
source_of_truth: هذا الملف (تفصيل)، SALSABIL_CONSTITUTION.md §8, §14 (المصدر الأصلي)، الكود الفعلي في src/core/modules/catalog/
---

# محرك المنتج (Product Engine)

---

## 1. الرؤية الكاملة (Conceptual) — Evidence: `CONSTITUTION` §8

```
Product → Brand → Category → Variant → SKU → Barcode
Unit (وحدة القياس) → Packaging (التعبئة) → Pricing → Inventory
```

**الحالة:** هذه هي الرؤية الكاملة بعيدة المدى. **المُنفَّذ فعلياً أقل بكثير** (راجع §3 أدناه).

---

## 2. لماذا JSONB بدل أعمدة ثابتة أو EAV كامل — Evidence: `DOCUMENTED_DECISION` (ADR-004، راجع DECISIONS.md)

فخّان تم تجنبهما عمداً:
```
الفخ الأول: أعمدة ثابتة لكل حالة (products.bone_option, products.size_range...)
  → ينهار لأول منتج مختلف الشكل

الفخ الثاني: EAV كامل (جدول منفصل لكل خاصية ممكنة)
  → معقد جداً للاستعلام، بطيء، يخالف "لا تبني ERP الآن" (CONSTITUTION §8)
```

**الحل المطبَّق:** عمود `options` (JSONB) في قاعدة البيانات — مرن بلا قيد بنيوي. **الصرامة تُفرَض على مستوى TypeScript فقط**، لا قاعدة البيانات:

```typescript
// src/core/modules/catalog/types.ts — IMPLEMENTED
export interface SizeOption {
  type: 'size';
  id: string;
  label: string;
  priceModifier: number;
}

export interface AddonOption {
  type: 'addon';
  id: string;
  label: string;
  priceModifier: number;
  ifUnavailable: 'continue_without' | 'ask_me' | 'cancel_order';
}

export type ProductOption = SizeOption | AddonOption;
```

---

## 3. حالة التنفيذ الفعلية (بدقة، حقل بحقل)

| العنصر من الرؤية الكاملة (§1) | الحالة | ملاحظة |
|---|---|---|
| `Product` (اسم، وصف، سعر أساسي، وحدة، صورة) | `IMPLEMENTED` | جدول products |
| `Category` | `IMPLEMENTED` | جدول categories، يدعم `parent_id` لكن غير مُستخدَم فعلياً |
| `Options` (أحجام/إضافات مرنة) | `IMPLEMENTED` | عبر JSONB + types.ts |
| `Inventory` (كمية متاحة) | `IMPLEMENTED` (الجدول فقط) | لا منطق نقص تلقائي بعد |
| `Brand` | `CONCEPTUAL` | غير مبني |
| `Variant` (منفصل عن Options) | `CONCEPTUAL` | لم يُحسم الفرق التقني بين Variant وOptions بعد — راجع OPEN_QUESTION أدناه |
| `SKU` / `Barcode` | `CONCEPTUAL` | غير مبني، لا حاجة فعلية بعد لمرحلة Vertical Slice |
| `Packaging` | `CONCEPTUAL` | غير مبني |
| `Perishable` / `Shelf Life` | `CONCEPTUAL` | مذكور في سياق §14 (الدواجن/الأسماك) لكن لا حقل فعلي بعد |

---

## 4. 🟡 OPEN_QUESTION — الفرق بين `Variant` و`Options`

الدستور الأصلي (§8) يذكر `Variant` كخطوة منفصلة قبل `SKU`، بينما الكود الفعلي طبَّق `options` (JSONB) كحل موحَّد للأحجام والإضافات معاً. **لم يُحسم:** هل `Variant` مفهوم أكبر (نسخة كاملة من المنتج بسعر/SKU/باركود مستقل، مثل "قميص أحمر مقاس L" كصف منفصل بالكامل) بينما `options` الحالي هو فقط "تعديل سعر على نفس المنتج" (مثل حجم الدجاجة)؟ هذا التمييز **غير محسوم**، ويُترك `OPEN_QUESTION` حتى تظهر حاجة فعلية (مثلاً منتج له ألوان/مقاسات متعددة بصور مختلفة لكل واحد — لا يوجد بعد في المرحلة الأولى).

> **ملاحظة ربط بمثال حقيقي (2026-09-05، توثيق تحضيري — لا حسم):** حي الأسماك (`SALSABIL_CONSTITUTION.md §7.1`) مرشَّح واقعي قوي لحسم هذا السؤال لاحقاً، لأنه يجمع نمطين لا يغطيهما `options` الحالي بشكله المسطَّح:
> 1. **خيارات شرطية متسلسلة (Cascading/Conditional Options):** اختيار الحالة أولاً (نيء/مشوي/مقلي) يُغيّر ديناميكياً أي خيارات فرعية تظهر بعده (تنظيف/تقشير/تقطيع) — تختلف حسب نوع السمكة وحالتها. `options: ProductOption[]` الحالي مسطَّح (قائمة واحدة بلا تفرّع أو شرط ظهور)، لا يدعم "خيار يتحكم في ظهور خيارات أخرى" بنيوياً اليوم.
> 2. **وحدة القياس المزدوجة بمنطق تسعير مختلف:** وزن بالكيلو (سعر متغيّر حسب وزن الفرد الفعلي عند التجهيز) مقابل بالعدد (سعر ثابت لكل قطعة) — `Product.unit: string` الحالي حقل وصفي بلا تأثير على منطق `calculatePrice()` نفسه.
> **لا يُحسم أي من هذين هنا ولا يُبنى كود لهما الآن** — يُترك حتى بناء واجهة قسم الأسماك فعلياً (لا قبل ذلك)، حيث يُحسم حينها الشكل الدقيق لـ`Variant` مقابل `options` بحاجة فعلية أمام الأعين، لا نظرياً.

---

## 5. منطق حساب السعر — Evidence: `IMPLEMENTED`

**قاعدة صارمة (`SALSABIL_CONSTITUTION.md §4` بند 2):** هذا هو **المكان الوحيد** في كامل النظام الذي يحسب سعر المنتج.

```typescript
// src/core/modules/catalog/catalog.service.ts — IMPLEMENTED
calculatePrice(product: Product, selectedOptionIds: string[]): number {
  let total = product.basePrice;
  for (const optionId of selectedOptionIds) {
    const option = product.options.find((o) => o.id === optionId);
    if (option) total += option.priceModifier;
  }
  return Math.max(total, 0);
}
```

**تحقق فعلي (اليوم 3):** دجاجة أساسها 120 جنيه، صغير (-20) = 100، كبير (+30) = 150 — تم التحقق يدوياً بنجاح.

---

## 6. Product Lifecycle — Evidence: `OPEN_QUESTION`

لا حالات دورة حياة للمنتج نفسه موثَّقة بعد (مثل: draft → active → discontinued). حالياً فقط `is_active: boolean`. **`OPEN_QUESTION`:** هل نحتاج دورة حياة أغنى لاحقاً؟ يُقيَّم عند الحاجة الفعلية.

---

## 7. علاقة Product Identity بالمخزون (§8 CONSTITUTION)

مبدأ ثابت: البدائل الذكية (§14 CONSTITUTION) ونظام الحجز بالسعة (§15) كلاهما **يُبنيان فوق نفس محرك المنتج هذا دون نطاق جديد منفصل** — عند بنائهما، يُحدَّث هذا الملف لا يُنشأ ملف موازٍ.
