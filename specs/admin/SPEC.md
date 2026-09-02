---
title: Spec — Admin (لوحة الإدارة الأساسية)
status: PARTIALLY_IMPLEMENTED
version: 1.0
last_updated: 2026-09-02
owner: Claude (تنفيذ) + المؤسس (اعتماد)
source_of_truth: هذا الملف يوثّق التطابق/الفجوة — الكود الفعلي (`src/core/modules/admin/`) هو الحقيقة النهائية
---

# Spec — Admin (لوحة الإدارة الأساسية)

> خُطِّط قبل التنفيذ (`ADR-013`)، عبر نفس دورة Specification → Plan → Review المتبعة منذ اليوم 8.

---

## Purpose

بوابة الإدارة الثالثة (`CONSTITUTION §5/§8`، بعد Customer App وMerchant Portal) — رؤية `platform_admin` عبر كل التجار والطلبات بلا قيد تاجر واحد، مع القدرة على تفعيل/تعطيل تاجر ومتابعة سجل التدقيق.

## Problem

اليوم 10 بنى بوابة تاجر حقيقية لكن كل تاجر يرى بياناته فقط (بتصميم، عزل مستأجرين). لا رؤية مركزية عبر كل النظام — لا طريقة لمراقبة كل الطلبات، إدارة التجار، أو استعراض سجل التدقيق دون وصول مباشر لقاعدة البيانات.

## Scope (اليوم 11)

- تسجيل دخول `platform_admin` بالهاتف بلا كلمة مرور (`AdminService.loginByPhone`) — نفس نمط `MerchantService.loginOwnerByPhone` حرفياً
- جلسة إدارة بكوكي مستقل (`sb_admin_session`) — نفس جدول `sessions` الموجود من اليوم 10، `tenantId: null` دائماً
- إدارة التجار: قائمة كاملة + تفعيل/تعطيل (`merchants.is_active`) — **لا أي عملية أخرى**
- كل الطلبات بلا تصفية تاجر + تحكم كامل بالحالة (`platform_admin` مخوَّل فعلياً منذ اليوم 9)
- سجل تدقيق عام: آخر 50 قيداً من `order_status_history` الموجود فعلياً — **لا جدول `audit_log` جديد**
- تعميم `MerchantOrderRow` → `OrderRow` (مكوّن مشترك بين بوابتي التاجر والإدارة)

## Non-Goals (صراحة، هذه المرحلة)

- ❌ `audit_log` عام يغطي كل إجراء إداري (بما فيها تفعيل/تعطيل التاجر نفسه) — مخطَّط دستورياً لليوم 12 (يوم الأمان) تحديداً، ليس اليوم 11
- ❌ تعديل عمولة تاجر، حذف تاجر، تسجيل تاجر جديد عبر لوحة الإدارة
- ❌ إدارة العملاء (قائمة/حظر) — لم يُطلَب صراحة، خارج المحددات الهندسية المعتمدة
- ❌ GMV/تحليلات مبيعات (مذكورة في `CONSTITUTION §23` اليوم 10 الأصلي) — نطاق اليوم ضُيِّق صراحة لثلاثة أقسام فقط (تجار، طلبات، تدقيق)
- ❌ أدوار إدارية متعددة (كلها `platform_admin` واحد، لا تدرّج صلاحيات إداري)
- ❌ كلمة مرور/OTP لتسجيل دخول الإدارة — نفس خطر `ADR-012`، أشد حساسية هنا

## آلة الحالات وأدوار الفاعلين

لا جديد — تُعاد استخدام `ORDER_TRANSITIONS`/`ORDER_TRANSITION_ACTORS` من `specs/orders/README.md` حرفياً بلا تعديل. `platform_admin` مخوَّل لكل انتقال منذ اليوم 9، وغير مقيَّد بـ`tenantId` (`TENANT_SCOPED_ACTOR_ROLES` في `orders/types.ts` لا تشمله).

## Requirements — الفعلي مقابل المخطَّط

| المتطلب | الحالة |
|---|---|
| `AdminService.loginByPhone` | `IMPLEMENTED` — يرفض هاتفاً غير مسجَّل أو مسجَّلاً بدور غير `platform_admin` |
| `admin-session.ts` (كوكي مستقل + فحص role صريح) | `IMPLEMENTED` |
| `merchantRepository.findAll`/`setActiveStatus` + تغليف `merchantService` | `IMPLEMENTED` |
| `ordersRepository.findAll`/`findAllStatusHistory` + تغليف `ordersService.getAllOrders`/`getRecentStatusHistory` | `IMPLEMENTED` |
| `src/app/admin/dashboard/` (تجار + طلبات + تدقيق في صفحة واحدة) | `IMPLEMENTED` — مُتحقَّق منها في متصفح حقيقي |
| `OrderRow` مُعمَّم (كان `MerchantOrderRow`) | `IMPLEMENTED` — يُستخدَم من `merchant/orders` و`admin/dashboard` بنفس الملف |
| مستخدم `platform_admin` تجريبي أول | `IMPLEMENTED` (يدوياً عبر `service_role`، هاتف `01000000001`) |

## Business Rules

لا قاعدة عمل جديدة مباشرة. `BR-009` (عدالة المسؤولية المادية) لا تزال تعتمد على `audit_log` العام (`CONCEPTUAL`، اليوم 12) لتحديد الطرف المقصر آلياً — لوحة الإدارة اليوم تعرض `order_status_history` كقراءة يدوية فقط، لا تحليلاً آلياً.

## UX Requirements

`IMPLEMENTED` (أولي) — صفحة واحدة بثلاثة أقسام رأسية: التجار (بطاقة لكل تاجر + زر تبديل)، الطلبات (نفس `OrderRow` من بوابة التاجر)، سجل التدقيق (قائمة نصية مضغوطة: رقم طلب مختصر، من→إلى، الفاعل، الوقت). `data-world="diwan"` (لا `reef`) — الإدارة تشرف على المنظومة كلها، لا عالماً تجارياً واحداً.

## Technical Requirements

```
src/core/modules/admin/
  ├── admin.service.ts   (loginByPhone, listMerchants, setMerchantActiveStatus)
  └── admin-session.ts   (getAdminSession + فحص role صريح، setAdminSessionCookie, clearAdminSessionCookie)

src/core/modules/merchant/
  ├── merchant.repository.ts  (+ findAll, setActiveStatus)
  └── merchant.service.ts     (+ listAll, setActiveStatus — تغليف رقيق)

src/core/modules/orders/
  ├── orders.repository.ts  (+ findAll, findAllStatusHistory)
  └── orders.service.ts     (+ getAllOrders, getRecentStatusHistory)

src/app/admin/
  ├── layout.tsx (data-world="diwan")
  ├── page.tsx (redirect → /dashboard)
  ├── login/ (page.tsx, actions.ts)
  └── dashboard/ (page.tsx, actions.ts)

src/components/
  ├── AdminLoginForm.tsx
  ├── AdminMerchantRow.tsx
  └── OrderRow.tsx (مُعمَّم من MerchantOrderRow.tsx — يُستخدَم من merchant/ وadmin/ معاً)
```

## Security Requirements

- **كوكي منفصل تماماً** (`sb_admin_session` ≠ `sb_merchant_session`) — تسجيل دخول تاجر لا يمنح وصولاً إدارياً إطلاقاً، مُتحقَّق منه فعلياً في متصفح حقيقي (جلسة تاجر نشطة + محاولة فتح `/admin/dashboard` → إعادة توجيه لتسجيل دخول الإدارة).
- **فحص `role` صريح في `getAdminSession()`** — يمنع سيناريو نظري: نسخ رمز جلسة تاجر يدوياً لكوكي `sb_admin_session` (عبر أدوات المطوّر) لا يمنح وصولاً، لأن `role !== 'platform_admin'` تُرفض صراحة. **مُختبَر حياً** (تكامل): جلسة تاجر حقيقية تُبنى، تُقرأ عبر نفس آلية `validateSessionToken` التي يستخدمها `getAdminSession()`، ويُتحقَّق أن `role` المُعادة ليست `platform_admin`.
- **⚠️ خطر أمني معروف ومقبول مؤقتاً (نفس فئة `ADR-012`، أشد حساسية):** تسجيل دخول الإدارة بالهاتف وحده بلا كلمة مرور — صلاحيات `platform_admin` أوسع بكثير من `merchant_owner` (تحكم كامل بكل تاجر وطلب). **يجب** إغلاقه (كلمة مرور قوية على الأقل، OTP، أو Supabase Auth كاملة) قبل أي استخدام إنتاجي حقيقي — أولوية أعلى من إغلاق الفجوة المكافئة في بوابة التاجر.
- `setMerchantActiveStatus`/`transitionOrderAdminAction` كلاهما يتحققان من `getAdminSession()` قبل أي تنفيذ — لا تنفيذ بلا جلسة صالحة، بلا استثناء.

## Acceptance Criteria (للحالة الحالية)

- [x] دخول إدارة حقيقي بهاتف `platform_admin` حقيقي — نجاح
- [x] رفض هاتف تاجر حقيقي من دخول الإدارة — مُختبَر وحدة، تكاملاً، ومتصفحاً حقيقياً
- [x] رفض رقم غير مسجَّل إطلاقاً
- [x] جلسة تاجر حقيقية لا تُقرَأ كجلسة `platform_admin` (نفس منطق `getAdminSession()`) — مُختبَر تكاملاً حياً
- [x] `listMerchants` يعيد التاجر التجريبي الحقيقي
- [x] دورة تبديل `is_active` كاملة تنعكس في قراءة لاحقة، بلا تعديل أي حقل آخر — مُختبَر تكاملاً حياً
- [x] الإدارة تقرأ طلباً حقيقياً بغض النظر عن التاجر، تغيّر حالته بلا `tenantId`، ويظهر في سجل التدقيق — مُختبَر تكاملاً حياً
- [x] بوابة إدارة فعلية: دخول → تجار + طلبات + تدقيق → تبديل تاجر → تأكيد طلب → تحديث حي — مُتحقَّق منه في متصفح حقيقي
- [x] جلسة تاجر لا تمنح وصولاً لمسارات الإدارة (كوكي منفصل) — مُتحقَّق منه في متصفح حقيقي
- [x] `npx tsc --noEmit`، `npm run arch:check`، `npm test` (72/72) بلا أخطاء

## Dependencies

- `specs/merchant/SPEC.md` (نمط الجلسة، `sessions`، `ADR-012`)
- `specs/orders/README.md` (`ORDER_TRANSITION_ACTORS`، `getAllOrders`/`getRecentStatusHistory` جديدان هنا)
- `docs/DATABASE.md §sessions` (نفس الجدول، بلا تعديل بنيوي)

## قرارات اتُّخذت أثناء التنفيذ ولم تكن نصاً حرفياً في الطلب الأصلي

- **فحص `role === 'platform_admin'` الصريح في `getAdminSession()`** لم يُطلَب حرفياً، لكنه ضروري معمارياً: `merchant-session.ts` يُدافَع عنها ضمنياً بفحص `tenantId` الموجود أصلاً في منطق الأعمال (Server Actions ترفض `!session.tenantId`)، لكن جلسات الإدارة `tenantId` فيها `null` دائماً بتصميم، فهذا الفحص الضمني لا يحميها — الفحص الصريح هو المعادل الوحيد الممكن. موثَّق في `ADR-013`.
- **`OrderRow` مُعمَّم بدل مكوّن إداري منفصل** — طلب المؤسس صراحة "إعادة استخدام مكوّن إدارة الطلبات"، نُفِّذ عبر تحويل استيراد Server Action ثابت إلى `prop` قابل للحقن، بدل تكرار ~60 سطراً من JSX/منطق تفاعل مطابق تقريباً.

## أجزاء تحتاج إعادة نظر

- ~~إجراء تفعيل/تعطيل التاجر لا يُسجَّل في أي سجل تدقيق حالياً~~ **أُغلِقت اليوم 12 (`ADR-014`)** — `AdminService.setMerchantActiveStatus` يستقبل الفاعل الآن ويسجِّل `merchant.activated`/`merchant.deactivated` في `audit_log` العام، مُختبَر حياً (`admin.integration.test.ts`).
- `getRecentStatusHistory` بحد ثابت (50) بلا Pagination حقيقي — مقبول لحجم البيانات التجريبي الحالي.
- **جديد (اليوم 12):** `setMerchantActiveStatusAction`/`transitionOrderAdminAction` بلا تحديد معدل — نطاق Rate Limiting اليوم يغطي الدخول فقط (`docs/SECURITY.md` §12)، لا عمليات لوحة الإدارة بعد الدخول.

## Open Questions

1. **متى تُستبدَل جلسة الهاتف المصغّرة لكل من التاجر والإدارة بمصادقة حقيقية؟** أولوية الإدارة أعلى (صلاحيات أوسع) — يحتاج قراراً صريحاً قبل أي بيانات إنتاجية حقيقية. **تخفيف مؤقت أُضيف اليوم 12 (`ADR-014`):** تحديد معدل (5 محاولات/15 دقيقة) + تسجيل كل محاولة دخول في `audit_log` — لا يُغلِق هذا السؤال، فقط يقلّل الضرر ريثما يُحسَم.
2. **هل تحتاج المنصة أدواراً إدارية متعددة (Super Admin مقابل Support مثلاً) مستقبلاً؟** الآن دور `platform_admin` واحد بصلاحيات كاملة بلا تدرّج.
3. ~~متى يُبنى `audit_log` العام (اليوم 12) ليشمل إجراءات مثل تفعيل/تعطيل التاجر؟~~ **أُغلِقت — راجع أعلاه.**

## Status

`PARTIALLY_IMPLEMENTED` — تسجيل دخول (بتحديد معدل وتسجيل تدقيق اليوم 12)، إدارة تجار (بسجل تدقيق عام كامل الآن)، رؤية/تحكم طلبات شاملة، وسجل تدقيق الطلبات كلها `IMPLEMENTED` ومُختبَرة حياً (وحدة + تكامل + متصفح حقيقي بما فيه اختبارات أمنية سلبية). لا كلمة مرور/تحقق ثانٍ بعد — يبقى Open Question 1.
