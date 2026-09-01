---
title: مرجع الأمن
status: ACTIVE
version: 1.0
last_updated: 2026-09-01
owner: المؤسس (أبوحتاب)
source_of_truth: هذا الملف (التفصيل)، SALSABIL_CONSTITUTION.md §4, §26 (المبدأ)
---

# مرجع الأمن

---

## 1. Authentication — Evidence: `PROPOSED`

المزوَّد: Supabase Auth (مخطَّط، غير مفعَّل بعد فعلياً — لا صفحة تسجيل دخول موجودة، اليوم 4 من الخطة).

## 2. Authorization / RBAC — Evidence: `PARTIALLY_IMPLEMENTED`

الأدوار الخمسة معرَّفة كـ `UserRole` في `khalil/types.ts`: `platform_admin`, `merchant_owner`, `merchant_manager`, `employee`, `customer`. **منطق التحقق موجود** (`KhalilService.hasRole()`) لكن **غير مربوط بأي مسار API أو صفحة فعلية بعد** — لا Middleware يستدعيه حالياً.

## 3. Multi-Tenancy Isolation — Evidence: `CONSTITUTION`, حالة `NOT_YET_APPLICABLE`

المبدأ: `tenant_id` من JWT فقط، أبداً من طلب العميل. **لا ينطبق تقنياً بعد** لعدم وجود `tenant_id` في أي جدول حالياً (راجع `DATABASE.md §2`).

## 4. JWT — Evidence: `PROPOSED`

Supabase يصدر JWT تلقائياً عبر Auth. **لم يُستخدَم فعلياً في أي منطق تحقق بعد.**

## 5. Row-Level Security (RLS) — Evidence: `IMPLEMENTED` (جزئياً)

راجع `DATABASE.md §6` للجدول الكامل. **سياسات القراءة فقط موجودة، سياسات الكتابة `OPEN_QUESTION` غير محسومة.**

## 6. Server-Side Validation — Evidence: `IMPLEMENTED` (في Catalog)

`CatalogService.calculatePrice()` يعيد حساب السعر من الخادم دائماً، لا يثق بأي رقم من العميل — هذا أول تطبيق فعلي لمبدأ `SALSABIL_CONSTITUTION.md §4` بند 2.

## 7. الأسعار والحسابات — Evidence: `CONSTITUTION`, `IMPLEMENTED` جزئياً

قاعدة صارمة: كل حساب سعر يحدث في `service.ts` فقط، مرة واحدة لكل منطق، لا يُكرَّر (`SALSABIL_CONSTITUTION.md §4` بند 2). حالياً محقَّقة في `CatalogService` فقط — لا يوجد بعد منطق سعر في Orders (لأنه غير موجود).

## 8. الدفع — Evidence: `PROPOSED`

لا تنفيذ فعلي — واجهة `PaymentProvider` مفهومية فقط (`ARCHITECTURE.md §4`).

## 9. Audit Logs — Evidence: `CONCEPTUAL`

جدول `audit_log` مخطَّط (`DATABASE.md §4`)، غير منفَّذ. مخطَّط لليوم 11 من §23.

## 10. حماية البيانات / Secrets — Evidence: `IMPLEMENTED`

مفاتيح Supabase في `.env.local`، مُستثناة من Git عبر `.gitignore` (`.env*.local`) — **تم التحقق فعلياً في اليوم 2.**

## 11. API Security — Evidence: `NOT_YET_APPLICABLE`

لا API خارجية مكشوفة بعد (راجع `API_CONTRACTS.md`).

## 12. Rate Limiting — Evidence: `OPEN_QUESTION`

مذكور كمبدأ في `SALSABIL_CONSTITUTION.md §26` بلا تفاصيل (لا رقم، لا آلية). **لا يُخترع هنا — يبقى `OPEN_QUESTION` حتى قرار صريح.**

## 13. عدم الثقة في بيانات العميل — Evidence: `CONSTITUTION`, `IMPLEMENTED` جزئياً

مطبَّق في `CatalogService.validateOptions()` (يتحقق أن كل خيار مُرسَل من العميل موجود فعلياً في خيارات المنتج قبل قبوله).

## 14. العمليات الحساسة و Human Approval — Evidence: `CONSTITUTION` §4 بند 4

حكيم (Hakim) بحق نقض بشري كامل في كل قرار مالي أو حرج — `ACTIVE` كمبدأ، `NOT_YET_APPLICABLE` تقنياً (حكيم غير مبني بعد).

---

## قائمة OPEN_QUESTIONS الأمنية المجمَّعة

1. سياسات RLS للكتابة (Insert/Update/Delete) — غير موجودة على أي جدول
2. من يملك حق إنشاء `users` جديد (Auth مباشرة أم service مخصص؟)
3. Rate limiting — لا رقم ولا آلية محددة
4. Soft Delete مقابل Hard Delete — غير محسوم (`DATABASE.md §7`)
