---
title: مرجع الأمن
status: ACTIVE
version: 1.1
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

## 3. Multi-Tenancy Isolation — Evidence: `PARTIALLY_IMPLEMENTED` (اليوم 4)

المبدأ: `tenant_id` من الجلسة/JWT فقط، أبداً من طلب العميل. `products.tenant_id` **موجود فعلياً** ويُشير إلى `merchants.id` (`DATABASE.md §2-3`)، وعزل القراءة مُختبَر (`CatalogRepository.findProductsByTenant()`). **الفجوة المتبقية:** لا مصادقة حقيقية بعد، فـ`Session.tenantId` الذي يُفترَض أن يأتي من JWT لا يزال نوع TypeScript فقط بلا ربط فعلي بـSupabase Auth (`specs/identity/SPEC.md`) — التحقق منطقي (`MerchantService.canAccessTenant()`) لا مُفعَّل عبر مسار مصادقة حقيقي.

## 4. JWT — Evidence: `PROPOSED`

Supabase يصدر JWT تلقائياً عبر Auth. **لم يُستخدَم فعلياً في أي منطق تحقق بعد.**

## 5. Row-Level Security (RLS) وأنماط الوصول لقاعدة البيانات — Evidence: `IMPLEMENTED` (نمطان مختلفان الآن)

راجع `DATABASE.md §6` للجدول الكامل. يوجد نمطان مطبَّقان فعلياً، لكل منهما استخدام مختلف تماماً — **لا تخلط بينهما:**

**النمط 1 — قراءة عامة، مفتاح `anon`:** `categories`, `products`, `inventory`. RLS يسمح بالقراءة للجميع (بيانات كتالوج عامة بطبيعتها). **سياسات الكتابة (Insert/Update/Delete) على هذه الجداول لا تزال غير موجودة/موثَّقة — `OPEN_QUESTION`.**

**النمط 2 — قفل كامل، مفتاح `service_role` (اليوم 7، `ADR-008`):** `merchants`, `carts`, `cart_items`. RLS مفعَّل **بلا أي policy إطلاقاً** — هذا يمنع `anon`/`authenticated` تماماً، بما في ذلك القراءة. كل وصول (قراءة وكتابة) يمر حصرياً عبر `src/core/kernel/database/supabase-admin-client.ts` (مفتاح `service_role`، خادم فقط، محمي بحزمة `server-only` لمنع تسرّبه لأي Client Component). **متى يُستخدَم هذا النمط:** عندما يكتب بيانات مستخدم غير مُصادَق عليه حقيقياً (سلة الزائر عبر `session_token`) — RLS مسموح لـ`anon` في هذه الحالة لا يوفر حماية فعلية أصلاً، لأن مفتاح `anon` نفسه علني ولا يميّز بين طالب شرعي وآخر يخمّن معرّفات (كان سيخالف §2 أدناه). **قاعدة القرار لأي جدول جديد:** بيانات قراءتها عامة وآمنة للجميع ← النمط 1. بيانات خاصة بصاحبها ولا مصادقة حقيقية تحميها ← النمط 2، لا نمط وسط "RLS مفتوح لـanon باعتماد على صعوبة تخمين معرّف" (غير آمن، راجع `DECISIONS.md → ADR-008` للنقاش الكامل).

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

1. سياسات RLS للكتابة على `users`/`categories`/`products`/`inventory` (النمط 1، قراءة عامة) — لا تزال غير موجودة. **محسومة بالفعل لـ`merchants`/`carts`/`cart_items` (النمط 2، قفل كامل + service_role) منذ اليوم 7.**
2. من يملك حق إنشاء `users` جديد (Auth مباشرة أم service مخصص؟) — لا يزال `OPEN_QUESTION` عاماً؛ نمط "ابحث أو أنشئ بالهاتف عبر service_role" مقترح تحديداً لسياق Checkout (`CHECKOUT-001`، غير مُنفَّذ بعد وقت كتابة هذا السطر)، لا حلاً شاملاً لبقية المسارات (تسجيل تاجر، دخول حقيقي)
3. Rate limiting — لا رقم ولا آلية محددة
4. Soft Delete مقابل Hard Delete — غير محسوم (`DATABASE.md §7`)
5. BR-016 (الحد الأدنى لقيمة الطلب) — لا رقم معتمد (`docs/BUSINESS_RULES.md`)
6. متى تُبنى `sessions`/تسجيل الدخول الحقيقي — يبقى شرطاً لتفعيل §3 أعلاه فعلياً لا منطقياً فقط
