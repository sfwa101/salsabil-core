---
title: Spec — Merchant (نطاق التاجر وتعدد المستأجرين)
status: PARTIALLY_IMPLEMENTED
version: 1.0 (رجعي — كُتب بعد التنفيذ الجزئي)
last_updated: 2026-09-01
owner: Claude (توثيق رجعي) + المؤسس (اعتماد)
source_of_truth: هذا الملف يوثّق التطابق/الفجوة بين النية والتنفيذ — الكود الفعلي هو الحقيقة النهائية لما يعمل الآن
---

# Spec — Merchant (التاجر)

> **ملاحظة منهجية:** هذا Spec رجعي. الكود سبق كتابة هذا الملف (اليوم 4).

---

## Purpose

عزل بيانات كل تاجر عن الآخر (Multi-Tenant Isolation)، وربط المنتجات بتاجر مالك محدد.

## Problem

كتالوج اليوم 3 كان بلا مالك — كل منتج "عائم" بلا تاجر. أي بوابة تاجر حقيقية (اليوم 5+) تحتاج التأكد أن كل تاجر يرى ويُدير منتجاته فقط.

## Scope (كما نُفِّذ فعلياً، اليوم 4)

- جدول `merchants` (تسجيل تاجر: اسم العمل، هاتف، slug، نسبة عمولة قابلة للتهيئة)
- عمود `products.tenant_id` يربط المنتج بتاجره
- عزل القراءة عبر `CatalogRepository.findProductsByTenant()`
- تحقق برمجي من صلاحية الوصول للنطاق (`canAccessTenant`) بالاعتماد على `Session.tenantId` فقط، لا أي معرّف يرسله العميل

## Non-Goals (صراحة، هذه المرحلة)

- ❌ `stores` كطبقة فرعية تحت التاجر — `CONCEPTUAL`
- ❌ تسجيل دخول فعلي أو ربط `Session` بـ Supabase Auth — لا يزال `NOT_IMPLEMENTED` (راجع `specs/identity/SPEC.md`)
- ❌ العقد الإلكتروني الكامل (BR-007) بمنع برمجي للرسوم الخفية — لم يُبنَ، فقط إسقاط بسيط (`MerchantAgreement`)
- ❌ لوحة تحكم التاجر (UI) — مخطَّطة لليوم 4 لاحقاً/اليوم 5

## Requirements — الفعلي مقابل المخطَّط

| المتطلب | الحالة |
|---|---|
| جدول merchants | `IMPLEMENTED` |
| RLS يمنع كتابة anon على merchants | `IMPLEMENTED` (تحقَّق منه مباشرة أثناء بناء اختبار العزل) |
| products.tenant_id | `IMPLEMENTED` |
| MerchantRepository (findById/findBySlug/findByOwnerId/create) | `IMPLEMENTED` |
| MerchantService (validateRegistration, canAccessTenant, isOwner) | `IMPLEMENTED` |
| CatalogRepository.findProductsByTenant | `IMPLEMENTED` + **مُختبَر فعلياً** (عزل تاجر وهمي = صفر منتجات) |
| MerchantAgreement (عقد BR-007 الكامل) | `PARTIALLY_IMPLEMENTED` — نوع فقط، لا منطق منع رسوم مخفية فعلي |
| واجهة تسجيل تاجر | `NOT_IMPLEMENTED` |

## Business Rules

- BR-007 (الشفافية المطلقة / Zero Hidden Fees) — `commissionRate` رقم واحد شفاف لكل تاجر، لا رسوم مركّبة، لكن **لا إنفاذ برمجي كامل بعد** لمنع إضافة رسوم لاحقة خارج هذا الرقم. راجع `docs/BUSINESS_RULES.md`.
- BR-008 (حرية الأجهزة) — لا صلة مباشرة بكود اليوم 4، محقَّقة تلقائياً عبر اختيار Next.js.
- BR-009/BR-010/BR-011 — تعتمد على Orders/تيسير/AgentAssignment، خارج نطاق هذا الـSpec.

## UX Requirements

`UNKNOWN` — لا تصميم بوابة تاجر موثَّق بعد.

## Technical Requirements

```
src/core/modules/merchant/
  ├── types.ts (Merchant, MerchantAgreement, MerchantRegistrationInput)
  ├── merchant.service.ts (validateRegistration, canAccessTenant, isOwner, toAgreement)
  └── merchant.repository.ts (findById, findBySlug, findByOwnerId, create)

src/core/modules/catalog/
  ├── types.ts (Product.tenantId: string | null — أُضيف)
  └── catalog.repository.ts (findProductsByTenant — أُضيف)
```

## Security Requirements

القاعدة الذهبية (`CONSTITUTION §5`): `tenant_id` يُقارَن دائماً بـ `Session.tenantId` القادم من JWT، لا بما يرسله العميل. مُطبَّقة في `MerchantService.canAccessTenant()` — **لكن `Session` نفسه لا يزال نوعاً بلا ربط فعلي بـ Supabase Auth** (نفس الفجوة الموثَّقة في `specs/identity/SPEC.md`)، لذا التحقق حالياً منطقي فقط، غير مفعَّل عبر مسار مصادقة حقيقي.

## Acceptance Criteria (للحالة الحالية "PARTIALLY_IMPLEMENTED")

- [x] جدول merchants موجود مع RLS يمنع كتابة anon
- [x] منتج حقيقي مربوط بتاجر حقيقي عبر tenant_id
- [x] اختبار عزل فعلي: تاجر وهمي لا يرى منتجات تاجر آخر (0 نتائج)
- [x] `canAccessTenant` يرفض جلسة بـ tenantId مختلف
- [x] `npx tsc --noEmit` بلا أخطاء
- [ ] تسجيل تاجر فعلي عبر واجهة — **غير مكتمل**
- [ ] ربط Session بمصادقة حقيقية — **غير مكتمل**

## Dependencies

- `specs/identity/SPEC.md` (Session/Auth الحقيقي — لم يكتمل بعد)
- `docs/BUSINESS_RULES.md` BR-007 (يتطلب نطاق MerchantAgreement كامل لاحقاً)

## قرارات اتُّخذت أثناء التنفيذ ولم تكن موثَّقة صراحة قبله

- `commissionRate` نسبة مئوية عائمة لكل تاجر (0–100)، لا شرائح ثابتة مبرمجة حسب الفئة — قرار عملي لتجنّب تشفير أرقام الدستور المؤقتة (§8) في الكود قبل اعتمادها نهائياً. `Evidence: INFERRED`.
- تعريف SQL لجدول `merchants` في `docs/DATABASE.md` أُعيد بناؤه استنتاجياً من فحص الأعمدة الفعلية عبر الاستعلامات — لا نص SQL أصلي محفوظ في المستودع.

## أجزاء تحتاج إعادة نظر

- `MerchantAgreement` (BR-007) إسقاط بسيط فقط — لا يمنع فعلياً إضافة رسوم مستقبلية، فقط يعرض الرقم الحالي.
- لا سياسة RLS موثَّقة النص الدقيق لجدول merchants (نُفِّذت مباشرة عبر SQL Editor).

## Open Questions

1. هل نبني `sessions` أو نعتمد Supabase Auth مباشرة؟ (نفس سؤال Identity، يؤثر مباشرة على تفعيل `canAccessTenant` فعلياً)
2. متى يُبنى نطاق `MerchantAgreement` الكامل لإنفاذ BR-007 برمجياً؟

## Status

`PARTIALLY_IMPLEMENTED` — عزل بيانات فعلي ومُختبَر على مستوى القراءة، لا تسجيل تاجر عبر واجهة، لا مصادقة حقيقية بعد.
