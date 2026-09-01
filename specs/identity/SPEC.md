---
title: Spec — Identity (خليل، النسخة التقنية الأساسية)
status: PARTIALLY_IMPLEMENTED
version: 1.0 (رجعي — كُتب بعد التنفيذ الجزئي، لا قبله)
last_updated: 2026-09-01
owner: Claude (توثيق رجعي) + المؤسس (اعتماد)
source_of_truth: هذا الملف يوثّق التطابق/الفجوة بين النية والتنفيذ — الكود الفعلي هو الحقيقة النهائية لما يعمل الآن
---

# Spec — Identity (خليل)

> **ملاحظة منهجية:** هذا Spec رجعي (Retroactive). الكود سبق كتابة هذا الملف (اليوم 1-2 من الخطة). الهدف: مرآة دقيقة لما حدث، لا إعادة كتابة تاريخ ولا اختراع متطلبات لم تكن موجودة.

---

## Purpose

توفير محرك هوية وسياق أساسي (من المستخدم؟ ما دوره؟) تعتمد عليه كل النطاقات الأخرى.

## Problem

بلا هوية موحَّدة، كل نطاق يحتاج إعادة بناء منطق "من هذا المستخدم" بنفسه — تكرار وتضارب محتمل.

## Scope (كما كان مقصوداً حسب الدستور، §7.10, §8)

- مستخدمون (Users) بأدوار خمسة
- جلسات (Sessions)
- سياق (World / Jurisdiction)
- تحقق أساسي من الصلاحيات (RBAC بسيط)

## Non-Goals (صراحة، حسب الدستور)

- ❌ لا "تحوّل شخصي" عميق (تتبع عادات/إنتاجية/صحة) — مؤجَّل لمرحلة لاحقة صراحة (`CONSTITUTION §7.10`)
- ❌ لا نظام حوكمة معقّد (Nizam) — منفصل، غير مبني بعد

## Requirements — الوضع الفعلي مقابل المخطَّط

| المتطلب (من الدستور) | الحالة الفعلية |
|---|---|
| جدول users بأدوار خمسة | `IMPLEMENTED` — الجدول موجود بالضبط بالأدوار الخمسة |
| RLS على users | `IMPLEMENTED` — سياسة قراءة الذات فقط |
| تسجيل دخول فعلي | `NOT_IMPLEMENTED` — لا صفحة/منطق تسجيل دخول حتى الآن |
| Session (كنوع TypeScript) | `IMPLEMENTED` كنوع (`types.ts`)، `NOT_IMPLEMENTED` كجدول فعلي أو منطق ربط بـ Supabase Auth |
| Tenant (ضمن السياق) | `IMPLEMENTED` كنوع فقط (`Tenant` interface)، لا جدول فعلي (`merchants`/`stores` غير موجودين — مخطَّط لليوم 4) |
| hasRole() — تحقق الدور | `IMPLEMENTED` كدالة، `NOT_INTEGRATED` — لا مسار API أو صفحة تستدعيها فعلياً بعد |
| isSessionValid() | `IMPLEMENTED` كدالة، لا استخدام فعلي (لا جلسات حقيقية بعد) |
| canAccessTenant() | `IMPLEMENTED` كدالة، لا استخدام فعلي |

## Business Rules

لا قاعدة عمل خاصة بـ Identity وحدها بعد بمعزل عن باقي النظام — راجع `docs/BUSINESS_RULES.md` للقواعد العامة.

## UX Requirements

`UNKNOWN` — لا تصميم واجهة تسجيل دخول موثَّق بعد.

## Technical Requirements

بنية الملفات المطبَّقة فعلياً:
```
src/core/kernel/khalil/
  ├── types.ts (User, Session, Tenant, UserRole)
  ├── khalil.service.ts (KhalilService: hasRole, isSessionValid, canAccessTenant)
  └── khalil.repository.ts (findUserByPhone — يستدعي Supabase)
```

## Security Requirements

RLS مفعَّل على `users` (`IMPLEMENTED`). لا سياسات Insert/Update/Delete بعد (`OPEN_QUESTION`، راجع `docs/SECURITY.md §2`).

## Acceptance Criteria (للحالة الحالية "PARTIALLY_IMPLEMENTED")

- [x] جدول users موجود مع RLS
- [x] الأدوار الخمسة معرَّفة ومطابقة للدستور
- [x] الاتصال بقاعدة البيانات مُختبَر وناجح (اليوم 2)
- [ ] تسجيل دخول فعلي يعمل — **غير مكتمل**
- [ ] KhalilService مربوط فعلياً بأي مسار حماية — **غير مكتمل**

## Dependencies

- Supabase Auth (لم يُستخدَم فعلياً بعد رغم وجوده كخدمة)
- جدول merchants/stores (لليوم 4) لإكمال مفهوم Tenant

## قرارات اتُّخذت أثناء التنفيذ ولم تكن في الدستور صراحة

- تسمية الدوال بالإنجليزية بينما التعليقات بالعربية — نمط غير موثَّق مسبقاً كقاعدة، لكنه الأسلوب المتبع فعلياً في كل الكود حتى الآن (`INFERRED`)

## أجزاء تحتاج إعادة نظر

- **العلاقة بين `Session` (النوع الحالي) وSupabase Auth الفعلي** غير مصمَّمة بعد — هل نبني جدول `sessions` منفصل، أم نعتمد كلياً على جلسات Supabase Auth الجاهزة؟ `OPEN_QUESTION`

## Open Questions

1. هل ننشئ جدول `sessions` مخصصاً، أم نكتفي بـ Supabase Auth مباشرة؟
2. متى تُبنى صفحة تسجيل الدخول فعلياً؟ (متوقَّع اليوم 4-5 حسب §23، غير مؤكَّد بدقة)

## Status

`PARTIALLY_IMPLEMENTED` — الأساس التقني (types + منطق تحقق) موجود، الربط الفعلي بتدفق مستخدم حقيقي غير موجود بعد.
