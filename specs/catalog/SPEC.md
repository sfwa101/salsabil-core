---
title: Spec — Catalog (محرك المنتج)
status: PARTIALLY_IMPLEMENTED
version: 1.0 (رجعي)
last_updated: 2026-09-01
owner: Claude (توثيق رجعي) + المؤسس (اعتماد)
source_of_truth: هذا الملف يوثّق التطابق/الفجوة — الكود الفعلي هو الحقيقة النهائية
---

# Spec — Catalog (محرك المنتج)

> **ملاحظة منهجية:** Spec رجعي. الكود سبق كتابة هذا الملف (اليوم 3).

---

## Purpose

عرض المنتجات بأقسامها، بخيارات مرنة (أحجام/إضافات)، بحساب سعر دقيق وآمن على الخادم.

## Problem

منتجات ريف مختلفة الشكل جذرياً (بقالة بسيطة، دواجن بأحجام، لحوم بإضافات) — تحتاج بنية واحدة مرنة بلا Migration جديد لكل نوع.

## Scope (المرحلة الأولى، Vertical Slice)

- قسم واحد ("حي الطعام اليومي")
- منتجات بخيارات حجم/إضافة اختيارية
- حساب سعر نهائي من الخادم فقط
- تتبع مخزون أساسي (رقم فقط، لا منطق نقص تلقائي بعد)

## Non-Goals (صراحة، هذه المرحلة)

- ❌ Brand, Variant منفصل عن Options, SKU, Barcode, Packaging — كلها `CONCEPTUAL`، لم تُبنَ (راجع `docs/PRODUCT_ENGINE.md §3`)
- ❌ البدائل الذكية الفعلية (Smart Alternatives Engine) — النوع موجود (`ifUnavailable`)، المنطق التنفيذي غير موجود
- ❌ نظام الحجز بالسعة — غير مبني، خارج نطاق هذه المرحلة

## Requirements — الفعلي مقابل المخطَّط

| المتطلب | الحالة |
|---|---|
| جدول categories | `IMPLEMENTED` |
| جدول products بخيارات مرنة (JSONB) | `IMPLEMENTED` |
| جدول inventory | `IMPLEMENTED` (الجدول فقط، لا منطق ربط بالطلبات لعدم وجود Orders بعد) |
| حساب السعر من الخادم (calculatePrice) | `IMPLEMENTED` + **مُختبَر فعلياً** (100/150 جنيه للدجاجة) |
| التحقق من صحة الخيارات المُرسَلة (validateOptions) | `IMPLEMENTED` |
| CatalogRepository (getActiveCategories, getProductsByCategory) | `IMPLEMENTED` |
| واجهة مستخدم لعرض المنتجات | `IMPLEMENTED` (اليوم 5) — `src/app/page.tsx`, `src/app/[category]/page.tsx`, `src/app/product/[id]/page.tsx` |
| ربط منتج بتاجر (tenant_id) | `IMPLEMENTED` (اليوم 4) — راجع `specs/merchant/SPEC.md` |

## Business Rules

- BR-002 (تعدد الأحياء بلا تكرار منتج) — محقَّق بنيوياً عبر `category_id` واحد لكل منتج
- BR-003 (البدائل الذكية) — النوع موجود، المنطق غير منفَّذ
- راجع `docs/BUSINESS_RULES.md` للتفصيل

## UX Requirements

`IMPLEMENTED` (نطاق أولي، اليوم 5) — تصفح: أقسام → منتجات → تفاصيل منتج مع اختيار حجم/إضافة وسعر محسوب حياً. ألوان الدستور (`ADR-006`) مُطبَّقة. لا Spacing/Typography/Shadows موحَّدة بعد (لا تزال `OPEN_QUESTION` في `docs/UI_UX_SYSTEM.md §6`) — استُخدمت قيم Tailwind الافتراضية حيث لا قرار موثَّق.

## Technical Requirements

```
src/core/modules/catalog/
  ├── types.ts (Product, Category, ProductOption, SizeOption, AddonOption)
  ├── catalog.service.ts (calculatePrice, validateSelection, listCategories,
  │                        getCategoryBySlug, listProductsByCategory, getProductById)
  └── catalog.repository.ts (findCategories, findCategoryBySlug,
                              findProductsByCategory, findProductsByTenant,
                              findProductById, findProductByName)

src/app/
  ├── page.tsx                     (قائمة الأقسام)
  ├── [category]/page.tsx          (منتجات القسم)
  └── product/[id]/
      ├── page.tsx                 (تفاصيل المنتج)
      └── actions.ts                ('use server' — calculatePriceAction)

src/components/
  ├── CategoryCard.tsx, ProductCard.tsx
  └── ProductOptions.tsx           ('use client' — اختيار الحجم/الإضافات)
```

**قرار تصميم موثَّق:** JSONB بدل أعمدة ثابتة/EAV — راجع `docs/DECISIONS.md ADR-004`. ألوان الدستور معتمدة فعلياً — راجع `ADR-006`.

## Security Requirements

`validateSelection()` يمنع قبول خيار غير موجود فعلياً في المنتج — تطبيق مباشر لمبدأ "لا ثقة ببيانات العميل" (`CONSTITUTION §4`). السعر المعروض للعميل يُحسَب دائماً عبر `calculatePriceAction` (Server Action، `docs/SECURITY.md` قاعدة 2) — لا حساب سعر في الواجهة (Client Component) يُعتمَد عليه مباشرة.

## Acceptance Criteria (للحالة الحالية)

- [x] الأقسام تُقرأ من قاعدة بيانات حقيقية
- [x] المنتجات تُقرأ مع خياراتها
- [x] حساب السعر صحيح رياضياً (تحقق فعلي: 120 أساس، -20 صغير = 100، +30 كبير = 150)
- [x] `npx tsc --noEmit` بلا أخطاء
- [x] واجهة مستخدم فعلية — تصفح فعلي عبر متصفح حقيقي (Playwright headless): قسم → منتج → صغير=100 → كبير=150، بلا أخطاء console
- [ ] ربط بمخزون فعلي عند الطلب — **غير مكتمل** (Orders غير موجود)

## Dependencies

- جدول merchants (اليوم 4) — `IMPLEMENTED`، راجع `specs/merchant/SPEC.md`
- نطاق Orders (اليوم 8) — مطلوب لربط المخزون بعمليات شراء فعلية

## قرارات اتُّخذت أثناء التنفيذ ولم تكن في الدستور صراحة

- استخدام JSONB بدل ما ورد حرفياً في §8 (Variant → SKU → Barcode كخطوات منفصلة) — قرار عملي لتسريع الوصول لخلية تعمل، موثَّق في ADR-004
- الفرق بين `Variant` (من الدستور) و`ProductOption` (المُنفَّذ فعلياً) لم يُحسم — راجع `docs/PRODUCT_ENGINE.md §4`

## أجزاء تحتاج إعادة نظر

- عمود `options` بلا أي قيد بنيوي (CHECK constraint) على مستوى قاعدة البيانات — الاعتماد الكامل على TypeScript فقط قد يحتاج طبقة تحقق إضافية (مثل JSON Schema validation) قبل الإنتاج

## Open Questions

1. الفرق التقني الدقيق بين Variant وOptions — راجع `docs/PRODUCT_ENGINE.md §4`
2. هل نحتاج CHECK constraint أو JSON Schema على عمود `options` قبل الإنتاج؟

## Status

`PARTIALLY_IMPLEMENTED` — منطق العمل، قاعدة البيانات، وواجهة تصفح أولية جاهزة ومُختبَرة فعلياً في متصفح حقيقي، لا ربط بالطلبات/السلة بعد (اليوم 6-7).
