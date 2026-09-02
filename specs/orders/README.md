---
title: Spec — Orders (دورة حياة الطلب)
status: PARTIALLY_IMPLEMENTED
version: 1.1
last_updated: 2026-09-02
owner: Claude (تنفيذ) + المؤسس (اعتماد)
source_of_truth: هذا الملف يوثّق التطابق/الفجوة — الكود الفعلي (`src/core/modules/orders/`) هو الحقيقة النهائية
---

# Spec — Orders (دورة حياة الطلب)

> يحل هذا الملف محل الـ placeholder السابق. اليوم 8 (`CHECKOUT-001`) بنى الإنشاء فقط (`orders`, `order_items`، حالة `pending` ثابتة). اليوم 9 بنى دورة الحياة الكاملة فوق نفس الجداول. اليوم 10 أضاف عزل المستأجرين (`tenantId`) وواجهة تاجر فعلية — راجع `specs/merchant/SPEC.md` للتفصيل الكامل.

---

## Purpose

تتبّع الطلب من لحظة إنشائه (Checkout) وحتى وصوله للعميل أو إلغائه، بسجل تدقيق كامل (من غيّر الحالة، متى، من أي حالة إلى أي حالة) — تطبيق مباشر لـ`CONSTITUTION §4` بند 5.

## Problem

اليوم 8 أنشأ الطلب بحالة `pending` واحدة بلا أي آلية لتغييرها. التاجر لا يملك طريقة لتأكيد الطلب أو رفضه، ولا سجل تدقيق يوثّق ماذا حدث للطلب بعد إنشائه — وهو شرط مسبق لـ`BR-009` (عدالة المسؤولية المادية، `ACCEPTED`) التي تعتمد صراحة على `order_status_history` لتحديد الطرف المقصر آلياً عند حدوث مشكلة.

## Scope (اليوم 9)

- آلة حالات كاملة على عمود `orders.status` (كان بلا `CHECK` عمداً منذ `ADR-009`، حُسم الآن)
- جدول `order_status_history` — سجل تدقيق كامل لكل انتقال
- `OrdersService.transitionStatus()` — تنفيذ انتقال واحد مع تحقق مزدوج (الانتقال مسموح؟ الفاعل مخوَّل؟)
- `OrdersService.getStatusHistory()` — قراءة السجل الكامل لطلب

## Non-Goals (صراحة، هذه المرحلة)

- ❌ ربط فعلي بمندوب توصيل حقيقي (برق) — `out_for_delivery`/`delivered` قابلتان للتفعيل الآن لكن بفاعل تاجر/إدارة مؤقتاً، لا مندوب حقيقي (راجع Open Questions)
- ❌ إشعارات (SMS/Push) عند تغيّر الحالة — غير مبنية
- ❌ صفحة تفاصيل طلب منفصلة — واجهة التاجر (اليوم 10) قائمة واحدة بأزرار مضمَّنة

**تحديث اليوم 10:** واجهة مستخدم (Merchant Portal) وتسجيل الدخول/الجلسات كانا هنا كـNon-Goals — كلاهما `IMPLEMENTED` الآن، راجع `specs/merchant/SPEC.md`.

## آلة الحالات (State Machine)

```
PENDING ──→ CONFIRMED ──→ PREPARING ──→ READY ──→ OUT_FOR_DELIVERY ──→ DELIVERED
   │             │              │           │              │
   └─────────────┴──────────────┴───────────┴──────────────┴──→ CANCELLED
```

- `DELIVERED` و`CANCELLED`: حالتان نهائيتان — لا انتقال منهما إطلاقاً (مُتحقَّق منه: `docs/DATABASE.md` CHECK + `ORDER_TRANSITIONS` في `types.ts` + اختبار تكامل حي).
- لا قفز حالات (`pending → delivered` مباشرة مرفوض).
- `cancelled` مسموحة من أي حالة غير نهائية — مصدرها `BR-009` (`ACCEPTED`)، وليست إضافة خارج الدستور بلا مبرر: راجع `docs/DECISIONS.md → ADR-010`.

مصدر الحقيقة البرمجي الوحيد لهذا المخطط: `ORDER_TRANSITIONS` في `src/core/modules/orders/types.ts` — أي تعديل مستقبلي على الانتقالات المسموحة يبدأ من هناك، ثم يُحدَّث هذا الملف والمخطط أعلاه معاً.

## من يملك حق كل انتقال (Actor Matrix)

| الانتقال | الأدوار المخوَّلة الآن | ملاحظة |
|---|---|---|
| `pending → confirmed` | `merchant_owner`, `merchant_manager`, `employee`, `platform_admin` | — |
| `confirmed → preparing` | نفس الأعلى | — |
| `preparing → ready` | نفس الأعلى | — |
| `ready → out_for_delivery` | نفس الأعلى | ⚠️ مؤقت — راجع Open Question 1 |
| `out_for_delivery → delivered` | نفس الأعلى | ⚠️ مؤقت — راجع Open Question 1 |
| `* → cancelled` | نفس الأعلى فقط | ⚠️ `customer` **غير** مخوَّل حالياً — راجع Open Question 2 |

مصدر الحقيقة البرمجي: `ORDER_TRANSITION_ACTORS` في `types.ts`. **التحقق طبقة تطبيق فقط (`OrdersService.transitionStatus`)، لا RLS** — الجدولان `orders`/`order_status_history` مقفولان بالكامل عبر `service_role` (نفس نمط `ADR-008`/`ADR-009`)، فلا حماية بنيوية من قاعدة البيانات ضد استدعاء داخلي خاطئ للدور. هذا نفس القيد المعروف والمقبول مؤقتاً في كل نطاق Orders حتى بناء Auth حقيقي.

## Requirements — الفعلي مقابل المخطَّط

| المتطلب | الحالة |
|---|---|
| `orders.status` بقيم دورة الحياة الكاملة + `CHECK` constraint | `IMPLEMENTED` — مُطبَّق حياً، مُتحقَّق منه بمحاولة إدراج قيمة غير صحيحة (رُفضت فعلياً) |
| جدول `order_status_history` (audit log) | `IMPLEMENTED` — `CHECK` على `to_status`/`from_status`/`actor_role`، RLS مقفول بالكامل |
| `OrdersService.transitionStatus()` | `IMPLEMENTED` — يرفض انتقالاً غير مسموح وفاعلاً غير مخوَّل، كلاهما برسالة خطأ واضحة لا فشلاً صامتاً |
| قيد أول تلقائي (`null → pending`, `actorRole: 'system'`) عند Checkout | `IMPLEMENTED` — جزء من `OrdersService.checkout()` |
| `OrdersService.getStatusHistory()` | `IMPLEMENTED` |
| `OrdersService.getOrdersForTenant()` | `IMPLEMENTED` (اليوم 10) |
| عزل مستأجرين في `transitionStatus()` (`tenantId`) | `IMPLEMENTED` (اليوم 10، `ADR-012`) — كانت فجوة حقيقية غير مكتشفة منذ اليوم 9 |
| واجهة تاجر لتغيير الحالة | `IMPLEMENTED` (اليوم 10) — `src/app/merchant/orders/`، مُتحقَّق منها في متصفح حقيقي |
| ربط فعلي بمندوب توصيل (برق) | `CONCEPTUAL` — نطاق برق غير مبني |

## Business Rules

- **BR-009** (عدالة المسؤولية المادية، `ACCEPTED`) — هذا الجدول هو المتطلب المباشر الذي كانت تنتظره؛ منطق "من المقصر" نفسه غير مبني بعد (يعتمد أيضاً على `audit_log` العام، `CONCEPTUAL`).
- راجع `docs/BUSINESS_RULES.md` للتفصيل الكامل.

## Technical Requirements

```
src/core/modules/orders/
  ├── types.ts
  │     ├── OrderStatus, ORDER_STATUSES (7 قيم)
  │     ├── ORDER_TRANSITIONS         (مصدر الحقيقة لآلة الحالات)
  │     ├── OrderActorRole, ORDER_TRANSITION_ACTORS (مصدر الحقيقة لمصفوفة الصلاحيات)
  │     └── OrderStatusHistoryEntry, TransitionOrderStatusInput
  ├── orders.repository.ts
  │     ├── updateOrderStatus(orderId, status)
  │     ├── insertStatusHistory(entry)
  │     └── findStatusHistory(orderId)
  └── orders.service.ts
        ├── checkout()            — يُنشئ قيد سجل أول تلقائياً الآن (لم يكن موجوداً اليوم 8)
        ├── transitionStatus()    — تحقق مزدوج: الانتقال؟ ثم الفاعل؟ — بهذا الترتيب تحديداً
        └── getStatusHistory()
```

**قرار تصميم:** التحقق من الانتقال يسبق التحقق من الفاعل (لا العكس) — طلب انتقال غير موجود أصلاً في آلة الحالات يُرفض بغض النظر عمّن طلبه، قبل حتى فحص صلاحياته.

## Security Requirements

- كل انتقال يُسجَّل بـ`actorRole`/`actorId` — لا انتقال بلا فاعل موثَّق (`system` مقبول فقط عند إنشاء الطلب نفسه، لا عند أي انتقال لاحق — `ORDER_TRANSITION_ACTORS.pending` فارغة عمداً لمنع هذا).
- **عزل مستأجرين (اليوم 10، `ADR-012`):** `TransitionOrderStatusInput.tenantId` — إلزامي فعلياً (بالتحقق البرمجي) لأي فاعل بدور تاجر، يُقارَن بـ`order.tenantId` قبل صحة الانتقال نفسها. يمنع تاجراً من تغيير حالة طلب لا يخصه حتى لو عرف `orderId`.
- **جلسة حقيقية الآن (اليوم 10)** — `actorRole`/`actorId`/`tenantId` في بوابة التاجر تأتي من `Session` مُتحقَّق منها عبر `khalilService.validateSessionToken()` (جدول `sessions`، `ADR-012`)، لا من مدخل عميل مباشر. **لكن تسجيل الدخول نفسه بلا كلمة مرور** — أي طرف يعرف هاتف تاجر نشط يحصل على جلسة صحيحة بالكامل. `transitionStatus()` نفسها لا تزال تثق بـ`actorRole`/`tenantId` الواصلين من المستدعي (Server Action) بلا إعادة تحقق مستقلة — الحماية الفعلية الوحيدة هي أن Server Actions لا تُستدعى إلا بعد `getMerchantSession()`.

## Acceptance Criteria (للحالة الحالية)

- [x] `orders.status` يحمل 7 قيم فقط، مفروضة بـ`CHECK` على قاعدة البيانات الحية
- [x] `order_status_history` يُنشأ تلقائياً بقيد `pending` عند كل Checkout
- [x] دورة حياة كاملة (`pending → confirmed → preparing → ready → out_for_delivery → delivered`) تعمل حياً ضد Supabase حقيقي، بسجل متسلسل صحيح (`from`/`to` متطابقان بين كل قيدين متتاليين)
- [x] رفض قفز الحالات (`pending → delivered`) — مُختبَر وحدة وتكاملاً
- [x] رفض الانتقال من حالة نهائية (`delivered → *`, `cancelled → *`) — مُختبَر وحدة وتكاملاً
- [x] رفض فاعل غير مخوَّل (`customer → confirmed`) بلا إنشاء قيد سجل جديد — مُختبَر وحدة وتكاملاً
- [x] الإلغاء (`cancelled`) يعمل من أكثر من حالة وسيطة (وُثِّق من `preparing` تحديداً، لا `pending` فقط)
- [x] عزل مستأجرين: تاجر لا يستطيع تغيير حالة طلب تاجر آخر — مُختبَر وحدة وتكاملاً (اليوم 10)
- [x] واجهة مستخدم فعلية لأي انتقال — `IMPLEMENTED` (اليوم 10)، مُتحقَّق منها في متصفح حقيقي (دخول → عرض → تأكيد → تحديث حي)
- [x] `npx tsc --noEmit` و`npm run arch:check` بلا أخطاء
- [x] `npm test` — 55/55 اختباراً ناجحاً (وحدة + تكامل حي، كامل المشروع)

## Dependencies

- `orders`, `order_items` (اليوم 8، `CHECKOUT-001`) — `IMPLEMENTED`
- `users.role` (`UserRole` من Khalil) — يُعاد استخدامه حرفياً كـ`OrderActorRole` بدل اختراع تصنيف مواز (`AGENTS.md` بند 3: لا تكرار نطاق قائم)
- `specs/merchant/SPEC.md` (اليوم 10 — تسجيل الدخول، الجلسة، بوابة التاجر التي تستهلك هذا النطاق)

## قرارات اتُّخذت أثناء التنفيذ ولم تكن نصاً حرفياً في الدستور

- **إضافة `cancelled` لآلة الحالات:** الدستور (`CONSTITUTION §8`) يذكر فقط المسار الخطي الستة `PENDING → ... → DELIVERED` بلا إلغاء. أُضيفت `cancelled` استناداً لـ`BR-009` (`ACCEPTED`) التي تفترض وجودها صراحة وتنتظر هذا الجدول بالذات — موثَّقة كقرار صريح، لا حسماً صامتاً. راجع `docs/DECISIONS.md → ADR-010`.
- **CHECK constraints على `order_status_history` كاملة** (`to_status`, `from_status`, `actor_role`) بدل الاكتفاء بـ`orders.status` فقط — نفس مبدأ ADR-009 (حسم القيد عند حسم القيم) مطبَّق بالتناظر على جدول التدقيق الجديد.
- **عزل المستأجرين لم يكن جزءاً من خطة اليوم 9 الأصلية** — اكتُشف كفجوة حقيقية أثناء تخطيط اليوم 10 (لا خطر فعلي وقتها، تاجر واحد فقط) وأُغلق فوراً بدل تأجيله، لأن اليوم 10 هو أول يوم تصبح فيه هذه الفجوة قابلة للاستغلال فعلياً (واجهة تاجر حقيقية). راجع `ADR-012`.

## أجزاء تحتاج إعادة نظر

- `updated_at` على `orders` يُحدَّث يدوياً في `orders.repository.ts` (`updateOrderStatus`) عند كل انتقال — لا `trigger` على مستوى قاعدة البيانات (نفس النمط المتبع في كل الجداول الحالية، لا واحد منها يملك trigger). إذا أُضيف تحديث مباشر لـ`orders` من مكان آخر مستقبلاً (خارج `transitionStatus`)، `updated_at` لن يتحدَّث تلقائياً — خطر نسيان يستحق trigger مستقبلاً إذا تكرر النمط.

## Open Questions

1. **من يملك حق `ready → out_for_delivery` و`out_for_delivery → delivered` فعلياً؟** الآن: التاجر/الإدارة يدوياً (مؤقت صراحة). عند بناء برق (نطاق التوصيل)، هذان الانتقالان يجب أن ينتقلا لمندوب حقيقي بهوية موثَّقة — يتطلب `actorRole` جديداً أو نطاقاً منفصلاً بالكامل (`AgentAssignment`، `CONSTITUTION §28.2`). **لم يُحسم بعد.**
2. **هل يحق للعميل نفسه إلغاء طلبه؟** منطقياً نعم (تجربة مستخدم طبيعية)، لكن `customer` مستبعد الآن من `ORDER_TRANSITION_ACTORS.cancelled` عمداً لأن لا مصادقة حقيقية تُثبت أن طالب الإلغاء هو فعلاً صاحب الطلب (`userId` تطابق) — بانتظار Auth حقيقي (`specs/identity/SPEC.md`) قبل فتح هذا المسار للعميل.
3. **حد زمني تلقائي لكل حالة (Timeout/SLA)؟** غير مطروح في هذه المرحلة — لا انتقال تلقائي بالوقت، كل انتقال يتطلب استدعاءً صريحاً.

## Status

`PARTIALLY_IMPLEMENTED` — منطق آلة الحالات، سجل التدقيق، عزل المستأجرين، وبوابة تاجر فعلية كلها `IMPLEMENTED` ومُختبَرة حياً (وحدة + تكامل + متصفح حقيقي). لا ربط بمندوب توصيل حقيقي (برق)، ولا كلمة مرور/تحقق ثانٍ لتسجيل الدخول (راجع `specs/merchant/SPEC.md`).
