---
title: عقود الـ API
status: PROPOSED (لا يوجد API خارجي فعلي بعد)
version: 1.0
last_updated: 2026-09-01
owner: Claude + المؤسس
source_of_truth: هذا الملف
---

# عقود الـ API

> **ملاحظة صادقة:** هذا الملف رقيق عمداً الآن. لا يوجد REST/GraphQL API خارجي حقيقي بعد — الأيام 1-3 استخدمت Repository Pattern مباشر (`catalog.repository.ts` يستدعي Supabase مباشرة من داخل الخادم). أول حاجة فعلية لعقد API واضح متوقعة عند بناء Checkout (اليوم 7، `SALSABIL_CONSTITUTION.md §23`).

---

## 1. Conventions المقترحة (PROPOSED، لم تُطبَّق بعد لعدم وجود API فعلي)

- Naming: REST-style، جمع للموارد (`/api/orders` لا `/api/order`)
- كل استجابة خطأ: `{ error: { code: string, message: string } }` — شكل موحَّد مقترح، غير معتمد رسمياً
- Pagination: `?page=&limit=` — مقترح، لا استخدام فعلي بعد
- Versioning: غير محسوم — `OPEN_QUESTION`

---

## 2. Authentication/Authorization على مستوى API — `OPEN_QUESTION`

كيف تتحقق نقطة API من الهوية والصلاحية (Bearer token؟ Supabase session مباشرة؟) — غير محسوم لعدم وجود نقاط API فعلية بعد.

---

## 3. الأحداث كجزء من العقد — `PROPOSED`

عند بناء سجل الأحداث المركزي (`Events Engine`, CONCEPTUAL)، سيُحدَّد هنا هل الأحداث جزء من عقد الـ API (Webhooks للمزوّدين الخارجيين) أم داخلية فقط.

---

## 4. لا APIs مخترَعة

هذا الملف **لا يحتوي أي endpoint فعلي** لأنه لا يوجد بعد. سيُملأ تدريجياً بدءاً من Checkout (اليوم 7) وOrders (اليوم 8) في `SALSABIL_CONSTITUTION.md §23`.
