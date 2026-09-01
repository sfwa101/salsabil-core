---
title: سجل التغييرات
status: ACTIVE
version: 1.0
last_updated: 2026-09-01
owner: Claude (تلقائي مع كل مهمة كبيرة)
source_of_truth: هذا الملف + Git log
---

# سجل التغييرات

> يُسجَّل هنا فقط التغييرات المهمة (معمارية، قواعد أعمال، قاعدة بيانات، أمان، UX، قرارات، خارطة طريق) — لا كل commit صغير.

---

## 2026-09-01 (اليوم 4) — نطاق التاجر وتعدد المستأجرين (Merchant Domain & Multi-Tenancy)
- إنشاء جدول merchants + عمود products.tenant_id في Supabase
- إنشاء src/core/modules/merchant/ (types.ts, merchant.service.ts, merchant.repository.ts)
- تحديث src/core/modules/catalog/ (types.ts, catalog.repository.ts) لدعم tenantId وfindProductsByTenant
- تحقق فعلي: عزل تاجر وهمي (0 منتجات)، ربط منتج حقيقي بتاجر حقيقي، رفض جلسة تاجر آخر عبر canAccessTenant
- كتابة specs/merchant/SPEC.md رجعياً، تحديث specs/catalog/SPEC.md وdocs/DATABASE.md
- ملاحظة: specs/identity/SPEC.md وdocs/BUSINESS_RULES.md (BR-007..BR-011) لم يكونا موجودين في المستودع عند بدء اليوم 4، ووصلا لاحقاً ضمن نظام التوثيق أدناه

## 2026-09-01 — نظام التوثيق الرسمي (docs/, specs/, ideas/)
- إنشاء كامل نظام التوثيق: 15 ملفاً في docs/، بنية specs/، ideas/IDEAS.md وARCHIVED.md
- تسجيل 5 ADRs رجعية (ADR-001 إلى ADR-004 معتمدة، ADR-005 مقترحة)
- تسجيل 3 تعارضات (CONFLICT-001, 002, 003) — راجع docs/DECISIONS.md
- اعتماد 5 قواعد عدالة تجار جديدة (BR-007 إلى BR-011) بحالة ACCEPTED / FOUNDER_DECISION

## 2026-08-31 (اليوم 3) — محرك المنتج (Catalog)
- إنشاء جداول: categories, products (options JSONB), inventory
- إنشاء src/core/modules/catalog/ (types.ts, catalog.service.ts, catalog.repository.ts)
- ADR-004: قرار استخدام JSONB للخيارات المرنة بدل أعمدة ثابتة/EAV
- تحقق فعلي: حساب سعر دجاجة بأحجام مختلفة (100/150 جنيه) نجح

## 2026-08-31 (اليوم 2) — الاتصال الفعلي بـ Supabase
- إنشاء مشروع Supabase حقيقي
- إنشاء جدول users مع RLS (سياسة قراءة الذات فقط)
- إنشاء src/core/kernel/database/supabase-client.ts
- إنشاء src/core/kernel/khalil/khalil.repository.ts
- تحقق فعلي: رسالة نجاح الاتصال

## 2026-08-31 (اليوم 1) — Khalil Engine + ملفات الذاكرة
- إنشاء 6 ملفات ذاكرة أولية (AGENTS, ARCHITECTURE, DATABASE, SECURITY, DOMAIN_MAP, ROADMAP — نسخة مبسطة، استُبدلت لاحقاً بنظام التوثيق الكامل في 2026-09-01)
- إنشاء src/core/kernel/khalil/ (types.ts, khalil.service.ts)
- تحقق: npx tsc --noEmit بلا أخطاء

## 2026-08-31 (اليوم 0) — إعداد البيئة
- تثبيت Git, Node.js (LTS), VS Code
- إنشاء مستودع salsabil-core + GitHub repository
- إعداد Next.js + TypeScript + Tailwind الأساسي
