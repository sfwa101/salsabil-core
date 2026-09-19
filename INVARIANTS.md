---
title: سجل الثوابت الملزمة (Invariant Registry)
status: BINDING
authority: Security & Correctness
last_verified: 2026-09-05
owner: المؤسس (أبوحتاب) + Claude
source_of_truth: هذا الملف (السجل)، الأدلة المُشار إليها داخل كل إدخال (الكود/الاختبارات/ADRs الفعلية)
---

# INVARIANTS.md — سجل الثوابت الملزمة

> **ما هذا الملف:** سجل حقيقي (لا مفترَض) للثوابت (Invariants) التي يجب ألا تُنتهك — استُخرجت من فحص فعلي
> للكود، الاختبارات، ADRs، والأدوات القابلة للتشغيل (`npm run arch:check`, `npm run typecheck`,
> `npm run test:unit`) بتاريخ 2026-09-05، لا من قائمة مفترضة مسبقاً.
>
> **نموذج الدليل والحالات المستخدمة هنا** موثَّقان في `SALSABIL_CONSTITUTION.md §4.1` و`docs/DOCUMENTATION_RULES.md §2-3`
> (لا تكرار هنا). **الفرق الوحيد المهم لهذا الملف تحديداً:** خاصية بنيوية ساكنة (مثال: حدود الاعتماد بين
> الطبقات) قد يكفيها Code Inspection عبر أداة فحص فعلية بذاتها لتصنيفها `ENFORCED`؛ خاصية ديناميكية/سلوكية
> (عزل مستأجرين حي، سباق تزامن، سلوك RLS الفعلي) **لا تكفيها** — تتطلب Automated Test مُنفَّذاً فعلياً أو
> Live Verification. راجع "ENFORCEMENT INTEGRITY RULE" أسفل هذا الملف قبل قراءة أي إدخال.
>
> **حالات الإدخال:** `ENFORCED` | `PARTIAL` | `UNKNOWN` | `VIOLATED` | `WAIVED` | `NOT_APPLICABLE`.
> **Guardian:** `Required` | `Optional` | `N/A` — راجع `AGENTS.md §17` (Guardian Matrix) لشدة المراجعة المقترحة.

---

## ENFORCEMENT INTEGRITY RULE

Invariant = `ENFORCED` فقط إذا وُجد معاً: (1) Control فعلي في الكود/قاعدة البيانات، (2) ودليل مطابق تماماً
لنطاق القاعدة نفسها — لا اختباراً "قريباً" منها.

- **خصائص بنيوية ساكنة** (حدود اعتماد بين الطبقات، عدم استيراد ممنوع، بنية نوع لا تحتوي حقلاً معيناً):
  Code Inspection عبر أداة فحص فعلية (مثل `dependency-cruiser`، أو قراءة تعريف `type`/`interface` نفسه)
  دليل كافٍ بذاته لـ`ENFORCED`، بشرط تشغيل الأداة فعلياً وتسجيل نتيجتها الحقيقية (لا افتراض نجاحها).
- **خصائص ديناميكية/سلوكية** (عزل مستأجرين حقيقي، انتقالات State Machine تحت ظروف فعلية، سباقات
  تزامن، سلوك RLS الحي، سلوك صلاحيات أثناء التنفيذ): تتطلب Automated Test مُنفَّذاً فعلياً أو Live
  Verification. لا يكفي Code Inspection وحده مهما بدا التنفيذ صحيحاً عند القراءة.
- اختبار يثبت **جزءاً فقط** من القاعدة → `PARTIAL`. لا اختبار/تحقق حي مناسب لخاصية ديناميكية → `UNKNOWN`
  حتى لو بدا التنفيذ صحيحاً. **الإصلاح وحده ليس دليلاً** — تصحيح كود في commit سابق لا يرفع الحالة
  إلى `ENFORCED` بلا دليل مباشر مرتبط بالـInvariant نفسه.
- ممنوع استخدام "يُفترض"/"يبدو"/"على الأرجح"/"مغطى بشكل غير مباشر" كدليل على `ENFORCED`.
- كل إدخال يسجّل **Coverage Scope** صراحة: ما المُثبَت، وما غير المُثبَت، تحت أي فاعل/مستأجر/حالة/بيئة،
  وهل الدليل حالي (مُنفَّذ في هذه الجلسة) أم موروث (مسجَّل في ADR سابق بتاريخ محدَّد لم يُعَد تنفيذه هنا).

---

## DECISION DEBT QUALIFICATION RULE

> إضافة 2026-09-05، `BATCH1-GUARDIAN-REMEDIATION-001` — تدوين صريح لقاعدة كانت **مُطبَّقة فعلياً** في
> `docs/DECISIONS.md` (قسم "مراجَع ولم يُحوَّل إلى Decision Debt") دون أن تُكتَب كقاعدة قائمة بذاتها هنا.
> لا معيار جديد — نفس المنطق المُستخدَم فعلاً عند استثناء BR-016، INV-INV-002، وCONFLICT-002، مُستخرَجاً
> ومُدوَّناً الآن ليكون قابلاً للإحالة والتطبيق المتسق على أي إدخال مستقبلي.

**لا يتحوّل كل `UNKNOWN`/`PARTIAL`/`OPEN_QUESTION`/Conflict تلقائياً إلى Decision Debt في
`docs/DECISIONS.md`.** يصبح Decision Debt فقط عندما يستوفي **واحداً على الأقل** من:

1. **يحتاج قراراً بشرياً فعلياً معلَّقاً** — لا حالة قرَّرها المؤسس صراحة بالفعل وقتاً سابقاً (فرق بين
   "لم يُقرَّر بعد" و"قُرِّر صراحة أن هذا مقبول مؤقتاً"، الأول Decision Debt، الثاني ليس كذلك).
2. **يحتاج إصلاحاً تقنياً لاحقاً** لا يمكن إغلاقه بمجرد فحص/تحقق بسيط لا يغيّر شيئاً في القرار نفسه.
3. **يمثّل خطراً معمارياً/أمنياً/تشغيلياً حقيقياً غير مُخفَّف بضابط آخر قائم فعلياً.**
4. **يمنع قراراً أو مرحلة لاحقة** (توسّع، إطلاق إنتاج، onboarding تاجر/مستخدم جديد، إلخ).

**لا يتحوّل** (يبقى موثَّقاً في مكانه الأصلي فقط — `INVARIANTS.md` أو `BUSINESS_RULES.md` أو غيرهما) إذا
انطبق **واحد على الأقل** مما يلي (لا شرط اجتماعها الثلاثة معاً — كل مثال فعلي أدناه يحقق شرطاً واحداً
فقط، لا الثلاثة):
- الحالة الراهنة تعكس **قراراً مؤسس صريحاً موجوداً بالفعل** (لا فراغ قرار)، أو
- الخطر المتبقي **مُخفَّف فعلياً بضابط/Invariant آخر قائم ومُثبَت** (إغلاقه الكامل يحتاج تحققاً تقنياً
  بسيطاً لا قراراً)، أو
- الأثر **تجميلي/بلا نتيجة وظيفية** (خطأ توثيقي بسيط، لا يغيّر سلوكاً ولا يحمل خطراً).

**قاعدة صارمة:** أي قرار بعدم التحويل **يجب** أن يُبرَّر صراحة (أي شرط من الشروط أعلاه ينطبق وكيف) —
لا يُترَك صامتاً بحجة الانشغال أو انخفاض الأولوية الظاهر.

**أمثلة فعلية من هذه الدفعة (راجع `docs/DECISIONS.md` → "مراجَع ولم يُحوَّل إلى Decision Debt"
للتبرير الكامل لكل حالة):**
- **BR-016** (لا حد أدنى لقيمة الطلب) — **لم يُحوَّل**: الشرط الأول (قرار مؤسس صريح موجود بالفعل — "التنفيذ
  بلا القيد هو ما سُمح به صراحة").
- **INV-INV-002** (قيد CHECK لمنع كمية مخزون سالبة، بلا Live Verification مباشر) — **لم يُحوَّل**: الشرط
  الثاني (INV-INV-001 يُخفِّف الخطر الفعلي فعلاً؛ إغلاقه يحتاج تشغيل فحص حي بسيط لا قراراً معمارياً).
- **CONFLICT-002** (رقم إصدار قديم في سطر ختامي) — **لم يُحوَّل**: الشرط الثالث (تجميلي بحت، بلا أثر وظيفي).
- **DD-001..DD-006** (راجع `docs/DECISIONS.md`) — **حُوِّلت جميعها**: كل واحدة تستوفي بند واحداً على
  الأقل بوضوح (قرار مؤسس معلَّق فعلياً/BLOCKER صريح موثَّق مسبقاً/خطر غير مُخفَّف/يمنع مرحلة لاحقة).

---

## ملاحظة منهجية عابرة لكل الإدخالات (شفافية الجلسة الحالية)

هذه الدفعة (`CONSTITUTION-V2-BATCH1-GOVERNANCE-KERNEL`، 2026-09-05) نفَّذت فعلياً وقرأت نتائجها الحقيقية:

- `npm run arch:check` → **0 مخالفات** (111 module، 327 dependency، نُفِّذ الآن).
- `npm run typecheck` → **نظيف بلا أخطاء** (نُفِّذ الآن).
- `npm run test:unit` → **122/122 نجحت** (13 ملف اختبار وحدة، نُفِّذ الآن — يستثني `*.integration.test.ts`).

**لم تُنفَّذ في هذه الجلسة** (تتطلب اتصالاً حياً بـSupabase وتُعدِّل حالة قاعدة بيانات حقيقية — خارج نطاق
دفعة توثيقية بقيد `NO BEHAVIOR CHANGE`، ولا يوجد تأكيد أن بيئة `.env.local` الحالية آمنة للكتابة التجريبية
دون إذن إضافي): `npm run test` الكامل (يشمل `*.integration.test.ts`)، و`scripts/rls-live-verification.mjs`.
لهذين الدليل الأحدث المسجَّل هو ما وثَّقته الجلسة السابقة في `docs/DECISIONS.md → ADR-022` (بتاريخ
2026-09-05 أيضاً، بنفس اليوم لكن جلسة مختلفة) — يُقتبَس هنا بصفته **دليلاً موروثاً موثَّقاً بتاريخ**، لا
دليلاً أعدنا تنفيذه بأنفسنا الآن. كل إدخال يعتمد عليه يذكر هذا صراحة في حقل `Executed`.

---

## أولاً: عزل المستأجرين (Tenant Isolation)

### INV-TEN-001
```
Invariant:
فاعل بدور تابع لتاجر (merchant_owner/merchant_manager/employee) لا يستطيع قراءة أو تعديل حالة طلب
لا يخص tenant_id الخاص بجلسته — بصرف النظر عن معرفة orderId. platform_admin يتجاوز هذا القيد دائماً
(يرى/يُغيّر كل شيء بلا تقييد تاجر).

Control/Implementation:
src/core/modules/orders/orders.service.ts:237-241 (assertActorCanAccessOrder، دالة خاصة مشتركة) —
مُستهلَكة من transitionStatus (سطر 274)، getOrderWithItems (سطر 195)، getStatusHistory (سطر 231).
التوقيع نفسه يفرضها بنيوياً: OrderActorContext (types.ts:108-113) وTransitionOrderStatusInput
(types.ts:115-125) يتطلبان actor/tenantId في نوع TypeScript، لا تعليقاً تحذيرياً فقط — استدعاء بلا
سياق فاعل يفشل وقت الترجمة (ADR-022 بند د، 2026-09-05).

Automated Test:
src/core/modules/orders/orders.integration.test.ts:384-390 ("ترفض حياً تاجراً يحاول تغيير حالة طلب
تاجر آخر")، و src/core/e2e/reef-city-journey.integration.test.ts (E2E-DAY13-001 — عزل مستأجرين ضد
تاجر ب حقيقي، تطبيقياً وRLS مباشرة، حسب docs/ROADMAP.md اليوم 13).

Guardian:
Required (DEEP — راجع AGENTS.md §17)

Evidence:
- Type: Automated Test (تكامل، Supabase حقيقي)
- Source: orders.integration.test.ts (الاختباران أعلاه)، reef-city-journey.integration.test.ts
- Executed: 2026-09-05 (موروث — موثَّق في commit 2425822 "fix(orders): close four P0 gaps"، لم يُعَد
  تنفيذه في هذه الجلسة التوثيقية — يتطلب اتصالاً حياً بـSupabase، خارج نطاق NO BEHAVIOR CHANGE)
- Scope: مُثبَت — تعديل حالة طلب (transitionStatus) وقراءة تفصيلية (getOrderWithItems/getStatusHistory)
  عبر actor بدور merchant_owner ضد tenantId غير مطابق، وضد تاجر ثانٍ حقيقي في E2E-DAY13-001.
  غير مُثبَت — getOrdersForTenant/getAllOrders (orders.service.ts:245-253) **بلا أي فحص داخلي**؛
  التوثيق نفسه (docs/DOMAIN_MAP.md → Admin) يقر صراحة أن هذا "مسؤولية المستدعي (Server Action)" —
  لا اختبار يُمارِس مسار Server Action الفعلي بجلسة خاطئة ليثبت أن تلك الطبقة تصد الخطأ فعلياً.
- Result: PASS للمسارات المُختبَرة (رفض صريح بالرسالة المتوقَّعة "لا يخص تاجرك")

Status:
PARTIAL — الآلية الأساسية (assertActorCanAccessOrder) مُثبَتة بقوة لثلاث دوال قراءة/تعديل بمعرّف طلب
واحد؛ دوال القائمة (getOrdersForTenant/getAllOrders) وطبقة Server Action التي تستدعيها بلا دليل
اختبار مباشر يُمارِس فشل تلك الطبقة تحديداً. لا يُرفَع لـENFORCED حتى يوجد ذلك الدليل أو فحص داخلي مكافئ.

Owner:
Engineering
```

---

## ثانياً: آلة حالات الطلب (Orders State Machine)

### INV-ORD-001
```
Invariant:
حالة الطلب (orders.status) لا تنتقل إلا وفق مصفوفة ORDER_TRANSITIONS (سبع حالات، انتقالات محدَّدة
حصرياً، delivered/cancelled نهائيتان بلا أي انتقال منهما)، ولا يُنفِّذ الانتقال إلا فاعل ضمن
ORDER_TRANSITION_ACTORS[toStatus] — كلا الجدولين مصدر حقيقة برمجي وحيد.

Control/Implementation:
- طبقة تطبيق: src/core/modules/orders/types.ts:51-59 (ORDER_TRANSITIONS)، :70-78
  (ORDER_TRANSITION_ACTORS)؛ orders.service.ts:263-298 (transitionStatus، تحقق مزدوج: انتقال مسموح؟
  ثم فاعل مخوَّل؟).
- طبقة قاعدة بيانات: قيد CHECK حي `orders_status_check` (docs/DATABASE.md §3، قسم orders) — دفاع
  مستقل ثانٍ لا يعتمد على صحة كود التطبيق وحده.

Automated Test:
src/core/modules/orders/orders.service.test.ts (وحدة — انتقالات صحيحة/خاطئة، فاعل مخوَّل/غير مخوَّل)؛
src/core/modules/orders/orders.integration.test.ts:314-390 (دورة حياة كاملة حية pending→delivered،
رفض انتقال من حالة نهائية، رفض فاعل customer، إلغاء من preparing).

Guardian:
Required (MEDIUM–DEEP بحسب طبيعة التغيير — راجع AGENTS.md §17)

Evidence:
- Type: Automated Test (وحدة + تكامل حي) + توثيق قيد DB حي سابق
- Source: orders.service.test.ts (نُفِّذ ضمن npm run test:unit، 122/122 نجحت، هذه الجلسة 2026-09-05)؛
  orders.integration.test.ts (موروث — آخر تنفيذ موثَّق ضمن commit 2425822/ADR-010 الأصلي، لم يُعَد
  تنفيذه حياً في هذه الجلسة)؛ ADR-010 يوثّق رفض CHECK constraint حياً (كود 23514) عند محاولة إدراج
  status غير صحيحة.
- Scope: مُثبَت — كل الانتقالات الستة الصحيحة، انتقالات خاطئة من حالة نهائية، فاعل غير مخوَّل (customer)،
  الإلغاء من حالات وسيطة متعددة. غير مُثبَت في هذه الجلسة تحديداً — لم يُعَد تشغيل orders.integration.test.ts
  الآن (يتطلب Supabase حياً).
- Result: PASS (وحدة، مُنفَّذ الآن)؛ PASS (تكامل، موروث بتاريخ سابق موثَّق)

Status:
ENFORCED — طبقتا دفاع مستقلتان (تطبيق + DB CHECK)، كلتاهما موثَّقتان بدليل Automated Test حقيقي،
تغطي الحالات الحرجة (نهائية، فاعل غير مخوَّل، تسلسل كامل).

Owner:
Engineering
```

### INV-ORD-002
```
Invariant:
طلبان متزامنان فعليان (نفس اللحظة) لنفس السلة (cart.id) بالضبط ينتجان طلباً واحداً فقط — لا تكرار
Checkout عند تزامن حقيقي على نفس السلة.

Control/Implementation:
src/core/modules/orders/orders.service.ts:42 (inFlightCheckouts، Map<cartId, Promise<Order>>
في-الذاكرة)، :47-58 (checkout() يُشارِك نفس الـPromise قيد التنفيذ بين طلبين لنفس cart.id).

Automated Test:
src/core/modules/orders/orders.integration.test.ts:164-205 ("لا يُنشئ إلا طلباً واحداً عند طلبين
متزامنين فعليين لنفس السلة بالضبط") — أثبت الفشل الفعلي أولاً (معرّفا طلب مختلفان قبل الإصلاح)، ثم
النتيجة الصحيحة بعده (ADR-022 بند أ).

Guardian:
Required (DEEP — Inventory/Financial-adjacent Concurrency)

Evidence:
- Type: Automated Test (تكامل حي، Promise.all حقيقي)
- Source: orders.integration.test.ts:164-205
- Executed: 2026-09-05 (موروث — commit 2425822/ADR-022، لم يُعَد تنفيذه في هذه الجلسة التوثيقية)
- Scope: مُثبَت — تزامن داخل نفس العملية (single Node process) فقط، وهو بالضبط ما يختبره
  Promise.all. **غير مُثبَت ولا مطبَّق أصلاً** — تزامن عبر عدة نسخ خادم (Serverless/multi-instance):
  inFlightCheckouts قفل في-الذاكرة محلي للعملية، لا يشارَك بين نسخ. موثَّق صراحة كـBLOCKER بخطورة
  HIGH في docs/ROADMAP.md (2026-09-05، GUARDIAN-FINDINGS-REMEDIATION-001) قبل أي نشر متعدد الخوادم
  على إنتاج حقيقي (reefam.com، لا staging).
- Result: PASS ضمن النطاق المُختبَر (عملية واحدة)

Status:
PARTIAL — مُثبَت ومُنفَّذ بقوة لنطاقه المُعلَن (عملية واحدة)، لكن ذلك النطاق نفسه أضيق من "الإنتاج
متعدد الخوادم" الذي سيُشغَّل عليه المشروع لاحقاً — لا يُرفَع لـENFORCED حتى يُستبدَل بقفل موزَّع. راجع
DD-002 في docs/DECISIONS.md.

Owner:
Engineering
```

### INV-ORD-003
```
Invariant:
Checkout يرفض صراحة (خطأ واضح، لا طلباً خاطئاً صامتاً) أي سلة تحتوي منتجات من أكثر من تاجر واحد
(tenant_id مختلف) — لا تقسيم طلب متعدد التجار مبنياً اليوم.

Control/Implementation:
src/core/modules/orders/orders.service.ts:81-88 (فحص tenantIds.size > 1، ثم رفض إن كان tenantId
فارغاً/null).

Automated Test:
src/core/modules/orders/orders.service.test.ts (وحدة — جزء من 122 اختباراً نُفِّذت الآن ضمن
npm run test:unit).

Guardian:
Optional (LIGHT–MEDIUM — منطق بسيط، لا سباق تزامن ولا بيانات حساسة مباشرة)

Evidence:
- Type: Automated Test (وحدة)
- Source: orders.service.test.ts
- Executed: 2026-09-05 (هذه الجلسة — ضمن تشغيل npm run test:unit، 122/122 نجحت)
- Scope: مُثبَت لمنتج واحد فارغ tenantId ولمنتجَين بـtenantId مختلفين. لا حاجة لاختبار تزامن (خاصية
  ساكنة على بيانات السلة وقت القراءة، لا سباقاً).
- Result: PASS

Status:
ENFORCED

Owner:
Engineering
```

---

## ثالثاً: سلامة المخزون تحت التزامن (Inventory Safety)

### INV-INV-001
```
Invariant:
لا يمكن بيع نفس الوحدة من المخزون لعميلين مختلفين تحت تزامن حقيقي (No Overselling) — خصم الكمية
عملية ذرّية على مستوى قاعدة البيانات، بصرف النظر عن عدد نسخ الخادم التي تنفّذها.

Control/Implementation:
src/core/modules/inventory/inventory.repository.ts:43-61 (decrementIfAvailable — قراءة ثم UPDATE
واحد مشروط بمطابقة القيمة المقروءة بالضبط، Optimistic Concurrency، حتى 3 محاولات إعادة عند تعارض)؛
مُستدعاة من inventory.service.ts:21-23 (reserve)، ومُستهلَكة في orders.service.ts:96-102 (نقطة
الاستهلاك الفعلية داخل performCheckout، لا isAvailable()-ثم-قرار منفصل).

Automated Test:
src/core/modules/orders/orders.integration.test.ts:211-256 ("يبيع القطعة الأخيرة لعميل واحد فقط
عند طلبين متزامنين فعليين لعميلين مختلفين") — أثبت البيع المضاعف الفعلي أولاً (قبل الإصلاح)، ثم رفض
أحد الطلبين بعده (ADR-022 بند ب).

Guardian:
Required (DEEP)

Evidence:
- Type: Automated Test (تكامل حي، Promise.allSettled حقيقي على عميلين مختلفين)
- Source: orders.integration.test.ts:211-256
- Executed: 2026-09-05 (موروث — commit 2425822/ADR-022، لم يُعَد تنفيذه في هذه الجلسة)
- Scope: مُثبَت — الذرّية عند مستوى صف واحد في Postgres (UPDATE مشروط) تعمل بصرف النظر عن عدد نسخ
  الخادم، بخلاف INV-ORD-002 (قفل في-الذاكرة). مُثبَت لكمية=1 (أشد سيناريو تنافساً). غير مُثبَت — تزاحم
  بأكثر من عميلين معاً (3+ طلبات متزامنة على نفس الوحدة)، رغم أن الآلية (UPDATE مشروط + إعادة محاولة)
  مصمَّمة نظرياً للتعميم على أي عدد متزاحمين.
- Result: PASS (عميلان، وحدة واحدة متبقية → نجاح واحد فقط، فشل الآخر برسالة صريحة)

Status:
ENFORCED — الآلية ذرّية على مستوى قاعدة البيانات فعلياً (لا تعتمد على قفل عملية واحدة كـINV-ORD-002)،
ومُثبَتة بسيناريو تزامن حي فعلي وأشد الحالات تنافساً (آخر وحدة).

Owner:
Engineering
```

### INV-INV-002
```
Invariant:
كمية المخزون المتاحة (inventory.quantity_available) لا تصبح سالبة أبداً تحت أي مسار كود.

Control/Implementation:
قيد CHECK حي على مستوى قاعدة البيانات: `check (quantity_available >= 0)` (docs/DATABASE.md §3، قسم
inventory) — دفاع مستقل عن منطق التطبيق، يمنع حتى لو حوى الكود خطأ حسابياً مستقبلياً.

Automated Test:
NONE مباشر لهذا القيد بعينه في هذه الجلسة (لا اختبار يحاول إدراج/تحديث بقيمة سالبة صراحة ليثبت
رفض CHECK). التغطية غير المباشرة: INV-INV-001 يمنع الوصول لهذه الحالة أصلاً عبر decrementIfAvailable
الذي يرفض الخصم إن كانت الكمية أقل من المطلوب (inventory.repository.ts:46).

Guardian:
Optional (LIGHT — قيد DB بسيط، لا منطق معقَّد)

Evidence:
- Type: Code Inspection (قراءة تعريف الجدول في docs/DATABASE.md، لا اتصال DB حي للتحقق من إعادة
  فرضه فعلياً على الجدول الحي في هذه الجلسة)
- Source: docs/DATABASE.md §3 (inventory)
- Executed: 2026-09-05 (قراءة توثيق فقط في هذه الجلسة؛ آخر تحقق حي موثَّق للقيد نفسه غير مسجَّل بتاريخ
  منفصل عن إنشاء الجدول الأصلي)
- Scope: مُثبَت بنيوياً (تعريف الجدول يحمل القيد). غير مُثبَت حياً في هذه الجلسة أن القيد لا يزال مفعَّلاً
  فعلياً على قاعدة البيانات الحية (لم يُشغَّل أي استعلام تحقق).
- Result: N/A (لم يُشغَّل فحص حي)

Status:
UNKNOWN — قيد ساكن موثَّق في تعريف الجدول، لكن لا Automated Test ولا Live Verification مباشر يثبت
رفضه الفعلي لقيمة سالبة اليوم. الخطر الفعلي منخفض عملياً (INV-INV-001 يمنع الوصول لهذا المسار أصلاً)،
لكن القاعدة الصارمة في هذا الملف تمنع رفع UNKNOWN إلى ENFORCED بلا دليل مباشر مهما بدا التنفيذ سليماً.

Owner:
Engineering
```

### INV-INV-003 — إضافة 2026-09-15 (TASK-08)
```
Invariant:
إلغاء طلب موجود فعلياً (انتقال * → cancelled عبر transitionStatus) يسترجع مخزون كل بند من
order_items بالضبط مرة واحدة — لا يبقى محجوزاً للأبد، ولا يُسترجَع مرتين (استرجاع مضاعف) أو يُفقَد
أثره (Lost Update) تحت تزامن حقيقي.

Context (الفجوة الأصلية): قبل هذه المهمة، InventoryService.release() كان يُستدعى فقط من مسار
تعويض فشل Checkout نفسه (ADR-022 بند ج) — لا مسار مكافئ عند إلغاء طلب موجود بالفعل. أي إلغاء حقيقي
كان يترك مخزونه محجوزاً للأبد بصمت، بلا أي مؤشر خطأ ظاهر.

Control/Implementation:
- orders.service.ts (transitionStatus): عند toStatus === 'cancelled' بعد نجاح تحديث الحالة فعلياً،
  يجلب order_items ويستدعي inventoryService.release() لكل بند (يعيد استخدام آلية reserve/release
  الموجودة أصلاً في مسار Checkout — لا منطق استرجاع جديد).
- orders.repository.ts (updateOrderStatus): قفل تفاؤلي جديد يطابق أيضاً على fromStatus المقروء قبل
  النداء (نفس نمط decrementIfAvailable) — يعيد null عند تعارض تزامن حقيقي (انتقالان متزامنان لنفس
  الطلب)، فيرفض transitionStatus الانتقال صريحاً بدل تنفيذ أثره (الاسترجاع) مرتين.
- inventory.repository.ts (restore): قفل تفاؤلي جديد (كان غائباً تماماً قبل هذه المهمة — التعليق
  الأصلي افترض "لا مسار متزامن حقيقي يتنافس عليه"، افتراض كسرَته إضافة مسار الإلغاء كمستدعٍ ثانٍ)،
  نفس نمط decrementIfAvailable، maxAttempts=8 (أعلى من نظير decrementIfAvailable عمداً — استُبين
  حياً أن 3 غير كافية تحت تزاحم حقيقي بـ5+ مستدعين متزامنين على الصف نفسه، وإعادة المحاولة هنا رخيصة
  ولا خطر من رفعها، بخلاف decrementIfAvailable حيث الفشل بعد المحاولات "رفض بيع" آمن أصلاً).

Automated Test:
src/core/modules/orders/orders.service.test.ts (وحدة، أربعة اختبارات جديدة تحت "TASK-08")؛
src/core/modules/orders/orders.integration.test.ts (تكامل حي، ثلاثة اختبارات جديدة تحت "TASK-08"):
1) إلغاء طلب حقيقي يسترجع مخزونه فعلياً (الفجوة الأصلية).
2) إلغاء نفس الطلب مرتين متزامنتين فعليًا (Promise.allSettled) → استرجاع مرة واحدة فقط، الآخر
   يُرفَض بخطأ تعارض تزامن صريح.
3) خمسة استدعاءات restore() متزامنة فعلياً لنفس المنتج (Promise.all مباشر) → لا فقد أثر أي منها.

Guardian:
Required (DEEP — Inventory Concurrency، AGENTS.md §17)

Evidence:
- Type: Automated Test (وحدة + تكامل حي، Promise.all/allSettled حقيقي ضد Supabase حقيقي)
- Source: orders.service.test.ts، orders.integration.test.ts (أسطر مُعلَّمة "TASK-08")
- Executed: 2026-09-15 (هذه الجلسة) — دورة Regression كاملة لكل حالة حرجة على حدة (بَگ متعمَّد →
  فشل متوقَّع مُثبَت فعلياً → إرجاع → نجاح)، بما فيها اكتشاف تجريبي أن استدعاءين متزامنين فقط لا
  يتصادمان بثبات (فجوة توقيت شبكي طبيعية)، بخلاف 5+ استدعاءات (10 استدعاءات بلا قفل أفقدت 9/10
  تحديثات فعلياً في سكربت تحقق مباشر منفصل، غير مُدرَج في مجموعة الاختبارات).
- Scope: مُثبَت — إلغاء مفرد، إلغاء مزدوج لنفس الطلب (تعارض حالة)، واسترجاع متزامن حقيقي لنفس المنتج
  من مصدرين مختلفين (Lost Update). غير مُثبَت — تزامن عبر أكثر من نسخة خادم واحدة (نفس قيد INV-ORD-002
  الموروث: القفل التفاؤلي هنا على مستوى قاعدة البيانات فعلياً فينجو من تعدد النسخ، بخلاف أي قفل
  في-الذاكرة، لكن لم يُختبَر عملياً بأكثر من عملية Node واحدة في هذه الجلسة).
- Result: PASS (كل الحالات الثلاث أعلاه، بعد تصحيح maxAttempts من 3 إلى 8 في restore())

Status:
ENFORCED — قفلان تفاؤليان مستقلان (orders.status، inventory.quantity_available) يمنعان معاً
الاسترجاع المضاعف وفقد الأثر، ومُثبَتان بتزامن حي فعلي حقيقي، لا Promise.all اسمي بلا تصادم فعلي.

Owner:
Engineering
```

---

## رابعاً: Row-Level Security (RLS) وحدود الوصول لقاعدة البيانات

### INV-RLS-001
```
Invariant:
كل جدول يحوي بيانات مُفعَّل عليه RLS بأحد نمطين مقصودين فقط: (أ) قراءة عامة لبيانات كتالوج/محتوى
عامة بطبيعتها، (ب) قفل كامل بلا أي policy — وصول حصري عبر service_role من الخادم فقط. لا نمط وسط
("RLS مفتوح لـanon باعتماداً على صعوبة تخمين معرّف").

Control/Implementation:
RLS مُفعَّل على 17 جدولاً (docs/DATABASE.md §6): النمط 1 (categories, products, inventory, posts
جزئياً, post_media, post_products) والنمط 2 (users جزئياً, merchants, carts, cart_items, orders,
order_items, order_status_history, sessions, audit_log, worlds, user_personas). كل كتابة/قراءة
للنمط 2 تمر عبر src/core/kernel/database/supabase-admin-client.ts (مفتاح service_role، محمي بحزمة
server-only).

Automated Test:
scripts/rls-live-verification.mjs (أداة تحقق حي دائمة وقابلة لإعادة التشغيل، أُنشئت في
GUARDIAN-FINDINGS-REMEDIATION-001 لتستبدل ادعاءً سابقاً بلا دليل محفوظ — راجع ADR-022 addendum).

Guardian:
Required (DEEP)

Evidence:
- Type: Live Verification (فحص حي مباشر: قراءة/كتابة عبر anon مقابل service_role على كل الجداول)
- Source: scripts/rls-live-verification.mjs، موثَّق في docs/DECISIONS.md → ADR-022 (تصحيح توثيقي
  بتاريخ 2026-09-05)
- Executed: 2026-09-05 (موروث — نُفِّذ فعلياً من جلسة سابقة نفس اليوم، **لم يُعَد تشغيله في هذه
  الجلسة التوثيقية** — يتطلب اتصالاً حياً بـSupabase ويقرأ/يكتب بيانات فعلية، خارج نطاق NO BEHAVIOR
  CHANGE لدفعة توثيقية بلا تفويض إضافي لتشغيل أدوات تلمس بيانات حية)
- Scope: مُثبَت (بتاريخ التنفيذ الموروث) — 17/17 فحصاً نجح، بما فيها منشور posts مؤقت أثبت أن
  is_published=false يمنع القراءة العامة فعلياً. **لم يُتحقَّق من استمرار هذه النتيجة بعد أي Migration
  لاحقة لهذه الجلسة** — "Last Verified" في هذا الإدخال يعكس تاريخ التنفيذ الموروث، لا تحققاً جديداً
  الآن.
- Result: PASS (17/17، بيانات حية حقيقية وقت ذلك التشغيل: audit_log 1060 صفاً محجوباً، carts 31،
  orders 12)

Status:
ENFORCED — دليل Live Verification حقيقي محفوظ (سكربت + نتيجة مسجَّلة)، لا ادعاءً نصياً بلا أثر كما
كان قبل GUARDIAN-FINDINGS-REMEDIATION-001. **يجب إعادة تشغيل السكربت عند أي تغيير Schema/RLS لاحق**
قبل الاستمرار في الاستناد لهذا التصنيف — "Last Verified" هنا ليس ضماناً دائماً.

Owner:
Engineering
```

---

## خامساً: حدود المعمارية (Architecture Boundaries)

### INV-ARCH-001
```
Invariant:
اتجاه اعتماد وحيد الاتجاه: component → service → repository → db-client. لا repository.ts يستورد
repository.ts نطاق آخر، لا عكس اتجاه (repository يستدعي service)، لا واجهة تستورد repository مباشرة،
لا وصول مباشر لعميل Supabase خارج repository.ts، لا وصول مباشر لـkhalil.repository.ts من خارج
kernel/khalil/، لا استيراد دائري.

Control/Implementation:
.dependency-cruiser.cjs:14-67 (ست قواعد forbidden)، مربوطة بـ.husky/pre-commit (docs/ARCHITECTURE.md
§3.1). قيد معروف موثَّق صراحة (لا تجاهل صامت): لا قاعدة تمنع service.ts نطاق من استيراد repository.ts
نطاق آخر مباشرة (تجاوز طبقة خدمته) — الحماية الفعلية القائمة تمنع فقط repository.ts من لمس جداول نطاق
آخر (الحد الفاصل الحقيقي لعزل البيانات)؛ هذه فجوة أضعف موثَّقة، لا مخفية.

Automated Test:
N/A بمعنى Vitest — الأداة نفسها (dependency-cruiser) هي آلية الفحص، لا اختبار Vitest منفصل.

Guardian:
Optional (LIGHT لتغيير لا يمس القواعد نفسها؛ DEEP لأي تعديل على .dependency-cruiser.cjs ذاته)

Evidence:
- Type: Code Inspection (أداة فحص بنيوي فعلية — كافية بذاتها لخاصية بنيوية ساكنة، راجع
  ENFORCEMENT INTEGRITY RULE أعلاه)
- Source: npm run arch:check (depcruise src --config .dependency-cruiser.cjs)
- Executed: 2026-09-05 (هذه الجلسة — شُغِّل فعلياً الآن)
- Scope: مُثبَت — 111 module، 327 dependency، الست قواعد كلها، عبر كل src/ الحالي. كل قاعدة كانت
  مُتحقَّق منها فردياً بحقن مخالفة مؤقتة وتأكيد رفضها وقت اعتمادها أصلاً (ADR-011) — لم يُكرَّر ذلك
  التحقق الفردي في هذه الجلسة، فقط إعادة تشغيل الفحص الكامل على الكود الحالي.
- Result: PASS — "no dependency violations found (111 modules, 327 dependencies cruised)"

Status:
ENFORCED

Owner:
Engineering
```

---

## سادساً: سلامة الأسعار (Server-Side Price Authority)

### INV-SEC-001
```
Invariant:
لا يُقبَل أي سعر يصل من العميل. السعر يُحسَب من الخادم دائماً عبر مصدر حقيقة واحد
(CatalogService.calculatePrice)، ولا تُخزِّن cart_items سعراً إطلاقاً (يُحسَب حياً عند كل قراءة)، بينما
order_items.unit_price_snapshot يُحسَب مرة واحدة عند إنشاء الطلب ثم يُجمَّد للأبد.

Control/Implementation:
src/core/modules/catalog/catalog.service.ts:50-51 (calculatePrice)، :31 (validateSelection). بنيوياً:
CheckoutInput (orders/types.ts:137-142) **لا يحتوي حقل سعر إطلاقاً** — العميل لا يستطيع إرسال سعر حتى
لو أراد، لا فحصاً يرفضه فقط. order_items.unit_price_snapshot يُحسَب في orders.service.ts (خط الأنابيب
الكامل، سطر ~126: unitPrice: line.unitPrice من CartService.getSummary التي تستدعي calculatePrice حياً).

Automated Test:
لا اختبار وحدة معزول لـ CatalogService.calculatePrice()/validateSelection() (لا يوجد
src/core/modules/catalog/*.test.ts في المستودع — تحقَّق منه بحثاً مباشراً، صفر نتائج). التغطية
الموجودة غير مباشرة فقط: src/core/modules/orders/orders.integration.test.ts:65 يؤكّد
order.total === 100 وline 72 items[0].unitPriceSnapshot === 100 لسيناريو checkout واحد محدَّد.

Guardian:
Required (DEEP — Financial logic)

Evidence:
- Type: Code Inspection (بنية النوع CheckoutInput لا تحوي سعراً) + Automated Test غير مباشر (تكامل)
- Source: orders/types.ts:137-142؛ orders.integration.test.ts:65,72
- Executed: 2026-09-05 (فحص النوع الآن، هذه الجلسة؛ نتيجة التكامل موروثة من ADR-009/2426822، لم
  يُعَد تنفيذها)
- Scope: مُثبَت — العميل لا يملك حقلاً لإرسال سعر أصلاً (CheckoutInput)، وسيناريو checkout واحد يؤكد
  تطابق السعر المحسوب. **غير مُثبَت** — لا اختبار مخصَّص يغطي حالات validateSelection الحدّية (خيارات
  غير موجودة، إضافات مرفوضة، أحجام متعددة معاً) بمعزل عن مسار checkout الكامل — فجوة تغطية حقيقية
  على منطق مالي (راجع DD-004 في docs/DECISIONS.md).
- Result: PASS للحالة المُختبَرة الوحيدة

Status:
PARTIAL — الضمان البنيوي (لا حقل سعر في CheckoutInput) قوي ومُثبَت بالقراءة المباشرة؛ لكن منطق حساب
السعر نفسه (calculatePrice/validateSelection) بلا اختبار وحدة مخصَّص يغطي حالاته الحدّية — لا يُرفَع
لـENFORCED الكامل حتى يُغلَق هذا.

Owner:
Engineering
```

### INV-SEC-002
```
Invariant:
عملية على مورد مملوك (مثال: حذف عنصر سلة) تتحقق من انتماء المعرّف الفرعي (itemId) للمعرّف الأب
الممرَّر (cartId) قبل التنفيذ — لا حذف/تعديل بمعرّف فرعي فقط بلا تأكيد الانتماء (IDOR).

Control/Implementation:
src/core/modules/cart/cart.service.ts (removeItem — فحص ملكية عبر findItems قبل الحذف، بنفس نمط
updateItemQuantity المجاور؛ رقم السطر الدقيق غير مُتحقَّق منه في هذه الجلسة، لم تُقرَأ الدالة مباشرة).

Automated Test:
src/core/modules/cart/cart.integration.test.ts → "Cart IDOR" (مذكور صراحة في docs/SECURITY.md §5
نقطة 3).

Guardian:
Required (DEEP — Security Boundary)

Evidence:
- Type: Automated Test (تكامل حي)
- Source: cart.integration.test.ts → "Cart IDOR"
- Executed: 2026-09-05 (موروث — الإصلاح والاختبار من يوم الأمان، ADR-014، commit dd13cea؛ لم يُعَد
  تنفيذه في هذه الجلسة)
- Scope: مُثبَت لـremoveItem تحديداً (السيناريو الذي كان مكسوراً فعلياً قبل الإصلاح). لم تُقرَأ
  دالة removeItem مباشرة في هذه الجلسة لتأكيد رقم السطر — الاعتماد على توصيف ADR-014/SECURITY.md.
- Result: PASS (حسب توثيق ADR-014، لم يُعَد تنفيذه الآن)

Status:
ENFORCED — دليل Automated Test مباشر ومُسمَّى صراحة بالسيناريو المُصلَح، موثَّق في مصدرين مستقلين
(SECURITY.md وADR-014).

Owner:
Engineering
```

---

## سابعاً: هوية الجلسة والصلاحيات (Session Identity & RBAC)

### INV-AUTHZ-001
```
Invariant:
tenant_id ودور المستخدم (role) لا يصلان أبداً من العميل مباشرة — يُقرآن من قاعدة البيانات في كل طلب
عبر رمز جلسة عشوائي غير قابل للتخمين (opaque token) مخزَّن في cookie httpOnly.

Control/Implementation:
src/core/modules/merchant/merchant-session.ts:13-18 (getMerchantSession → khalilService.
validateSessionToken(token))؛ src/core/modules/admin/admin-session.ts (نفس النمط + فحص صريح
role === 'platform_admin')؛ src/core/kernel/khalil/service.ts:67-71 (validateSessionToken)، :94-97
(canAccessTenant)، :80-82 (hasRole). الجلسة نفسها (sessions.token) عشوائية (gen_random_uuid())، RLS
مقفول بالكامل (docs/DATABASE.md §3، sessions).

Automated Test:
src/core/kernel/khalil/service.test.ts (وحدة)؛ src/core/modules/merchant/merchant.integration.test.ts
وsrc/core/modules/admin/admin.integration.test.ts (تكامل حي — تشمل حسب docs/ROADMAP.md اليوم 11
"اختبارات أمنية سلبية: رفض هاتف تاجر، رفض جلسة تاجر حقيقية كجلسة إدارة").

Guardian:
Required (DEEP)

Evidence:
- Type: Automated Test (وحدة + تكامل حي)
- Source: khalil/service.test.ts (هذه الجلسة، ضمن 122/122 npm run test:unit)؛
  merchant.integration.test.ts، admin.integration.test.ts (موروث، لم يُعَد تنفيذهما الآن)
- Executed: 2026-09-05 (جزئي هذه الجلسة للوحدة؛ التكامل موروث بتاريخ سابق نفس اليوم)
- Scope: مُثبَت — رفض جلسة تاجر كجلسة إدارة، رفض هاتف غير مسجَّل، قراءة الدور/tenantId من DB لا من
  مدخل عميل. غير مُثبَت — سيناريو تبديل/سرقة token فعلي (session hijacking) تحت هجوم محاكى، خارج
  نطاق أي اختبار موجود اليوم.
- Result: PASS (حسب التوثيق الموروث + الاختبارات الوحدة المُنفَّذة الآن)

Status:
ENFORCED — للنطاق المُختبَر فعلياً (رفض انتحال دور/جلسة عبر القنوات المُختبَرة). لا يشمل مقاومة هجوم
سرقة جلسة نشطة (خارج نطاق أي دليل موجود، لا ندّعي تغطيته).

Owner:
Engineering
```

### INV-AUTHN-001
```
Invariant:
تسجيل دخول التاجر/الإدارة يتطلب إثبات هوية أقوى من مجرد معرفة رقم هاتف نشط (كلمة مرور/OTP/تحقق ثانٍ).

الواقع الحالي (2026-09-09، URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH):
تسجيل الدخول الآن يتطلب هاتف + كلمة مرور معاً — MerchantService.loginOwnerByPhone/
AdminService.loginByPhone يستدعيان KhalilService.verifyPasswordForPhone (تجزئة scrypt +
timingSafeEqual، src/core/kernel/security/password.ts، node:crypto مدمجة بلا تبعية جديدة). رسالة
رفض موحَّدة واحدة للعميل (لا تمييز "هاتف خطأ" عن "كلمة مرور خطأ") مع تدقيق داخلي دقيق للسبب الحقيقي.
كلمة مرور مؤقتة تُجبِر تغييرها عند أول دخول (users.must_change_password/sessions.must_change_password
— يمنع الوصول لأي صفحة أخرى حتى التغيير). راجع specs/identity/PASSWORD_AUTH_SPEC.md للتصميم الكامل.

Control/Implementation:
src/core/kernel/security/password.ts (hashPassword/verifyPassword/generateTempPassword)،
src/core/kernel/khalil/{service.ts,khalil.repository.ts} (verifyPasswordForPhone/setNewPassword/
setTemporaryPassword/findAuthByPhone/setPassword)، src/app/{merchant,admin}/change-password/*
(تغيير إجباري)، حراسة في src/app/merchant/orders/page.tsx وsrc/app/admin/dashboard/page.tsx.

Automated Test:
password.test.ts (11 اختباراً، تجزئة/تحقق حقيقيان بلا تمويه)، khalil.repository.test.ts
(findAuthByPhone/setPassword)، khalil/service.test.ts (verifyPasswordForPhone/setNewPassword/
setTemporaryPassword/createUser)، merchant.service.test.ts/admin.service.test.ts (تدفق الدخول
الكامل بكلمة المرور)، merchant.integration.test.ts/admin.integration.test.ts/
reef-city-journey.integration.test.ts (محدَّثة لتستهلك كلمة مرور حقيقية).

Guardian:
Required (DEEP) — **مكتمل، بمراجعتين مستقلتين.** الجولة الأولى (BLOCKED) كشفت ثغرة توقيت
(Timing Attack) حقيقية في verifyPasswordForPhone (مساري not_found/no_password_set يرجعان فوراً
بلا حساب scrypt، بينما wrong_password وحده ينفّذه — فرق زمني قابل للقياس يُعدّ به أرقام هواتف
تجار مسجَّلين، PASSWORD_AUTH_SPEC.md §10). أُصلحت (FIX-TIMING-ATTACK-VULNERABILITY-AUTH —
DUMMY_PASSWORD_HASH بنفس معاملات scrypt تماماً، يُنفَّذ فعلياً في كلا المسارين الآمنين قبل
الرفض). الجولة الثانية — جلسة Guardian مستقلة كلياً، بلا سياق من الأولى — راجعت الإصلاح من
الصفر: تحققت حسابياً من تطابق معاملات DUMMY_PASSWORD_HASH (طول الملح/التجزئة)، أعادت قياس RTT
حياً بنفسها بمعزل عن كود الاختبار المُرفق (ratio max/min = 1.03x، تقارب حقيقي)، تحققت من عدم
تسرّب password_hash وسلامة Rate Limiting (لم يُلمَس بالإصلاح)، وأجرت تسجيل دخول حي فعلي (حساب
اختبار مؤقت أُنشئ وحُذف على dev) بكلمتَي مرور صحيحة/خاطئة عبر التجزئة الحقيقية المخزَّنة فعلياً.
**النتيجة: APPROVED.**

Evidence:
- Type: Automated Test (وحدة + تكامل حي) + Code Inspection + مراجعتا Guardian DEEP مستقلتان
  (الأولى BLOCKED، الثانية APPROVED بعد الإصلاح)
- Source: الملفات أعلاه + scripts/password-auth-schema.sql (مُطبَّق فعلياً على dev)،
  scripts/backfill-existing-owner-passwords.ts (شُغِّل فعلياً — كلمتا مرور مؤقتتان جديدتان
  للحسابين التجريبيين، مسلَّمتان للمؤسس مباشرة، غير مخزَّنتين هنا)، وDD-001 (docs/DECISIONS.md)
  لتفصيل مراجعتَي Guardian الكامل
- Executed: 2026-09-09 (هذه الجلسة) — SQL طُبِّق يدوياً عبر Supabase SQL Editor (dev) + NOTIFY
  pgrst لإعادة تحميل الـschema cache. Backfill نجح (كلا الحسابين). مجموعة الاختبارات الكاملة
  202/203 نجحت (الفشل الوحيد المتبقي: نفاد مخزون تجريبي في admin.integration.test.ts، غير متعلق
  بالمصادقة إطلاقاً). `npm run arch:check` نظيف. مراجعتا Guardian DEEP نُفِّذتا حياً (لا محاكاة) —
  قياس RTT فعلي، تسجيل دخول فعلي ضد dev DB.
- Scope: منطق التحقق/التجزئة/تدفق الدخول/دوران الجلسة/إجبار تغيير كلمة المرور/مقاومة هجوم
  التوقيت — كل ذلك مُثبَت وحدياً وحياً ومراجَع مستقلاً معاً. النطاق غير المُغطَّى: لا اختبار
  Playwright حي عبر متصفح حقيقي لتدفق تغيير كلمة المرور في الواجهة (صفحتا change-password) —
  الخدمة/الفعل (Server Action) مُختبَران فقط عبر مسار الجلسة، لا النموذج البصري نفسه (فجوة
  موثَّقة، غير مانعة).
- Result: PASS (وحدة + تكامل بالكامل) — Guardian DEEP APPROVED (مراجعتان مستقلتان)

Status:
ENFORCED — الكود/الاختبارات (وحدة + تكامل) مكتملة ومُتحقَّق منها حياً بالكامل، ومراجعة Guardian
Review DEEP مستقلة اكتملت بالاعتماد (APPROVED) بعد إصلاح ثغرة التوقيت المكتشَفة بالجولة الأولى.
راجع DD-001 في docs/DECISIONS.md (RESOLVED).

Owner:
Claude (نفَّذ الكود/الاختبارات، طبَّق SQL بمساعدة المؤسس، شغَّل Backfill والتحقق الحي، أصلح ثغرة
التوقيت) + Guardian مستقل (مراجعتان: BLOCKED ثم APPROVED)
```

---

## ثامناً: سجل التدقيق (Audit Trail Completeness)

### INV-AUDIT-001
```
Invariant (كما يدَّعيه SALSABIL_CONSTITUTION.md §4 بند 5):
"كل تحوّل مخزون أو عملية مالية يُسجَّل في سجل تدقيق (Audit Log) — من فعل ماذا، متى، ولماذا."

الواقع الفعلي المُتحقَّق منه:
- انتقالات حالة الطلب: مُغطاة بالكامل عبر order_status_history (كل انتقال، الفاعل، الوقت) —
  راجع INV-ORD-001، تغطية قوية.
- تفعيل/تعطيل تاجر، محاولات دخول (نجاحاً/فشلاً): مُغطاة عبر audit_log (docs/DATABASE.md §3).
- **خصم/استرجاع المخزون الناجح: غير مُسجَّل في أي سجل تدقيق مباشر.** فقط فشل الاسترجاع التعويضي
  يُسجَّل (orders.service.ts:167-178، action: 'inventory.release_failed'، إضافة commit fe12608).
  الخصم الناجح يُستدَل عليه فقط بشكل غير مباشر عبر order_items (حين يرتبط بطلب ناجح)؛ الاسترجاع
  الناجح (بعد فشل دفع/طلب لاحق) **لا يترك أي أثر تدقيقي مباشر إطلاقاً**.

Control/Implementation:
جزئي — order_status_history (كامل)، audit_log (نطاقان محدَّدان فقط، لا يشمل حركة مخزون ناجحة).

Automated Test:
NONE يثبت وجود سجل لحركة مخزون ناجحة (لأنه لا يوجد كود يكتبها أصلاً — لا فجوة اختبار، فجوة ميزة).

Guardian:
Required (MEDIUM — فجوة تغطية موثَّقة، لا ثغرة أمنية نشطة)

Evidence:
- Type: Code Inspection (قراءة orders.service.ts، inventory.repository.ts مباشرة)
- Source: orders.service.ts:63-182 (كتلة performCheckout/catch)؛ inventory.repository.ts:43-74
  (decrementIfAvailable/restore — لا استدعاء audit في أي منهما)
- Executed: 2026-09-05 (هذه الجلسة)
- Scope: مُثبَت غياب الاستدعاء — قراءة مباشرة لكل من الدالتين تؤكد عدم وجود أي كتابة audit_log عند
  نجاح الخصم أو نجاح الاسترجاع، فقط عند فشل الاسترجاع.
- Result: FAIL (بالمعنى: الادعاء الدستوري الحرفي "كل تحوّل مخزون يُسجَّل" غير محقَّق بالكامل)

Status:
VIOLATED (جزئياً) — بالنسبة لحرفية نص SALSABIL_CONSTITUTION.md §4 بند 5 كما هو مكتوب (لا بالنسبة
لأي ثغرة أمنية فورية؛ order_items/order_status_history يوفران تتبعاً غير مباشر للحالة الشائعة). مُسجَّل
أيضاً كـ CONFLICT-007 في docs/DECISIONS.md وكـ DD-003 (Decision Debt) لأنه يحتاج قراراً: هل التتبع
غير المباشر كافٍ، أم يُبنى سجل inventory_audit صريح لكل حركة.

Owner:
Founder (يحتاج قراراً: نطاق "سجل تدقيق كافٍ" لحركة المخزون)
```

---

## تاسعاً: تحديد المعدل على الدخول (Rate Limiting)

### INV-RATE-001
```
Invariant:
محاولات تسجيل الدخول الفاشلة لنفس رقم الهاتف (تاجر أو إدارة) محدودة إلى 5 محاولات كل 15 دقيقة، ثم
رفض مؤقت — تخفيف وحيد مُطبَّق لخطر INV-AUTHN-001 (دخول بلا كلمة مرور).

Control/Implementation:
src/core/kernel/security/rate-limit.ts (عدّاد في-الذاكرة، مفاتيح منفصلة merchant:<phone>/admin:<phone>).

Automated Test:
src/core/kernel/security/rate-limit.test.ts (وحدة).

Guardian:
Required (MEDIUM — تخفيف خطر أمني، لا الخطر نفسه)

Evidence:
- Type: Automated Test (وحدة)
- Source: rate-limit.test.ts
- Executed: 2026-09-05 (هذه الجلسة — ضمن npm run test:unit، 122/122 نجحت)
- Scope: مُثبَت منطق العدّاد نفسه (5 محاولات/15 دقيقة، مفاتيح منفصلة). **غير مُثبَت ولا مطبَّق أصلاً** —
  الصمود أمام إعادة تشغيل الخادم أو تعدد نسخ (Serverless/multi-instance)؛ Map في-الذاكرة يُصفَّر عند
  كل إعادة تشغيل. نفس فئة قيد INV-ORD-002 بالضبط، موثَّق سوياً كـBLOCKER موحَّد في docs/ROADMAP.md.
- Result: PASS ضمن النطاق المُختبَر (عملية واحدة)

Status:
PARTIAL — نفس منطق INV-ORD-002: مُثبَت ومُنفَّذ لنطاقه المُعلَن (عملية واحدة)، غير كافٍ لإنتاج متعدد
الخوادم. راجع DD-002 (بند موحَّد لكلا القفلين).

Owner:
Engineering
```

---

## عاشراً: سلامة البيانات المرجعية (Referential Integrity)

### INV-DATA-001
```
Invariant:
مستخدم يملك شخصية (user_personas.user_id) لا يمكن حذفه — أي محاولة حذف تُرفَض صراحة (خطأ قيد FK)،
لا حذفاً صامتاً يُتبَعه فقدان صف الشخصية (لا CASCADE). يفرض هذا قراراً صريحاً وقت أي حذف مستقبلي بدل
فقدان بيانات صامت.

Control/Implementation:
قيد FK صريح على user_personas.user_id: `on delete restrict` (docs/DATABASE.md §3، قسم worlds/
user_personas؛ scripts/day22-user-personas-fk-policy.sql — DDL يدوي عبر Supabase SQL Editor). توضيح
نية لا تغيير سلوك فعلي (كان NO ACTION ضمنياً، يتصرف مطابقاً — ADR-020).

Automated Test:
NONE (Vitest) — القيد نفسه قيد قاعدة بيانات، لا كود تطبيق. التحقق كان Live Verification مباشر عبر
سكربت DDL/DML وقت التنفيذ (scripts/day22-user-personas-fk-policy.sql)، لا اختبار Vitest في المستودع.

Guardian:
Optional (MEDIUM — قيد Schema ضيق النطاق، يمس بيانات هوية لكن التغيير نفسه توضيحي لا سلوكي)

Evidence:
- Type: Live Verification (محاولة حذف فعلية على قاعدة بيانات حية)
- Source: docs/DECISIONS.md → ADR-020؛ scripts/day22-user-personas-fk-policy.sql
- Executed: 2026-09-04 (اليوم 22، موروث — موثَّق في ADR-020 وdocs/ROADMAP.md، لم يُعَد تنفيذه في هذه
  الجلسة أو في جلسة `CONSTITUTION-V2-BATCH1-GOVERNANCE-KERNEL` — هذا نقل توثيقي لدليل قائم بالفعل، لا
  تحقق جديد)
- Scope: مُثبَت — محاولة حذف مستخدم اختباري له شخصية (persona) رُفضت فعلياً بكود قاعدة بيانات `23503`؛
  التنظيف اللاحق نجح (حذف الشخصية أولاً، ثم المستخدم). **غير مُثبَت/غير مقصود** — هذا يحسم جزءاً ضيقاً
  فقط من سؤال Soft/Hard Delete الأشمل لجدول `users` عموماً (لا يزال `OPEN_QUESTION` في docs/DATABASE.md
  §7)؛ لا علاقة له بحذف مستخدم بلا شخصية (يبقى مسموحاً بلا قيد إضافي).
- Result: PASS (رفض بكود 23503 كما هو متوقَّع، موثَّق في ADR-020)

Status:
ENFORCED — قيد قاعدة بيانات ساكن، بسيط، مُتحقَّق منه حياً بنتيجة صريحة (كود خطأ محدَّد) موثَّقة في ADR
مستقل، لا يحتاج تفسيراً إضافياً لينطبق دائماً (لا يعتمد على مسار كود قد يتغيّر).

Owner:
Engineering
```

---

## Golden Paths

> مُستخرَجة من اختبارات E2E/تكامل موجودة فعلياً في المستودع — لا مسارات مُخترَعة. راجع `AGENTS.md §18`
> للمفهوم العام (لا يُملي هذا الملف نفسه أي قائمة، القائمة الفعلية هنا فقط).

### GP-001 — رحلة الشراء الكاملة (زائر ضيف → طلب مُسلَّم)
```
الاسم: زائر ضيف يتصفح → يضيف للسلة → Checkout → تاجر يدير دورة الحياة → عزل مستأجرين ضد تاجر ثانٍ
حقيقي → إدارة تُسلِّم → سجل تدقيق كامل
المصدر: src/core/e2e/reef-city-journey.integration.test.ts (E2E-DAY13-001، 8 سيناريوهات، docs/
ROADMAP.md اليوم 13)، مُكمَّل بـ src/core/modules/orders/orders.integration.test.ts للحالات الحدّية
(تزامن/مخزون) التي أُضيفت لاحقاً (ADR-022)
نطاق المسار: من سلة زائر بلا حساب حتى orders.status = 'delivered' + order_status_history كامل +
audit_log لمحاولات الدخول
ما يحميه: عزل المستأجرين (INV-TEN-001)، آلة الحالات (INV-ORD-001)، سلامة المخزون (INV-INV-001)،
Idempotency (INV-ORD-002)
حالة الدليل: Automated Test موروث (لم يُعَد تنفيذه في هذه الجلسة التوثيقية — يتطلب Supabase حياً).
آخر تنفيذ موثَّق: ضمن commit 2425822 (2026-09-05، جلسة سابقة نفس اليوم).
```

### GP-002 — رحلة الشراء الأولى الحقيقية (Staging)
```
الاسم: سكربت رحلة شراء كامل من طرف لطرف
المصدر: scripts/test-first-real-purchase.e2e.ts (اليوم 18، docs/ROADMAP.md)
نطاق المسار: نفس GP-001 مبدئياً، لكن **مُتحقَّق منه ضد بيئة dev فقط حسب توثيق ROADMAP.md نفسه، لا ضد
staging.reefam.com** — "ملاحظة دقة صريحة" في ROADMAP.md تقر بهذا الفارق صراحة.
ما يحميه: نفس GP-001
حالة الدليل: سكربت موجود في المستودع، ليس مدمَجاً في npm run test (لا CI)، تشغيل يدوي فقط. **لا يُرفَع
كدليل ENFORCED مستقل** — يُقرأ كـGolden Path إضافي موثَّق بفجوة تنفيذ صريحة (dev ≠ staging)، لا كتأكيد
كامل لعمل النظام على بيئة الإنتاج الفعلية.
```

---

## ملخص التوزيع (2026-09-05)

| الحالة | العدد | المعرِّفات |
|---|---|---|
| ENFORCED | 10 | INV-ORD-001, INV-ORD-003, INV-INV-001, INV-INV-003, INV-RLS-001, INV-ARCH-001, INV-SEC-002, INV-AUTHZ-001, INV-DATA-001, INV-AUTHN-001 |
| PARTIAL | 4 | INV-TEN-001, INV-ORD-002, INV-SEC-001, INV-RATE-001 |
| UNKNOWN | 1 | INV-INV-002 |
| VIOLATED (جزئياً) | 1 | INV-AUDIT-001 |

> **تحديث 2026-09-09:** INV-AUTHN-001 انتقل من WAIVED → PARTIAL → **ENFORCED** —
> URGENT-MERCHANT-PASSWORD-AUTH-BEFORE-LAUNCH نفَّذ كلمة مرور حقيقية، طبَّق SQL على dev فعلياً،
> شغَّل Backfill، وتحقَّق حياً (202/203 اختباراً، وحدة + تكامل معاً — الفشل الوحيد غير متعلق
> بالمصادقة). **Guardian Review DEEP مستقل اكتمل بمراجعتين:** الأولى BLOCKED (ثغرة توقيت
> Timing Attack)، بعد الإصلاح جولة ثانية مستقلة كلياً APPROVED. راجع الإدخال الكامل أعلاه وDD-001
> في docs/DECISIONS.md (RESOLVED).

> **تحديث 2026-09-15 (TASK-08):** إضافة **INV-INV-003** جديد — إلغاء طلب موجود فعلياً (* → cancelled)
> كان يترك مخزونه محجوزاً للأبد بصمت (InventoryService.release() لم يكن يُستدعى إلا من مسار تعويض
> فشل Checkout نفسه). أُصلِح: transitionStatus يسترجع مخزون كل بند عند الإلغاء، بقفلين تفاؤليين
> مستقلين (orders.status عبر updateOrderStatus، وinventory.quantity_available عبر restore() —
> الأخير كان بلا أي قفل قبل هذه المهمة) يمنعان استرجاعاً مضاعفاً وفقد أثر تحت تزامن حقيقي معاً،
> مُثبَتان بتزامن حي فعلي (Promise.all/allSettled ضد Supabase حقيقي، لا تمويهاً). ENFORCED مباشرة —
> راجع الإدخال الكامل أعلاه.

**16 إدخالاً إجمالاً.** لا ادعاء بأن هذا شامل لكل خاصية في المشروع — هذه أول دفعة مُستخرَجة من نطاق
القراءة المُصرَّح به لهذه المهمة (orders, inventory, khalil, RLS, architecture boundaries, security
docs). نطاقات أخرى (Catalog تفصيلياً بخلاف السعر، Bayan، Context Engine/worlds تفصيلياً) لم تُفحَص
بنفس العمق في هذه الدفعة — لا تُعتبَر "بلا Invariants" لمجرد غيابها هنا، بل غير مفحوصة بعد.
