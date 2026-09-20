---
title: سجل البناء الليلي الذاتي — تنفيذ §31 بنود 2-10
status: IN_PROGRESS
version: 1.0
last_updated: 2026-09-20
owner: Claude (تنفيذ ذاتي غير مُراقَب) — للمراجعة من المؤسس صباحاً
source_of_truth: هذا الملف سجل تنفيذ حي لمهمة AUTONOMOUS-OVERNIGHT-BUILD-PHASE1-BLOCKERS. يُحدَّث فور
  إغلاق/تعليق كل بند، لا بأثر رجعي في النهاية فقط.
related: docs/audits/REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §31، docs/DECISIONS.md (DD-002 OPEN،
  DD-020، ADR-022، ADR-031، ADR-033)، docs/audits/2026-09-19-verify-cart-fix-staging-report.md،
  docs/audits/2026-09-20-investigate-cart-write-failure-desktop-sidebar-report.md
---

# سجل البناء الليلي الذاتي — 2026-09-20

## 🔴 توقف طارئ

(فارغ — لم يظهر أي خطر مالي/أمني حقيقي حتى الآن)

## قرارات معلَّقة بانتظار المؤسس (افتراضات مؤقتة محافظة طُبِّقت، تحتاج تأكيد)

| البند | السؤال | الافتراض المؤقت المطبَّق | أين بالضبط بالكود |
|---|---|---|---|
| (يُملأ أثناء التنفيذ) | | | |

## ملاحظات افتتاحية

- قرأت: SALSABIL_CONSTITUTION.md (§4، §8، §9، §22-24، دورة الـ7 خطوات §24)، docs/DECISIONS.md كاملاً
  تقريباً (تركيز على DD-002 [OPEN]، DD-020، ADR-022، ADR-031، ADR-033)، docs/DOCUMENTATION_RULES.md
  كاملاً، docs/audits/REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md كاملاً،
  docs/audits/2026-09-19-verify-cart-fix-staging-report.md كاملاً.
- تحققت من وجود تقرير تحقيق الجلسة المتوازية
  (`docs/audits/2026-09-20-investigate-cart-write-failure-desktop-sidebar-report.md`) — حالته
  "مُحقَّق ومُشخَّص" (تشخيص فقط، لم يُصلَح بعد حسب مقدمته). **لن ألمس أياً من**:
  `cartMutationGate.ts`، `DesktopCartSidebar.tsx`، `useOptimisticCartLine.ts`، `ProductOptions.tsx`،
  `RecipeSheetContent.tsx`، `proxy.ts` — طوال هذه المهمة، بصرف النظر عن أي حاجة قد تظهر لتعديلها.
- بند §31 رقم 1 (بَگ إضافة السلة الصامت — قفل التسلسل) مُغلَق فعلاً (commit `065f13d`، تحقق حي
  16/16). أبدأ من بند 2.

---

## البنود

### بند 2 — إصلاح واجهة Multi-Merchant Order

**حالة: قيد التنفيذ**

**1. Specification**
- إزالة البانر الكاذب "غير مدعوم بعد" من `src/app/(reef)/cart/page.tsx` — استبداله بنص دقيق يعكس
  السلوك الحقيقي (الطلب يُقسَّم فعلياً حسب التاجر، Backend يدعم هذا فعلاً منذ ADR-033).
- `src/app/(reef)/order/[id]/page.tsx` (وما يغذّيها) يجب أن يعرض **كل** merchant_suborders التابعة
  لنفس customer_order — لا نصيب أول تاجر فقط — مع إجمالي حقيقي شامل (مجموع كل الأنصبة).
- **حدود التغيير:** لا لمس لـ `orders.service.ts.checkout()`/`transitionStatus`/`getOrderWithItems`
  (نطاق التاجر/الإدارة يبقى كما هو — نصيب واحد لكل تاجر، هذا صحيح لهم). التغيير محصور بمسار العميل
  الضيف (`getOrderForCustomerView` + الصفحة).
- لا تعديل على أي من الملفات الممنوعة (cartMutationGate.ts، DesktopCartSidebar.tsx،
  useOptimisticCartLine.ts، ProductOptions.tsx، RecipeSheetContent.tsx، proxy.ts).

**2. Plan**
- `customerOrder.repository.ts`: إضافة `findOrdersByCustomerOrderId(customerOrderId)` (كل
  merchant_suborders لنفس الأب، `order('created_at', asc)`) و`findCustomerOrderById(id)` (لجلب
  `delivery_fee_snapshot` الحقيقي من `customer_orders` — دائماً صفر اليوم لكن القراءة من المصدر
  الصحيح لا افتراضاً ثابتاً، حتى لا ينكسر هذا لاحقاً عند بناء رسوم توصيل حقيقية).
- `types.ts`: إعادة تعريف `OrderCustomerView` لتحمل مصفوفة `suborders` (كل عنصر: order + items +
  merchantName) + `grandTotal` بدل `order`/`items` المفردين. **تغيير عقد معلَن (AGENTS.md §13 نمط
  ADR-033)** — المستهلك الوحيد لهذا النوع هو `getOrderForCustomerView` وصفحة `/order/[id]` نفسها
  (تحقَّق بالبحث، لا مستهلك آخر).
- `orders.service.ts.getOrderForCustomerView`: يجلب الطلب الأساسي، ثم كل الإخوة عبر
  `customerOrderId`، يُثري بنود كل واحد باسم المنتج (كما سابقاً) + اسم التاجر عبر
  `merchantService.getByIds`، يحسب `grandTotal = Σ(suborder.total) + deliveryFeeSnapshot`.
- تحديث `orders.service.test.ts` (3 اختبارات موجودة لـ`getOrderForCustomerView`) لتطابق الشكل
  الجديد + اختبار جديد يغطي سيناريو تاجرين (يطابق سيناريو التحقق الحي 23.75 جنيه).
- تحديث `orders.integration.test.ts` إن كان يستهلك `getOrderForCustomerView` بالشكل القديم.
- `page.tsx`: عرض كل مجموعة تاجر ببطاقتها الخاصة (اسم التاجر + بنوده + إجمالي فرعي)، ثم إجمالي كلي
  واحد أسفل الكل.
- `cart/page.tsx`: استبدال نص البانر.

**3. Review (ذاتية)** — لا تعارض مع ADR-033 (الذي يوثّق هذه الفجوة تحديداً كمعروفة وغير مغلَقة)، ولا
مع DD-002 (لا علاقة بالأقفال في-الذاكرة)، ولا مع أي من الملفات الممنوعة. `getOrderWithItems`
(التاجر/الإدارة) لا يتأثر — يبقى نصيب واحد فقط، وهذا صحيح لهما بتصميم ADR-033. Guardian Matrix:
منطق مالي (إجمالي معروض للعميل) = DEEP — التزمت بجلب الرقم من قاعدة البيانات مباشرة (مجموع
`merchant_suborders.total` + `customer_orders.delivery_fee_snapshot`)، لا حساب مستقل في الواجهة.

**4-7. التنفيذ/الاختبار/المراجعة/Commit:** أدناه.

---
