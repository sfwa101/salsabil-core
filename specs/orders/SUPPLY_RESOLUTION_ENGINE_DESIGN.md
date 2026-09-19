---
title: تصميم مكتبة المنتجات المشتركة ومحرك حل التوريد (Supply Resolution Engine)
status: APPROVED
version: 1.0
last_updated: 2026-09-19
owner: Claude (تصميم) + المؤسس (اعتماد نهائي) — اعتُمد من المؤسس بتاريخ 2026-09-19
source_of_truth: هذا الملف لنطاق التصميم نفسه — معتمَد نهائياً من المؤسس بتاريخ 2026-09-19؛ لا كود،
  لا Schema حي حتى تكليف صريح منفصل لاحقاً (بنفس نمط TASK-12 بعد اعتماد `PHASE_2_DOMAIN_DESIGN.md`) —
  اعتماد هذه الوثيقة **لا يُعَد إذناً ببدء أي تنفيذ**، راجع Founder Gate أدناه
related: specs/orders/PHASE_2_DOMAIN_DESIGN.md (النمط/الصرامة المرجعية)، docs/DATABASE.md §3/§3.1،
  docs/ARCHITECTURE.md، docs/DOMAIN_MAP.md (OPEN_QUESTION-001/002)، docs/BUSINESS_RULES.md (BR-017)،
  docs/PRODUCT_ENGINE.md، docs/DECISIONS.md (ADR-022, ADR-031, ADR-032, DD-002, DD-003, DD-004, DD-019)،
  SALSABIL_CONSTITUTION.md §4/§4.1/§6/§19/§29.3، ideas/IDEAS.md → IDEA-004،
  docs/audits/2026-09-19-task-18-catalog-storefront-report.md،
  docs/audits/2026-09-19-launch-readiness-report.md
---

> **✅ تصادم تسمية محلول — إعادة تسمية الملف (قرار مؤسس، 2026-09-19).** كان هذا الملف يُسمَّى
> `specs/orders/PHASE_3_SUPPLY_RESOLUTION_DESIGN.md` — تصادم حقيقي مع ترقيم "Phase 3" الموجود فعلاً في
> `specs/orders/REEF_V1_MASTER_EXECUTION_PLAN.md` (حيث Phase 3 = "تنفيذ Multi-Merchant"، **منجَزة
> بالفعل** — TASK-12/13، `docs/audits/2026-09-19-launch-readiness-report.md`)، اكتُشف أثناء التحقق الحي
> لهذه الوثيقة، من نفس فئة تصادمات التسمية الموثَّقة سابقاً في المشروع (`world_scope` مقابل
> `data-world`، `worlds` مقابل `WorldSlug`، إسناد `ADR-025` الخاطئ قبل تصحيحه بـ`ADR-031`). **حُسم
> بإعادة التسمية إلى `SUPPLY_RESOLUTION_ENGINE_DESIGN.md`** (عبر `git mv`، تاريخ الملف محفوظ) — لا
> بادئة رقم مرحلة، بلا أي تسلسل رسمي مُفترَض مع ترقيم `REEF_V1_MASTER_EXECUTION_PLAN.md`.

> **Founder Gate — ✅ APPROVED بتاريخ 2026-09-19.** أربعة قرارات مؤسس صريحة حُسمت بهذا الاعتماد (تفصيل
> كامل في §24.4.1): (1) الحد الأدنى لهامش ريف **منفصل تماماً** عن جدول العمولات (`CONSTITUTION §19`) —
> بلا علاقة حسابية؛ (2) القيمة الافتراضية العالمية للهامش = **5% من `base_price`**، Configuration قابلة
> للتعديل من لوحة إدارة مستقبلية، **لا `Fail Open` بعد الآن**؛ (3) مصير الـ7,506 منتج بلا تاجر — تُعتمَد
> التوصية الأصلية في §20 حرفياً (تبقى غير قابلة للشراء حتى عرض توريد حقيقي)؛ (4) إعادة تسمية الملف —
> منفَّذة. البند الوحيد المتبقي مفتوحاً صراحة (مؤجَّل، لا منسي): توقيت بناء `open_marketplace_v5`
> (مرتبط بحسم `BR-017`، §24.4.2). **⚠️ هذا اعتماد للتصميم كتوثيق فقط — لا يُشكِّل إذناً ببدء أي تنفيذ.**
> أي Task تنفيذ V1 يحتاج تكليفاً صريحاً منفصلاً لاحقاً (نفس بوابة TASK-12 بعد اعتماد
> `PHASE_2_DOMAIN_DESIGN.md`) — صفر كود، صفر Migration، صفر تعديل على أي ملف تطبيق حتى ذلك التكليف.

---

## 0. منهجية التحقق الحي المُتَّبَعة في هذه الوثيقة

> Evidence Model المستخدَم هنا مطابق حرفياً لـ`SALSABIL_CONSTITUTION.md §4.1`: **Live Verification
> > Automated Test مُنفَّذ فعلياً > فحص الكود (Code Inspection) > التوثيق > الافتراض.** كل ادعاء أدناه
> موسوم بأحد هذه المستويات بين قوسين `[LIVE]` / `[CODE]` / `[DOC]` / `[ASSUMPTION]`. لا افتراض واحد من
> المسودة المفاهيمية الأصلية (التي كُلِّفتُ بمراجعتها كنقطة انطلاق فكرية) اعتُمد هنا بلا تحقق حي أو فحص
> كود مباشر — **المسودة الأصلية نفسها لم تكن متوفرة فعلياً في هذه الجلسة** (بحث كامل في المستودع أثبت
> عدم وجودها؛ المؤسس أكَّد المتابعة بدونها). كل ما يلي مبني حصراً على قراءة مباشرة للكود/الـSchema
> الحي/تقارير تحقُّق حي حديثة (`docs/audits/2026-09-19-*.md`) بتاريخ اليوم نفسه.

**ملخص التحقق الحي الذي أُجري فعلياً لهذه المهمة (تفصيل كامل لكل بند في الأقسام المرتبطة أدناه):**

| # | ما تم التحقق منه | الطريقة | النتيجة الموجزة |
|---|---|---|---|
| 1 | شكل `products` الفعلي الكامل (كل الأعمدة) | `[CODE]` قراءة مباشرة لـ`scripts/01-districts-architecture-migration.sql` + `scripts/catalog-import-schema.sql` + `docs/DATABASE.md §3` | 24 عموداً فعلياً، ليس فقط ما ورد في `DATABASE.md` الأصلي — راجع §1.1 |
| 2 | هل `tenant_id` فعلاً `NULL` على كل الـ7,506 منتج المستورَدة، أم جزء منها؟ | `[LIVE]` — `docs/audits/2026-09-19-task-18-catalog-storefront-report.md §5` (استعلام مباشر service_role بتاريخ اليوم) | **7,506/7,556 كلها `NULL`** (99.3%)، 50 فقط (الدفعة التجريبية القديمة) لها `tenant_id`. تقاطع `district_id`+`tenant_id` = **صفر مطلق** |
| 3 | شكل `merchant_suborders`/`customer_orders` الفعلي في الكود | `[CODE]` قراءة مباشرة لـ`src/core/modules/orders/customerOrder.repository.ts` (337 سطراً كاملة) | مطابق **حرفياً** لـ`PHASE_2_DOMAIN_DESIGN.md` — لا انحراف واحد. **مُتحقَّق أيضاً `[LIVE]`** عبر `docs/audits/2026-09-19-launch-readiness-report.md`: "الجداول العشرة حية فعلياً على dev" |
| 4 | أين بالضبط يرفض Checkout سطراً بلا `tenant_id`؟ Cart أم Checkout؟ | `[CODE]` قراءة مباشرة لـ`orders.service.ts:104-107` داخل `performCheckout()` | **داخل Checkout نفسه، لا Cart** — `cart.service.ts.addItem` **لا يتحقق من `tenant_id` إطلاقاً** (مؤكَّد أيضاً في تقرير TASK-18 §5) |
| 5 | شكل `ADR-022` (`decrementIfAvailable`/`restore`) الفعلي | `[CODE]` قراءة مباشرة لـ`inventory.repository.ts` كاملاً | نمط Optimistic Concurrency: قراءة → `UPDATE` مشروط بمطابقة القيمة المقروءة → إعادة محاولة (3 لـ`decrementIfAvailable`، 8 لـ`restore`، وُسِّعت في `ADR-032`) — راجع §15 |
| 6 | جداول/كود أخرى تعتمد على `products.tenant_id` غير موثَّقة | `[CODE]` بحث مباشر (`grep`) + قراءة `catalog-import-schema.sql`/`catalog.service.ts` | اكتُشف نظام كامل غير مذكور في موجّه هذه المهمة: **`catalog_master_items`/`catalog_review_queue` (`ADR-031`)** — مكتبة منتجات جزئية **موجودة فعلياً**، تُغيِّر تصميم هذه الوثيقة جوهرياً — راجع §2 |
| 7 | عدد/شكل `catalog_categories` الفعلي بعد TASK-17/18 | `[LIVE]` — نفس تقرير TASK-18 §2 | `catalog_districts`: 19، `catalog_categories`: 52، `catalog_subcategories`: 20. **هرمية تصنيف تصفح للعميل (حي المنتجات) — لا علاقة جغرافية/توصيل** (راجع تحذير §8 أدناه) |

**تعارض توثيقي مكتشَف أثناء هذا التحقق (غير مطلوب إصلاحه هنا، موثَّق لعدم إخفائه):**
`docs/DATABASE.md §3.1` لا يزال يصف Phase 2 كـ`APPROVED_PENDING_MANUAL_EXECUTION` ("لم يُنفَّذ على أي
بيئة بعد") — هذا **غير صحيح حالياً**؛ التحقق الحي (`[LIVE]`، البند 3 أعلاه) يثبت أن الجداول العشرة
منفَّذة وحية على `dev` فعلياً منذ commit `a6ec2a2`/`65ac792`. `docs/DATABASE.md` لم يُحدَّث بعد ليعكس
هذا — فجوة توثيقية (`AGENTS.md §13`)، لا تخصّ نطاق هذه المهمة (توثيق فقط)، لكنها موثَّقة هنا صراحة
ومذكورة في التقرير النهائي (§25).

---

## 1. معمارية مكتبة المنتجات المشتركة (Product Library)

### 1.1 التصحيح الجوهري الأول: مكتبة منتجات جزئية **موجودة فعلياً** — هذه الوثيقة تُبنى فوقها، لا من الصفر

المسودة المفاهيمية الأصلية لهذه المهمة (غير المتوفرة فعلياً، راجع §0) افترضت على الأرجح — بما أنها
كُتبت بلا وصول للكود — أن "مكتبة المنتجات المشتركة" فكرة جديدة كلياً. **هذا غير دقيق بالتحقق الحي:**
`ADR-031` (`docs/DECISIONS.md`، توثيق رجعي لقرار مُنفَّذ فعلياً منذ 2026-09-13، commit `1c62fd9`) وثّق
نظاماً ثلاثي الطبقات **حي بالفعل**، يُستهلَك اليوم عبر `catalog.service.ts`/`catalog.repository.ts`:

```
catalog_master_items (يملكه platform_admin حصراً)
  — الاسم، الوصف، سعر البيع المعتمَد (basePrice)، الوحدة، الصورة، category_id (→ categories القديم)
        │
        │ upsertTenantProductFromMaster() عند استيراد/حسم مراجعة
        ▼
products (نسخة تاجر — clone)
  — tenant_id (owner الفعلي)، master_item_id (→ catalog_master_items، nullable)
  — سعر البيع مقفول على سعر الكتالوج الأساسي (لا يعدّله التاجر)
        │
        │ 1:1 عبر product_id
        ▼
inventory
  — quantity_available (كمية التاجر)، cost_price (تكلفة شراء التاجر — "سعر التوريد" الفعلي، مضاف في نفس ADR-031)
```

```
catalog_review_queue — صفوف استيراد تاجر لم تُطابِق أي عنصر في catalog_master_items، بانتظار قرار
  platform_admin: resolveReviewQueueAsNew (عنصر أساسي جديد) أو resolveReviewQueueAsMerge (دمج مع
  عنصر قائم — هذا هو الحل الحالي لـ"منتجات متطابقة عبر تجار متعددين")
```

**ما هذا يعني لهذه الوثيقة:** §§2-4 أدناه لا تصمم "مكتبة منتجات" جديدة من الصفر — هي **توسّع** النظام
القائم فعلياً (`ADR-031`) بثلاثة أشياء غير موجودة فيه اليوم: (أ) تسمية مفاهيمية رسمية للعلاقات القائمة
(§2)، (ب) إنفاذ حد أدنى لهامش ريف على العلاقة `base_price`/`cost_price` القائمة أصلاً بلا أي إنفاذ اليوم
(§3)، (ج) مطابقة بالباركود قبل الاسم في مسار الاستيراد (§4)، و(د) **محرك حل توريد** يختار "أي نسخة تاجر"
(أي صف `products` مرتبط بنفس `master_item_id`) يُستخدَم فعلياً لتلبية طلب عميل، وهو غير موجود إطلاقاً
اليوم (§5 وما بعدها) — لأن الكود الحالي لا يطرح هذا السؤال أصلاً (العميل يختار بطاقة منتج بعينها،
أي صف `products` بعينه، مسبقاً عند الإضافة للسلة؛ لا "طلب مجرّد" يُحل لاحقاً — راجع التصحيح الحاسم في §13).

### 1.2 تعارض تصنيف مكتشَف حياً — `catalog_master_items.category_id` على تصنيف قديم منفصل

`catalog_master_items.category_id` `[CODE]` يشير إلى جدول `categories` **القديم** (صف تجريبي واحد،
"حي الطعام اليومي") — **ليس** `catalog_categories` الجديد (52 صفاً، `[LIVE]`، المُستهلَك فعلياً في تصفح
العميل بعد TASK-18). بعبارة أخرى: مكتبة المنتجات المشتركة القائمة (`catalog_master_items`) مصنَّفة على
هرمية تصنيف **مختلفة تماماً وغير مربوطة** بالهرمية التي يتصفحها العميل فعلياً اليوم (`catalog_districts`
→ `catalog_categories` → `catalog_subcategories`). **هذا تعارض حقيقي يؤثر مباشرة على §3 (إنفاذ الهامش
على مستوى "القسم")** — أي "قسم" بالضبط؟ راجع القرار الصريح في §3.2 والسؤال المفتوح المرتبط في §24.

### 1.3 المعمارية المقترحة (إضافية فقط فوق ما هو قائم)

لا تغيير على `catalog_master_items`/`products`/`inventory`/`catalog_review_queue` القائمة بنيوياً (صفر
`ALTER` جديد مطلوب لهذا القسم تحديداً — الأعمدة الموجودة كافية). الإضافة الوحيدة الجديدة هنا هي محرك حل
التوريد نفسه (جدول `resolution_records`، §16) والتوسعتان الصغيرتان الآمنتان لـ`catalog_master_items`
(§3) و`catalog_review_queue`/منطق المطابقة (§4).

---

## 2. الفصل المفاهيمي: Product / Merchant Offer / Supply Price / Retail Price / Customer Order / Merchant Suborder

> تسمية رسمية لعلاقات **موجودة فعلياً في الكود اليوم** (`[CODE]`، §1.1) — لا كيانات جديدة، فقط توحيد
> المصطلح المفاهيمي بما يوازي "customer_order/merchant_suborder مقابل customer_orders/merchant_suborders"
> في `PHASE_2_DOMAIN_DESIGN.md §2.1` (نفس الفارق بين مصطلح نثري ومسمّى SQL فعلي).

| المصطلح المفاهيمي | الكيان الفعلي في الكود | ملاحظة |
|---|---|---|
| **Product** (المنتج المرجعي) | صف `catalog_master_items` | يملكه `platform_admin` حصراً. اسم/وصف/وحدة/صورة/تصنيف موحَّدون لكل التجار |
| **Retail Price** (سعر التجزئة للعميل) | `catalog_master_items.base_price` | مقفول — لا يعدّله أي تاجر، فقط `platform_admin` عبر `updateMasterItemPrice` (يتدفَّق تلقائياً `cascadeBasePriceToLinkedProducts`) |
| **Merchant Offer** (عرض التاجر) | صف `products` حيث `master_item_id IS NOT NULL` | نسخة تاجر واحد من منتج مرجعي واحد — `tenant_id` + `master_item_id` معاً يحدّدانه بشكل فريد (`products_tenant_master_item_uidx`، `[CODE]`) |
| **Supply Price** (سعر توريد التاجر) | `inventory.cost_price` (المرتبط بصف `products` ذاك) | تكلفة شراء التاجر الخاصة به — مختلفة عن `base_price`/سعر البيع. **الهامش = `base_price − cost_price`** (راجع §3) |
| **Customer Order** | صف `customer_orders` | طلب عميل واحد، قد يمتد عبر أكثر من تاجر (`PHASE_2_DOMAIN_DESIGN.md §2.3`، حي `[LIVE]`) |
| **Merchant Suborder** | صف `merchant_suborders` | حصة تاجر واحد من طلب عميل — الوحدة التي ينفّذها التاجر فعلياً (`§2.4` من نفس الوثيقة) |

**ملاحظة حاسمة (تصحيح على افتراض محتمل في المسودة غير المتوفرة):** لا يوجد اليوم مفهوم "منتج واحد
معروض من عدة تجار في بطاقة واحدة" على مستوى الواجهة — كل `Merchant Offer` هو صف `products` **مستقل تماماً**
بمعرّفه الخاص (`id`)؛ تعدد التجار لنفس `Product` يعني ببساطة عدة صفوف `products` تشترك في نفس
`master_item_id`. محرك حل التوريد (§5 وما بعده) يعمل **على مستوى هذه الصفوف المتعددة**، لا على مفهوم
"عرض" منفصل بنيوياً — لا جدول `merchant_offers` جديد مطلوب، العمود `master_item_id` القائم هو مفتاح
التجميع الفعلي بالفعل.

---

## 3. قواعد التسعير للعميل + إنفاذ الحد الأدنى لهامش ريف

### 3.1 التسعير للعميل — بلا تغيير

سعر العميل النهائي يبقى حصرياً `CatalogService.calculatePrice()` (`[CODE]`، `PRODUCT_ENGINE.md §5`،
`SALSABIL_CONSTITUTION.md §4` بند 2) — يُطبَّق على `products.base_price` + تعديلات `options` لصف
`products` المُختار (أياً كان التاجر الذي حُلَّ توريده). **محرك حل التوريد لا يحسب سعراً، ولا يحسب هامشاً
وقت البيع** — الهامش (§3.2 أدناه) قيد **يُفحَص وقت اعتماد/تحديث سعر الكتالوج الأساسي أو وقت حل التوريد
(رفض عرض تاجر يخرق الحد الأدنى)**، لا حساباً يُعاد كل مرة يُعرَض فيها المنتج للعميل.

### 3.2 الحد الأدنى لهامش ريف — التصميم

**الصيغة:** `هامش التاجر = catalog_master_items.base_price − inventory.cost_price` (لصف `products`
ذاك تحديداً). ريف تفرض **حداً أدنى** لهذا الهامش، بمستويين (بالترتيب — الأخص يفوز):

1. **استثناء منتج واحد** — عمود جديد `catalog_master_items.min_margin_override` (`numeric`, `nullable`).
   إن كان مضبوطاً، يُستخدَم حرفياً بصرف النظر عن قسمه.
2. **مستوى قسم** — جدول جديد `catalog_category_min_margins` (تفصيل §3.3)، مفتاحه `catalog_categories.id`
   (**القرار الصريح هنا:** الهرمية الجديدة `catalog_categories` — الفعلية المُستهلَكة في تصفح العميل —
   لا الجدول القديم `categories` الذي يستخدمه `catalog_master_items.category_id` اليوم `[CODE]`، راجع
   التعارض §1.2). **هذا يتطلب أن يحمل `catalog_master_items` أيضاً `catalog_category_id` (عمود جديد،
   `nullable`، إضافي بحت) لا أن يعتمد فقط على `category_id` القديم** — بلا هذا العمود، لا مسار فعلياً
   لربط عنصر كتالوج أساسي بقسم من الهرمية الجديدة أصلاً. **هذا قرار تصميم صريح يُسجَّل هنا كقرار معماري
   (§25)، لا كسؤال مفتوح** — لأن ترك `min_margin` على الجدول القديم غير المُستهلَك في التصفح الفعلي
   يجعله عديم الفائدة العملية بحكم الواقع الحي (§1.2).
3. **افتراضي عالمي — قرار مؤسس صريح (2026-09-19)، لم يعد `OPEN_QUESTION`:** **5% من
   `catalog_master_items.base_price`** (نسبة مئوية، لا قيمة مطلقة كالمستويين الأخص أعلاه — راجع §3.3
   لتبرير اختلاف الوحدة). **Configuration قابلة للتعديل من لوحة إدارة مستقبلية بناءً على بيانات حقيقية
   بعد الإطلاق، لا Invariant مبرمجة بصلابة في الكود** (مطابق حرفياً لمبدأ `SALSABIL_CONSTITUTION.md §4`
   بند 7). **النظام لم يعد `Fail Open`** — يوجد دائماً حد أدنى فعّال لكل عرض تاجر، حتى بلا قسم أو
   استثناء منتج مضبوطين.

**العلاقة بجدول العمولات (`SALSABIL_CONSTITUTION.md §19`) — محسومة الآن (قرار مؤسس صريح، 2026-09-19):**
**منفصلان تماماً، بلا أي علاقة حسابية بينهما.** الحد الأدنى لهامش ريف هنا **قيد حماية داخلي خاص بنظام
المكتبة المشتركة فقط** (`catalog_master_items`/`Merchant Offer`s المشتقة منها عبر `master_item_id`) —
لا يُخصَم من نسبة العمولة، ولا يُضاف فوقها، ولا يحل محلها. جدول العمولات (`CONSTITUTION §19`: بقالة 5%،
ألبان 25%، عطور 30%+...) **يبقى كما هو تماماً لغرضه الأصلي** (نموذج العمولة على النموذج القديم/الحالات
الأخرى خارج نطاق المكتبة المشتركة) — لا صيغة موحَّدة تجمع المفهومين، ولا افتراض بأن أحدهما يُقيَّد
بالآخر. تاجر قد يدفع عمولة % **و** يخضع لقيد هامش أدنى مطلق معاً، دون أي تعارض مفاهيمي — هذان قيدان
مستقلان تماماً على نطاقين مختلفين.

### 3.3 Schema (تصميمي — بدون Migration فعلي)

**لماذا الافتراضي العالمي بوحدة مختلفة (نسبة مئوية) عن مستويي القسم/الاستثناء (قيمة مطلقة):** مستوى
القسم/الاستثناء يضبطهما `platform_admin` بمعرفة مباشرة بنطاق أسعار ذلك القسم/المنتج تحديداً — قيمة
مطلقة (جنيه) منطقية هناك. الافتراضي العالمي يُطبَّق **عبر كامل الكتالوج بأسعار متفاوتة جداً** (من قروش
لآلاف الجنيهات) — قيمة مطلقة واحدة هنا كانت لتكون إما تافهة لمنتج غالٍ أو مستحيلة لمنتج رخيص؛ نسبة مئوية
من `base_price` نفسه تتناسب تلقائياً مع سعر كل منتج. **هذا تفسير معماري لقرار المؤسس ("5%")، لا حسماً
مستقلاً من الوكيل** — القيمة (5) والمبدأ (قابلة للتعديل من لوحة إدارة) صادران عن المؤسس مباشرة؛ التفسير
بأنها نسبة مئوية لا قيمة مطلقة استنتاج معماري صريح يستحق تأكيد المؤسس عند أول مراجعة لاحقة لو قُصِد خلاف
ذلك.

```sql
-- إضافة على catalog_master_items القائم — nullable، توافق عكسي كامل (نفس نمط ADR-018/ADR-019/ADR-031)
alter table catalog_master_items add column catalog_category_id uuid references catalog_categories(id);
alter table catalog_master_items add column min_margin_override numeric check (min_margin_override is null or min_margin_override >= 0);

-- جدول جديد — الحد الأدنى لكل قسم من الهرمية الجديدة (catalog_categories، لا القديم) — قيمة مطلقة (جنيه)
create table catalog_category_min_margins (
  catalog_category_id uuid primary key references catalog_categories(id),
  min_margin numeric not null check (min_margin >= 0),
  updated_by uuid not null references users(id),
  updated_at timestamptz not null default now()
);
alter table catalog_category_min_margins enable row level security;
-- بلا أي policy — النمط 2 (قرار تسعير حساس)، وصول حصري عبر service_role، نفس نمط merchants/orders

-- الإعداد الافتراضي العالمي — Configuration قابلة للتعديل من لوحة إدارة مستقبلية (قرار مؤسس، 2026-09-19)
-- نسبة مئوية من base_price، لا قيمة مطلقة (راجع التبرير أعلاه). صف واحد فقط فعلياً اليوم
-- (key = 'default_min_margin_percent')، مفتاح/قيمة عام يسمح بإضافة إعدادات مستقبلية أخرى بلا Migration
-- Schema جديدة لكل إعداد.
create table supply_resolution_global_settings (
  key text primary key,
  value numeric not null,
  updated_by uuid not null references users(id),
  updated_at timestamptz not null default now()
);
alter table supply_resolution_global_settings enable row level security;
-- بلا أي policy — النمط 2، وصول حصري عبر service_role. صف ابتدائي عند أول تنفيذ فعلي لهذا التصميم
-- (خارج نطاق هذه الوثيقة التوثيقية): ('default_min_margin_percent', 5, ...) — القيمة 5 بقرار مؤسس
-- مباشر (2026-09-19)، لا اختراع تقني.
```

**صيغة الفحص تختلف حسب المستوى المطبَّق (نفس الهامش المحسوب، وحدتا مقارنة مختلفتان):**
```
هامش_مطلق = catalog_master_items.base_price − inventory.cost_price   -- (لصف products ذاك تحديداً، كما في §3.2)

مستوى استثناء منتج/قسم (قيمة مطلقة):  هامش_مطلق >= min_margin_override أو min_margin (بالجنيه)
المستوى الافتراضي العالمي (نسبة مئوية): هامش_مطلق >= (default_min_margin_percent / 100) × base_price
```

### 3.4 متى يُفحَص الهامش (بلا حساب حي متكرر عند كل عرض منتج)

- **وقت اعتماد/تعديل `catalog_master_items.base_price`** (`updateMasterItemPrice`، `[CODE]`، موجودة
  فعلياً) — يجب أن تتحقق أيضاً (توسعة على الدالة القائمة، غير مبنية هنا) أن الهامش الناتج لكل صف
  `products` مرتبط لا يخالف الحد الأدنى المُحسَم له (استثناء المنتج، أو حد القسم، أو الافتراضي العالمي
  5% إن لم يُضبَط أي منهما — §3.2).
- **وقت حل التوريد نفسه** (§7 — قيد صارم، لا تحسين قابل للتفاوض) — أي عرض تاجر (`Merchant Offer`)
  يخرق الحد الأدنى **يُستبعَد من الترشيح** قبل أي حساب تحسين آخر، بصرف النظر عن توفره أو قربه.
- **لا فحص عند كل استعلام تصفح/عرض منتج للعميل** — نفس فلسفة `calculatePrice()` القائمة (يُحسَب عند
  الحاجة الفعلية، لا يُخزَّن نتيجة وسيطة).

---

## 4. تدفق مراجعة مزدوج + منع التكرار

### 4.1 الوضع الحالي — مراجعة واحدة فقط، بلا تمييز "منتج جديد" مقابل "إثراء منتج قائم"

`[CODE]` — `importMerchantExcel()` اليوم يعرف حالتين فقط: تطابق حرفي (بعد تطبيع الاسم) مع
`catalog_master_items` قائم → ينشئ/يُحدِّث `Merchant Offer` تلقائياً بلا مراجعة بشرية إطلاقاً؛ أو عدم
تطابق → صف واحد في `catalog_review_queue` يحسمه `platform_admin` بخيارين فقط: `resolveReviewQueueAsNew`
(عنصر جديد بالكامل) أو `resolveReviewQueueAsMerge` (دمج بعنصر قائم يختاره الأدمن يدوياً). **لا "مراجعة
خفيفة لإثراء منتج قائم" منفصلة عن "مراجعة كاملة لمنتج جديد" اليوم** — كلاهما يمران بنفس نموذج الحسم.

### 4.2 مراجعة المحتوى (Content Review) — خطوة مستقلة تماماً عن مطابقة الهوية، لا فرع منها

> **⚠️ تصحيح صريح على نسخة سابقة من هذا القسم:** نسخة أولى من §4.2/§4.3 كانت تصف "مراجعة خفيفة" كأنها
> نتيجة تلقائية لمطابقة الباركود نفسها — هذا **تناقض داخلي حقيقي** مع §4.3 (الذي يصف مطابقة الباركود
> كتلقائية بالكامل بلا أي بوابة بشرية). صُحِّح هنا: **مطابقة الهوية (§4.3) ومراجعة المحتوى (هذا القسم)
> خطوتان مستقلتان تماماً**، لا خطوة واحدة بمظهرين. الباركود يحسم **فقط** "هل هذا نفس المنتج؟" (سؤال
> هوية) — لا يحسم إطلاقاً "هل نُحدِّث بيانات `catalog_master_items` بما وصل من التاجر؟" (سؤال محتوى،
> يمر دائماً على بوابة بشرية، بلا استثناء لأي مسار مطابقة).

**الخطوتان بالترتيب الفعلي:**

1. **مطابقة الهوية أولاً** (§4.3 بالكامل) — تلقائية 100%، بلا أي بوابة بشرية، أياً كان مصدر المطابقة
   (باركود أو اسم مُطبَّع). نتيجتها الوحيدة: تحديد أي `catalog_master_items` (إن وُجد) يخص هذا الصف
   المستورَد، وإنشاء/تحديث `Merchant Offer` (صف `products` + `inventory` الخاص بالتاجر) فوراً — **هذا
   لا يتأخر أبداً بانتظار مراجعة محتوى**، تماماً كسلوك اليوم (`matched++` فوري).
2. **مراجعة المحتوى ثانياً، بمعزل تام** — إن كان الصف المستورَد (**بصرف النظر عن كيف حُلَّت هويته**:
   تطابق باركود تلقائي، تطابق اسم مُطبَّع تلقائي، أو دمج يدوي عبر `resolveReviewQueueAsMerge`) يحمل
   بيانات إضافية غير موجودة على `catalog_master_items` المطابَق (صورة أفضل، وصف أدق، `specs`) — هذا
   **يُنشئ دائماً** طلب "مراجعة خفيفة" (Lightweight Review) منفصلاً، **لا يُطبَّق تلقائياً أبداً على
   `catalog_master_items` نفسه** تحت أي ظرف، بلا استثناء لمسار المطابقة الذي أوصل إليه.

**الفرق عن Full Review:**

- **Full Review (منتج جديد كلياً)** — يبقى **بلا تغيير** عن `resolveReviewQueueAsNew` القائمة: لا مطابقة
  هوية نجحت أصلاً (§4.3 بند 3)، الأدمن يُدخِل الاسم/الوصف/الوحدة/السعر/التصنيف بالكامل من الصفر.
- **Lightweight Review (إثراء منتج قائم)** — هوية مطابَقة بالفعل (أياً كان المسار)، فقط **محتوى إضافي**
  بانتظار موافقة/رفض الأدمن قبل أن يُدمَج في `catalog_master_items` القائم — الأدمن **لا يُنشئ عنصراً
  جديداً ولا يُدخِل بيانات من الصفر**، فقط يوافق/يرفض دمج الحقول الإضافية (تدفّق أخف بكثير من Full
  Review، بلا نموذج إدخال كامل).

### 4.3 منع التكرار: مطابقة الهوية فقط — الباركود أولاً، ثم الاسم المُطبَّع (تلقائية بالكامل، لا علاقة لها بمراجعة المحتوى)

> **نطاق هذا القسم محصور بسؤال الهوية وحده** ("هل هذا نفس المنتج الموجود في `catalog_master_items`؟").
> **لا شيء هنا يفحص محتوى الصف المستورَد أو يقرر تحديث `catalog_master_items`** — ذلك حصراً §4.2 أعلاه،
> خطوة تالية مستقلة تعمل بعد أن تحسم هذه الخطوة الهوية، لا كجزء منها.

`[CODE]` مؤكَّد: `products.barcode` **عمود موجود فعلياً** (أُضيف في TASK-17، `01-districts-architecture-
migration.sql:52`) لكن **غير مُستهلَك إطلاقاً** في منطق المطابقة الحالي (`text-normalize.ts`/
`importMerchantExcel`) — فجوة حقيقية، لا افتراض. **التصميم المقترَح (هوية فقط):**

```
عند صف استيراد تاجر جديد (اسم، كمية، تكلفة[، باركود إن وُجد في ملف التاجر]):
  1. إن وُجد باركود في الصف المستورَد:
       ابحث عن catalog_master_items بنفس الباركود (يتطلب عمود جديد catalog_master_items.barcode،
       nullable — راجع §4.4) → تطابق هوية فوري بصرف النظر عن الاسم، تلقائي بالكامل، بلا أي بوابة
       بشرية (نفس صرامة تطابق الاسم اليوم) — ثقة أعلى بكثير من مطابقة الاسم (باركود مطابق = نفس
       المنتج فعلياً بشبه يقين تجاري، لا احتمال تشابه أسماء). **ينتقل فوراً بعدها لفحص §4.2 (محتوى
       إضافي؟) بمعزل تام — هذه الخطوة نفسها انتهت عند تحديد الهوية، لا تمتد لفحص المحتوى.**
  2. لا تطابق باركود (لا باركود في الصف، أو باركود لا يطابق أي عنصر قائم):
       ارجع لسلوك اليوم بلا تغيير — تطابق حرفي هوية على الاسم المُطبَّع (text-normalize.ts، بلا Fuzzy،
       نفس قرار المؤسس الصريح الموثَّق في ADR-031)، **تلقائي بالكامل أيضاً، بلا بوابة بشرية** — ثم نفس
       الانتقال لفحص §4.2 بمعزل تام.
  3. لا تطابق بأي من الاثنين → catalog_review_queue كما اليوم بلا تغيير (حسم الهوية يدوياً عبر
     `resolveReviewQueueAsNew`/`resolveReviewQueueAsMerge`؛ أي محتوى إضافي في حالة `AsMerge` تحديداً
     يمر أيضاً على فحص §4.2 بعد حسم الهوية، لا بمعزل عنه).
```

**لماذا لا استبدال كامل لمطابقة الاسم بالباركود:** `[LIVE]` أغلبية الكتالوج الحالي (كل الـ7,506 منتج
المستورَدة عبر TASK-17) قد يحمل باركوداً أو لا — لم يُتحقَّق من نسبة التغطية الفعلية هنا (خارج نطاق هذه
المهمة، تحتاج استعلاماً حياً منفصلاً). الباركود **أولوية أعلى عند توفره**، لا شرطاً حصرياً — يحافظ هذا
على سلوك اليوم بلا كسر لأي مسار استيراد لا يحمل باركوداً.

### 4.4 Schema (تصميمي)

```sql
alter table catalog_master_items add column barcode text;
create unique index catalog_master_items_barcode_uidx on catalog_master_items (barcode) where barcode is not null;
```

**`catalog_content_review_queue` — جدول جديد منفصل تماماً عن `catalog_review_queue` (قرار صريح، لا
توسعة):** دورة حياته مختلفة جوهرياً عن طابور مطابقة الاستيراد — هذا "مقترح محتوى بانتظار موافقة إدارية"
على `catalog_master_items` **قائم بالفعل** (هويته محسومة أصلاً عبر §4.3)، لا صف استيراد **بلا هوية بعد**
مثل `catalog_review_queue`. توسعة الجدول القائم كانت ستُقحم قيمتي `status` جديدتين (`content_approved`/
`content_rejected`) لا معنى لهما إطلاقاً في سياق `approved_new`/`merged` الحاليتين (كلتاهما تصفان حسم
هوية، لا قراراً على محتوى)، وتُلزم كل صف قديم بأعمدة `resolved_master_item_id`/`resolved_product_id`
فارغة دوماً لهذا النوع الجديد من الطلبات — خلط مسؤوليتين مختلفتين في جدول واحد، بعكس نمط المشروع القائم
(مثال: `audit_log` منفصل عمداً عن `order_status_history` رغم أن كليهما "سجل"، `docs/DOMAIN_MAP.md`).

```sql
create table catalog_content_review_queue (
  id uuid primary key default gen_random_uuid(),
  master_item_id uuid not null references catalog_master_items(id),  -- الهوية محسومة بالفعل (§4.3) — لا FK لـproducts هنا
  tenant_id uuid not null references merchants(id),                   -- ⚠️ تسمية مُعدَّلة عمداً عن submitted_by_merchant_id المقترَحة — راجع الملاحظة أسفله
  proposed_images text[] default '{}',        -- نفس نمط/نوع products.gallery_images (01-districts-architecture-migration.sql:60)
  proposed_description text,
  proposed_specs jsonb,                        -- نفس نمط/نوع products.specs (نفس الملف:61)، nullable هنا (لا default '{}' — تمييز "لم يُقترَح شيء" عن "اقتُرح كائن فارغ")
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint catalog_content_review_queue_has_content_check
    check (proposed_images <> '{}' or proposed_description is not null or proposed_specs is not null)
);
alter table catalog_content_review_queue enable row level security;
create index catalog_content_review_queue_status_idx on catalog_content_review_queue (status, created_at);
create index catalog_content_review_queue_master_item_idx on catalog_content_review_queue (master_item_id);
-- بلا أي policy — النمط 2، وصول حصري عبر service_role (نفس تصنيف catalog_review_queue تماماً: بيانات
-- تخص تكلفة/مصدر تاجر بشكل غير مباشر عبر master_item_id، لا قراءة عامة لها أي فائدة)
```

**ملاحظة تسمية صريحة (انحراف متعمَّد عن الاقتراح الحرفي):** العمود `tenant_id` هنا بدل
`submitted_by_merchant_id` المقترَح — يطابق حرفياً اسم العمود المكافئ في `catalog_review_queue.tenant_id`
(الجدول الشقيق الأقرب بنيوياً)، بدل اسم جديد يصف نفس المعنى بصيغة مختلفة. نفس المنطق لـ`reviewed_by`/
`reviewed_at` (بدل أي بديل) — يطابق `resolved_by`/`resolved_at` على `catalog_review_queue` حرفياً. هذا
تفادياً لتكرار نمط تسمية متشعب لنفس المفهوم عبر جدولين شقيقين (نفس التحذير المتكرر في هذا المشروع ضد
انحراف التسمية — `docs/DATABASE.md §4`) — **لا خلاف على البنية أو الأعمدة المقترَحة نفسها، فقط على
تسمية عمودين ليتسقا مع الجدول الشقيق القائم فعلياً.**

**لا قيد `unique` يمنع تعدد الطلبات المعلَّقة لنفس `(master_item_id, tenant_id)`** — نفس غياب هذا القيد
تحديداً على `catalog_review_queue` القائم (الحماية من التكديس هناك تطبيقية بحتة عبر `findPendingReview
QueueItem`، لا `UNIQUE` جزئي في الـSchema) — نفس النمط يُعاد هنا بدل اختراع قيد جديد لا نظير له.

---

## 5. محرك حل التوريد (Supply Resolution Engine) — نظرة عامة

### 5.1 السؤال الذي يحله فعلياً (تصحيح حاسم على افتراض محتمل)

**بعد التحقق الحي، السؤال الذي يحتاج حلاً ليس "كيف يُقسَّم Checkout حسب التاجر"** — ذلك **مبني ومُنفَّذ
بالفعل** (`orders.service.ts.checkout()`، TASK-13، `[CODE]`+`[LIVE]`، راجع §13). السؤال الفعلي غير
المحلول اليوم هو: **عندما يريد عميل `Product` مرجعياً معيَّناً (`catalog_master_items` صف) بكمية معيَّنة،
وأكثر من `Merchant Offer` (صف `products`) يمكنه تلبيته — أيّها يُختار فعلياً؟** اليوم، هذا القرار يقع
بالكامل على العميل نفسه (يتصفح بطاقة منتج بعينها، تخص تاجراً بعينه، ويضيفها للسلة مباشرة) — **لا خطوة
حل توريد آلية قائمة إطلاقاً**، ولا مشكلة عملية ملحّة بها اليوم لأن (`[LIVE]`) تقاطع `tenant_id`/الكتالوج
المستورَد **صفر مطلق** (§0 بند 2) — لا يوجد اليوم أي `master_item_id` واحد له أكثر من `Merchant Offer`
نشط بمخزون حقيقي ليُحل بينها أصلاً. هذا المحرك **بنية تحضيرية لمرحلة التوريد الحقيقي القادمة (70 تاجراً
منتظرون، `ADR-031`/`IDEA-004`)**، لا حلاً لعطل قائم اليوم.

### 5.2 نطاق التشغيل — مستوى الطلب الكامل، لا السطر

يعمل المحرك **مرة واحدة لكل طلب عميل كامل** (سلة بعدة `master_item_id` مختلفة، كل واحد بكمية)، لا لكل
سطر منفرد بمعزل عن بقية السطور — لأن التجميع الجغرافي (§8) وعدالة توزيع التجار (§10) كلاهما قراران على
مستوى الطلب ككل (هل يمكن تجميع أكثر من `master_item_id` من نفس التاجر في نفس مكتب توصيل؟)، لا لكل سطر
بمعزل. **المُخرَج:** تعيين `tenant_id` فعلي (أي `products.id` تحديداً) لكل سطر — بعدها، **يتسلَّم Checkout
القائم (`orders.service.ts.checkout()`) هذه القائمة المحلولة تماماً كما يتسلَّم أي سلة عادية اليوم، بلا
أي تعديل عليه** (راجع §13 للعقد الدقيق).

---

## 6. القيود الصارمة (Hard Constraints) قبل أي تحسين

بالترتيب — أي عرض تاجر يفشل بنداً واحداً **يُستبعَد بالكامل** من الترشيح، بصرف النظر عن نتيجته في أي بند
لاحق أو في مرحلة التحسين (§7):

1. **توفر مخزون فعلي كافٍ** — `inventory.quantity_available >= الكمية المطلوبة` لصف `products` ذاك،
   **قراءة حية وقت الحل، لا كاش** (نفس صرامة `InventoryService.isAvailable()` القائمة).
2. **نشاط المنتج** — `products.is_active = true` (نفس فحص Checkout القائم اليوم، `orders.service.ts:93`).
3. **نشاط التاجر** — `merchants.is_active = true` (لا عرض من تاجر مُعطَّل، نفس مبدأ `setActiveStatus`
   القائم في `AdminService`).
4. **الحد الأدنى لهامش ريف** — الهامش المحسوب (§3.2) يجب أن يجتاز الحد الساري بالترتيب: استثناء المنتج
   إن وُجد، وإلا حد القسم إن وُجد، وإلا **الافتراضي العالمي (5% من `base_price`، قرار مؤسس 2026-09-19،
   §3.2 بند 3)** — **يوجد دائماً حد فعّال لكل عرض تاجر الآن، لا `Fail Open` بعد الآن.**
5. **عضوية جغرافية صالحة (V1)** — الحد الأدنى: يوجد `delivery_office` واحد على الأقل يمكنه تغطية عنوان
   العميل (§8) **و** يخدم هذا التاجر (تفصيل الربط في §8.2). عرض تاجر بلا أي مكتب توصيل يغطي منطقة
   العميل **يُستبعَد**، لا يُخفَض ترتيبه فقط.

**لا قيد "عدالة" هنا** — العدالة عامل موزون في التحسين (§10)، لا قيد صارم يُقصي عرضاً صالحاً بالكامل.

---

## 7. عوامل التحسين القابلة للضبط (بعد اجتياز كل القيود الصارمة)

> **مبدأ حاكم (`SALSABIL_CONSTITUTION.md §4` بند 7، التعديل الحاكم 2026-09-05):** هذه عوامل **Configuration**
> تتغيّر تجارياً/تشغيلياً — تُدار من جدول قابل للتعديل، **لا** Invariant مبرمج بصلابة في الكود. القيود
> الصارمة أعلاه (§6) على النقيض — تلك Invariants تعيش في الكود/قاعدة البيانات.

```sql
create table supply_resolution_weights (
  id uuid primary key default gen_random_uuid(),
  strategy_key text not null,             -- مثال: 'delivery_office_v1' (§9)
  factor_key text not null,               -- مثال: 'geographic_proximity' | 'merchant_reliability' | 'fulfillment_cost' | 'fairness'
  weight numeric not null check (weight >= 0),
  is_active boolean not null default true,
  updated_by uuid not null references users(id),
  updated_at timestamptz not null default now(),
  constraint supply_resolution_weights_unique unique (strategy_key, factor_key)
);
alter table supply_resolution_weights enable row level security;
-- بلا أي policy — النمط 2، وصول حصري عبر service_role (يعدّله platform_admin عبر لوحة إدارة مستقبلية، غير مبنية هنا)
```

**العوامل المرشَّحة لـV1 (تفصيل كل واحد في أقسامه الخاصة أدناه):** القرب الجغرافي عبر تجميع مكتب التوصيل
(§8)، عدالة توزيع الطلبات بين التجار المؤهَّلين (§10)، موثوقية التاجر (§11، Schema فقط)، تكلفة التنفيذ
(§12، Schema فقط). **لا وزن افتراضي مقترَح هنا** — لا قيمة مخترَعة بلا قرار مؤسس صريح، الجدول يبدأ
فارغاً، القيمة الفعلية تُضبَط عند التفعيل الحقيقي الأول. **⚠️ بخلاف الحد الأدنى للهامش (§3.2 بند 3)،
الذي حصل على قيمة افتراضية بقرار مؤسس صريح بتاريخ 2026-09-19 — أوزان التحسين هنا لم تُحسَم بأي قيمة
بعد**، لا افتراض ضمني بأن القرارين مرتبطان أو أن هذا القسم أيضاً حُسم.

---

## 8. التجميع الجغرافي — استراتيجية V1 فقط (عبر `delivery_offices`)

### 8.1 ⚠️ تحذير تسمية إلزامي — `catalog_districts` ≠ جغرافيا التوصيل

`[LIVE]`/`[CODE]` مؤكَّد بالكامل: `catalog_districts` (19 صفاً — "حي الرجل"، "حي المرأة"...) هي **هرمية
تصنيف منتجات للتصفح** (Product Taxonomy) أضيفت في TASK-17/18 — **لا علاقة جغرافية إطلاقاً**، لا عمود
موقع/عنوان/تغطية عليها بتاتاً. هذا نفس نمط تصادم التسمية المتكرر في المشروع (`world_scope` مقابل
`data-world`، `worlds` مقابل `WorldSlug`، `docs/DATABASE.md §4`) — **أي كود/تصميم مستقبلي يخلط بين
"حي المنتجات" (`catalog_districts`) و"منطقة التوصيل الجغرافية" خطأ معماري يجب رفضه**، بنفس صيغة التحذير
القائمة في `docs/DATABASE.md §4` حرفياً.

### 8.2 الجغرافيا الفعلية الوحيدة الموجودة اليوم — `customer_orders.delivery_address.city` (نص حر)

`[CODE]` — `PHASE_2_DOMAIN_DESIGN.md §2.3` (حي `[LIVE]`): `customer_orders.delivery_address jsonb`
بشكل `{line1, city, notes?}` — **`city` نص حر بلا تحقق بنيوي**، لا جدول مناطق/مدن منفصل. `delivery_offices`
(`PHASE_2_DOMAIN_DESIGN.md §7.1`، حي `[LIVE]`، 0 صف اليوم) **بلا أي عمود جغرافي إطلاقاً** — `id, owner_id,
name, phone, is_active` فقط. **لا ربط جغرافي بنيوي قائم بين الاثنين اليوم.**

### 8.3 التصميم المقترَح — جدول تغطية بسيط، نص مطابقة لا إحداثيات (V1 فقط)

```sql
-- تغطية مكتب توصيل لمدينة/منطقة — نص مطابق حرفياً لما يُدخِله العميل في delivery_address.city،
-- بلا حساب مسافة/إحداثيات (لا نظام حجوزات سعة، لا خرائط — نفس روح "لا خوارزمية الآن" في
-- PHASE_2_DOMAIN_DESIGN.md §5 لـdelivery_quotes.fee).
create table delivery_office_coverage_areas (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references delivery_offices(id),
  city_name text not null,               -- تطابق حرفي (بعد تطبيع بسيط) مع delivery_address.city
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint delivery_office_coverage_areas_unique unique (office_id, city_name)
);
alter table delivery_office_coverage_areas enable row level security;
create index delivery_office_coverage_areas_city_idx on delivery_office_coverage_areas (city_name);
-- بلا أي policy — النمط 2، وصول حصري عبر service_role (نفس نمط delivery_offices نفسها)

-- ربط تاجر ↔ مكتب توصيل يخدمه — كل تاجر قد يُخدَم من أكثر من مكتب، وكل مكتب يخدم أكثر من تاجر
create table merchant_delivery_offices (
  merchant_id uuid not null references merchants(id),
  office_id uuid not null references delivery_offices(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (merchant_id, office_id)
);
alter table merchant_delivery_offices enable row level security;
create index merchant_delivery_offices_office_idx on merchant_delivery_offices (office_id);
-- بلا أي policy — النمط 2، وصول حصري عبر service_role
```

**استراتيجية القيد الصارم §6 بند 5 بدقة الآن:** عرض تاجر (`tenant_id`) مؤهَّل جغرافياً لعميل بعنوان
`city` معيَّن **فقط إن** وُجد صف `merchant_delivery_offices` نشط لذلك التاجر يشير لمكتب توصيل، وذلك
المكتب لديه صف `delivery_office_coverage_areas` نشط يطابق `city` العميل حرفياً (بعد تطبيع نصي بسيط، لا
Fuzzy — نفس قرار `ADR-031` بلا استثناء). **لا حساب مسافة، لا إحداثيات، لا خرائط في V1** — مطابقة نصية
بحتة، بنفس بساطة `delivery_quotes.fee` اليدوي (`PHASE_2_DOMAIN_DESIGN.md §5`).

**لا اقتران بنيوي للمحرك بهذه الاستراتيجية تحديداً** — راجع §9 (Strategy Pattern): هذا الجدولان يخدمان
`DeliveryOfficeStrategy` (V1) فقط، لا المحرك نفسه. استراتيجية جغرافية مستقبلية أدق (إحداثيات/مسافة فعلية)
تستبدل هذين الجدولين بجدولين آخرين خلف نفس الواجهة، بلا تغيير على محرك الحل نفسه.

---

## 9. نمط Strategy — واجهة `SupplyResolutionStrategy`

**العقد (Contract) — توضيح تصميمي، لا تنفيذ فعلي (لا ملف `.ts` يُكتَب في هذه المهمة):**

```
// توضيحي فقط — عقد التصميم المطلوب تنفيذه لاحقاً بتكليف منفصل، بنفس روح CREATE TABLE في هذه
// الوثيقة (شكل بنيوي، لا كود قابل للتشغيل).

interface SupplyResolutionStrategy {
  key: string;   // مثال: 'delivery_office_v1'

  // يُستدعى مرة لكل طلب كامل بعد اجتياز كل عروض التجار المرشَّحة للقيود الصارمة (§6) —
  // يُعيد ترتيباً/اختياراً واحداً نهائياً لكل سطر، مع الدرجة والمُسوِّغ (لِـresolution_records، §16).
  resolve(input: {
    customerOrderContext: { deliveryCity: string /* من delivery_address.city */ };
    lines: Array<{
      masterItemId: string;
      quantity: number;
      eligibleOffers: Array<{ productId: string; tenantId: string }>;  // بعد فلترة §6 بالكامل
    }>;
    weights: SupplyResolutionWeight[];  // من supply_resolution_weights، §7
  }): Array<{
    masterItemId: string;
    chosen: { productId: string; tenantId: string } | null;  // null = لا عرض مؤهَّل إطلاقاً
    score: number;
    rationale: Record<string, number>;  // تفصيل المساهمة لكل عامل — يُخزَّن في resolution_records
  }>;
}
```

**التنفيذات:**

| المفتاح (`strategy_key`) | الحالة | الوصف |
|---|---|---|
| `delivery_office_v1` | **مُنفَّذة (مصمَّمة بالكامل هنا)** | التجميع الجغرافي عبر `delivery_offices`/`delivery_office_coverage_areas` (§8) + عدالة (§10) + موثوقية/تكلفة (§11/§12، Schema فقط، وزنهما `0` حتى تُبنى منطق حسابهما فعلياً) |
| `route_optimized_v2` | **اسم محجوز فقط — لا تنفيذ** | تحسين مسار فعلي (خرائط/مسافة حقيقية) — خارج نطاق V1 صراحة |
| `capacity_aware_v3` | **اسم محجوز فقط — لا تنفيذ** | يراعي نظام الحجز بالسعة (`BR-012`/`CONSTITUTION §15`، `PROPOSED` أصلاً) |
| `ai_assisted_v4` | **اسم محجوز فقط — لا تنفيذ** | حكيم (`Hakim`) استشارياً (`SALSABIL_CONSTITUTION.md §4` بند 4) — لا تنفيذ مباشر، حق نقض بشري كامل |
| `open_marketplace_v5` | **اسم محجوز فقط — لا تنفيذ** | يفترض حسم `BR-017` (خيار السوق المفتوح، هوية بائع ظاهرة) أولاً — غير محسوم اليوم |

**كيف يُختار `strategy_key` فعلياً:** عمود إضافي مقترَح `resolution_records.strategy_key` (§16) يُسجِّل
أيّها استُخدم فعلياً لكل حل — **لا منطق اختيار استراتيجية ديناميكي مبني هنا** (V1 الوحيدة المنفَّذة، لا
حاجة فعلية لمحرك اختيار بين عدة استراتيجيات حتى تُبنى ثانية فعلياً).

---

## 10. العدالة كعامل موزون — لا نقض مطلق

**الترتيب الحاكم الصريح (غير قابل للانعكاس):**

```
Hard Constraints (§6)  →  Feasibility (هل يوجد عرض واحد ناجٍ من القيود أصلاً؟)  →
Optimization (§7، الأوزان المضبوطة)  →  Fairness (عامل موزون ضمن Optimization، لا خطوة منفصلة تسبقها أو تنقضها)
```

العدالة **لا تُقصي** عرضاً تاجراً مؤهَّلاً فاز بالتحسين لصالح توزيع "الدور" — هي **عامل واحد ضمن مجموع
الأوزان** (`SALSABIL_CONSTITUTION.md §29.3`، نفس فلسفة محرك المطابقة العادلة القائم مفاهيمياً هناك،
لكن **غير مُطبَّق بعد بأي كود، `[DOC]` فقط** — `PROPOSED` في `docs/DOMAIN_MAP.md`). **القياس المقترَح
لعامل العدالة هنا تحديداً (V1):** عدد `merchant_suborders` الناجحة لكل تاجر مؤهَّل خلال نافذة زمنية
متحركة (مثال: آخر 7 أيام) — تاجر أُسندت له طلبات أقل مؤخراً يحصل على وزن عدالة أعلى نسبياً، **بلا حساب
فعلي مبني هنا** (نفس مبدأ §11/§12 — Schema/مبدأ فقط، لا منطق تجميع حي). **لا Round-Robin صارم** (ذلك
كان سيكون "نقض مطلق" يخالف التعليمات الصريحة لهذه المهمة) — فقط رفع درجة الترشيح تناسبياً.

---

## 11. موثوقية التاجر (Merchant Reliability) — Schema فقط

```sql
-- لقطة مجمَّعة، لا سجل حي لكل حدث — تُحدَّث دورياً (Cron/Batch مستقبلي، غير مبني هنا) لا عند كل طلب.
create table merchant_reliability_snapshots (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id),
  window_start timestamptz not null,
  window_end timestamptz not null,
  fulfilled_suborders_count int not null default 0,
  cancelled_suborders_count int not null default 0,
  avg_time_to_ready_minutes numeric,    -- nullable — لا حساب مبني بعد
  reliability_score numeric,            -- nullable — لا صيغة حساب معتمَدة هنا، Schema فقط
  computed_at timestamptz not null default now(),
  constraint merchant_reliability_snapshots_window_unique unique (merchant_id, window_start, window_end)
);
alter table merchant_reliability_snapshots enable row level security;
create index merchant_reliability_snapshots_merchant_idx on merchant_reliability_snapshots (merchant_id);
-- بلا أي policy — النمط 2، وصول حصري عبر service_role
```

**لا حساب فعلي لـ`reliability_score` مبني هنا** — عمود `nullable` عمداً، بانتظار تصميم منفصل لصيغة
الحساب (خارج نطاق هذه المهمة صراحة). حتى بناء تلك الصيغة، `merchant_reliability_v1` factor في
`supply_resolution_weights` (§7) يبقى بوزن `0` فعلياً أو غير مُستهلَك — لا قيمة وهمية تُدخَل بدلاً منه.

---

## 12. تكلفة التنفيذ (Fulfillment Cost) — Schema فقط

```sql
-- تكلفة تقديرية لكل (تاجر، مكتب توصيل) — يدوية الإدخال V1 (نفس فلسفة delivery_quotes.fee اليدوية)،
-- لا خوارزمية حساب مسافة/وقت حقيقية.
create table fulfillment_cost_estimates (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id),
  office_id uuid not null references delivery_offices(id),
  estimated_cost numeric not null check (estimated_cost >= 0),
  computed_by text not null check (computed_by in ('manual', 'simple_rule')),  -- نفس نمط delivery_quotes.computed_by حرفياً
  updated_by uuid not null references users(id),
  updated_at timestamptz not null default now(),
  constraint fulfillment_cost_estimates_unique unique (merchant_id, office_id)
);
alter table fulfillment_cost_estimates enable row level security;
-- بلا أي policy — النمط 2، وصول حصري عبر service_role
```

نفس تحذير §5 من `PHASE_2_DOMAIN_DESIGN.md` حرفياً: **لا خوارزمية حساب هنا** — قيمة نهائية يدخلها
`platform_admin` يدوياً (`computed_by = 'manual'`) أو بقاعدة V1 بسيطة غير مُصمَّمة (`'simple_rule'`)،
القيمة `'algorithm'` محجوزة اسمياً فقط، غير مضافة لقائمة `CHECK` الآن.

---

## 13. نقطة التسليم الدقيقة لـ Checkout — العقد/Interface، بدون أي تعديل على Checkout/Orders/Cart

### 13.1 التصحيح الحاسم (يُبنى مباشرة على §5.1 و§0 بند 4)

`[CODE]` مؤكَّد بدقة سطر: `orders.service.ts.performCheckout()` **يتسلَّم بالفعل** `cart.items` حيث كل
`line.product` صف `products` **محدَّد ومقفول مسبقاً** (اختاره العميل عند الإضافة للسلة) — التجميع حسب
`tenant_id` (`groupsByTenant`, `orders.service.ts:102-111`) **يعمل على `line.product.tenantId` كما هو
مُخزَّن فعلياً في `cart_items` → `products`**، لا على أي "طلب مجرَّد" يحتاج حلاً وقت Checkout. **محرك حل
التوريد إذن لا يتدخل داخل `performCheckout()` إطلاقاً — ذلك يبقى بلا لمسة واحدة**، تماماً كما يشترط
موجّه هذه المهمة.

### 13.2 أين يتدخل المحرك فعلياً — قبل أن يصير أي `product_id` جزءاً من السلة

نقطة التسليم الوحيدة المتوافقة مع هذا الواقع الحي: **بين لحظة "العميل عبَّر عن رغبته بمنتج مرجعي وكمية"
ولحظة `CartService.addItem()`** — أي **قبل** أن يوجد سطر سلة بـ`product_id` فعلي على الإطلاق. هذا يخدم
سيناريوهات مستقبلية محدَّدة (لا مبنية هنا، فقط العقد الذي يخدمها): سلال جاهزة (`hy-alslal`، §القسم موجود
فعلاً في التصنيف الجديد `[LIVE]`) حيث العميل يطلب "سلة أسبوعية" بمكوّنات مرجعية لا تاجر محدَّد مسبقاً،
أو أي واجهة مستقبلية "اطلب المنتج X" بلا اختيار تاجر يدوي من العميل.

```
// العقد الدقيق — توضيحي، لا تنفيذ فعلي:
interface SupplyResolutionEngine {
  resolve(input: {
    userId: string;
    deliveryCity: string;
    requestedLines: Array<{ masterItemId: string; quantity: number }>;
  }): Promise<Array<{
    masterItemId: string;
    resolvedProductId: string | null;  // null = لا عرض مؤهَّل، الاستدعاء المسؤول يقرر السلوك (رفض/قائمة انتظار)
  }>>;
}

// نقطة الاستهلاك المتوقَّعة مستقبلياً (غير مبنية هنا، توضيح موقع فقط):
// caller يستدعي SupplyResolutionEngine.resolve(...) أولاً، ثم لكل سطر محلول فعلياً
// (resolvedProductId !== null) يستدعي cartService.addItem(cartId, resolvedProductId, quantity, selection)
// — نفس addItem() القائمة اليوم بلا أي تعديل على توقيعها.
```

**النتيجة العملية:** `cart.repository.ts`/`cart.service.ts`/`orders.service.ts`/`orders.repository.ts`
**صفر سطر يتغيّر** لتفعيل هذا المحرك مستقبلاً — العقد بالكامل يعيش فوقها (Caller جديد لـ`addItem()`
القائمة)، لا داخلها.

---

## 14. قواعد سلامة البيانات (FK/Unique/Check Constraints) — ملخَّص مُجمَّع

> كل قيد ورد فعلياً ضمن `CREATE TABLE`/`ALTER TABLE` في الأقسام أعلاه — هذا القسم فهرس مرجعي فقط، لا
> تعريفات جديدة.

| الجدول | قيود FK | قيود Unique | قيود Check |
|---|---|---|---|
| `catalog_category_min_margins` | `catalog_category_id → catalog_categories` | `PK(catalog_category_id)` | `min_margin >= 0` |
| `delivery_office_coverage_areas` | `office_id → delivery_offices` | `(office_id, city_name)` | — |
| `merchant_delivery_offices` | `merchant_id → merchants`, `office_id → delivery_offices` | `PK(merchant_id, office_id)` | — |
| `supply_resolution_weights` | `updated_by → users` | `(strategy_key, factor_key)` | `weight >= 0` |
| `merchant_reliability_snapshots` | `merchant_id → merchants` | `(merchant_id, window_start, window_end)` | — |
| `fulfillment_cost_estimates` | `merchant_id → merchants`, `office_id → delivery_offices`, `updated_by → users` | `(merchant_id, office_id)` | `estimated_cost >= 0`, `computed_by in (...)` |
| `resolution_records` | راجع §16 | — | راجع §16 |
| `catalog_master_items` (أعمدة مضافة) | `catalog_category_id → catalog_categories` | `barcode` (جزئي، `where barcode is not null`) | `min_margin_override >= 0` |
| `catalog_content_review_queue` (§4.4) | `master_item_id → catalog_master_items`, `tenant_id → merchants`, `reviewed_by → users` | — (لا قيد فريد، بنفس نمط `catalog_review_queue`) | `status in ('pending','approved','rejected')`, `catalog_content_review_queue_has_content_check` (لا طلب فارغ بلا محتوى مقترَح) |
| `supply_resolution_global_settings` (§3.3) | `updated_by → users` | `PK(key)` | — |

---

## 15. منع التزامن/البيع الزائد — إعادة استخدام حرفية لنمط `ADR-022`/`ADR-032`

### 15.1 لماذا لا قفل جديد

`[CODE]` — `InventoryRepository.decrementIfAvailable()`/`restore()` (`ADR-022`، موسَّعة في `ADR-032`)
تطبِّق **Optimistic Concurrency** فعلياً ومُختبَرة حياً: قراءة القيمة الحالية → `UPDATE` مشروط بمطابقة
تلك القيمة بالضبط (`WHERE quantity_available = <القيمة المقروءة>`) → عند 0 صفوف متأثرة (تعارض حقيقي)،
إعادة المحاولة بقراءة جديدة (حتى 3 مرات لـ`decrementIfAvailable`، 8 لـ`restore`) → فشل نهائي = رفض
البيع/رمي خطأ صريح، **لا** كتابة فوق قيمة قديمة أبداً. **هذا النمط بالذات (لا قفل جديد من فئة `DD-002`
— أي لا `Map` في-الذاكرة) هو ما يُعاد استخدامه حرفياً هنا** لأي كتابة تنافسية جديدة يُدخلها هذا التصميم.

### 15.2 أين يُطبَّق هذا التصميم النمط تحديداً

محرك حل التوريد نفسه **لا يكتب على `inventory` إطلاقاً** — فحص القيد الصارم §6 بند 1 قراءة فقط
(`quantity_available >= المطلوب`، بلا حجز/خصم في لحظة الحل). **الخصم الفعلي يبقى حصرياً حيث هو اليوم**:
داخل `performCheckout()` عبر `inventoryService.reserve()`/`decrementIfAvailable()` القائمة بلا تعديل —
هذا يعني: **لا نافذة TOCTOU جديدة يُدخلها هذا التصميم** — بين لحظة حل التوريد (اختيار `product_id`) ولحظة
Checkout الفعلي (خصم المخزون)، قد يبيع تاجر آخر نفس الكمية لعميل مختلف عبر مسار مختلف تماماً؛ Checkout
القائم **يتعامل مع هذا فعلياً بالفعل** (رفض بيع صريح إن فشل الخصم الذري وقت التنفيذ الحقيقي، `orders.
service.ts:127-130`) — **بلا حاجة لأي قفل/حجز مؤقت جديد في مرحلة الحل نفسها**. هذا **قرار تصميم صريح**:
حل التوريد "ترشيح متفائل" (Optimistic Suggestion)، Checkout يبقى "المصدر الوحيد للحقيقة الذرّية"
(Single Source of Truth) — نفس الفلسفة القائمة أصلاً بين `isAvailable()` (فحص وصفي) و
`decrementIfAvailable()` (الفعل الذرّي الحقيقي الوحيد).

### 15.3 `DD-002` يبقى قيداً منفصلاً غير مُحسَم — لا يُخفى هنا

`[LIVE]` (`docs/audits/2026-09-19-launch-readiness-report.md §2`): `DD-002` (القفل الموزَّع لـ
`inFlightCheckouts`/`rate-limit.ts`) **لا يزال `Status: OPEN`، `Blocking: YES`** على أي نشر متعدد نسخ
خادم. هذا التصميم **لا يضيف** أي قفل في-الذاكرة جديد من نفس الفئة (§15.1 أعلاه)، لكنه **أيضاً لا يحل**
`DD-002` القائم — يبقى قيداً منفصلاً تماماً، يجب حله (Postgres Lock موزَّع أو قيد "خادم واحد" تشغيلي)
قبل أي نشر إنتاج متعدد النسخ، **بصرف النظر عن اعتماد هذا التصميم من عدمه**.

---

## 16. القابلية للتدقيق — `resolution_records` (Append-Only)

```sql
create table resolution_records (
  id uuid primary key default gen_random_uuid(),
  customer_order_id uuid references customer_orders(id),  -- nullable: قد يُحل قبل إنشاء customer_order فعلياً (§13.2)
  user_id uuid not null references users(id),
  master_item_id uuid not null references catalog_master_items(id),
  requested_quantity int not null check (requested_quantity > 0),
  resolved_product_id uuid references products(id),        -- null = لم يُحل (لا عرض مؤهَّل)
  resolved_tenant_id uuid references merchants(id),
  strategy_key text not null,                                -- 'delivery_office_v1' إلخ (§9)
  hard_constraints_passed boolean not null,
  rejection_reason text,                                     -- إلزامي عند hard_constraints_passed = false
  score numeric,
  rationale jsonb not null default '{}'::jsonb,               -- تفصيل مساهمة كل عامل تحسين (§7)
  created_at timestamptz not null default now(),
  constraint resolution_records_rejection_reason_check
    check (hard_constraints_passed = true or rejection_reason is not null)
);
alter table resolution_records enable row level security;
create index resolution_records_customer_order_idx on resolution_records (customer_order_id);
create index resolution_records_master_item_idx on resolution_records (master_item_id);
create index resolution_records_created_at_idx on resolution_records (created_at desc);
-- بلا أي policy — النمط 2، وصول حصري عبر service_role. لا UPDATE/DELETE في منطق التطبيق مطلقاً
-- (Append-Only بالانضباط التطبيقي، نفس نمط order_status_history/audit_log — لا trigger DB يفرضه،
-- نفس القرار القائم في ADR-010 لعدم استخدام triggers في هذا المشروع).
```

**لماذا `hard_constraints_passed`/`rejection_reason` وليس فقط سجل نجاح:** تدقيق "لماذا لم يُحل هذا
الطلب لأي تاجر؟" (مثال: كل التجار المرشَّحين خرقوا الحد الأدنى للهامش، أو لا تغطية جغرافية) **بنفس أهمية
"من فاز ولماذا"** — نفس فلسفة `merchant_suborder_status_history.note` الإلزامي عند الإلغاء
(`PHASE_2_DOMAIN_DESIGN.md §2.6`): فشل صريح موثَّق، لا صمت.

---

## 17. القابلية للمراقبة — ما الذي يُقاس (لا كيف)

> نفس تحذير القسم أعلاه — هذا **ما** يُقاس، لا تصميم لوحة مراقبة أو أداة قياس فعلية (خارج نطاق توثيق
> هذه المهمة).

- **معدل الحل الناجح** — نسبة `resolved_product_id IS NOT NULL` إلى إجمالي `resolution_records` (على
  نافذة زمنية) — مؤشر مباشر على "هل التوريد الفعلي يكفي الطلب؟".
- **توزيع سبب الفشل** — تجميع `rejection_reason` (أو حقل مُصنَّف بدلاً من نص حر مستقبلاً) — يكشف هل
  الفشل الغالب مخزون، هامش، تغطية جغرافية، أم نشاط تاجر.
- **توزيع الفوز بين التجار المؤهَّلين لنفس `master_item_id`** — المدخل المباشر لعامل العدالة (§10)، يجب
  أن يكون قابلاً للاستعلام مباشرة من `resolution_records` بلا جدول تجميع منفصل.
- **زمن تنفيذ `resolve()` نفسه** — عامل أداء تشغيلي (لا مقياس عمل)، مهم لأن المحرك يعمل على مستوى الطلب
  الكامل (§5.2) لا السطر، فقد يتضمن استعلامات متعددة الجداول لكل طلب.

---

## 18. الجاهزية للتعميم المستقبلي — عام لا خاص بريف

### 18.1 التصميم اليوم مقفول بنيوياً على `merchants`/`products`/`catalog_master_items` — نفس قيد بيان الموثَّق أصلاً

`[DOC]` — `docs/DOMAIN_MAP.md → OPEN_QUESTION-002` وثَّق فجوة مطابقة تماماً لمحرك بيان: بناء اليوم 23
(`posts`/`world_scope`) مقفول بنيوياً على `categories` الخاصة بريف حصراً، لا مفهوم عام عابر لعوالم-تطبيقات
أخرى. **نفس القيد ينطبق هنا حرفياً**: `catalog_master_items`/`resolution_records`/كل جداول هذا التصميم
تفترض ضمنياً "عالم ريف" (تجارة يومية، تجار محليون، توصيل عبر `delivery_offices`) — **لا** عمود `app_scope`
أو ما يعادله يربط أياً منها بعالم-تطبيق محدَّد. عند بناء عالم-تطبيق ثانٍ يحتاج توريداً متعدد الأطراف
(مثال افتراضي: أسراب)، هذا التصميم **لا يعمِّم تلقائياً** — نفس الفجوة المفتوحة أصلاً في
`OPEN_QUESTION-002`، غير محسومة هنا، لا افتراض ضمني بأنها محلولة.

### 18.2 ما يجعله قابلاً للتعميم لاحقاً بلا إعادة تصميم كامل (بلا التزام تنفيذ الآن)

نمط `Strategy` (§9) نفسه عام بالتصميم (لا يفترض جغرافيا ريف تحديداً — استراتيجية جديدة كلياً يمكن أن
تحل بلا `delivery_offices` إطلاقاً، فقط تطبيق الواجهة). `resolution_records` عام كفاية (لا عمود يفترض
"ريف" حرفياً). **الفجوة الحقيقية للتعميم** تبقى في `catalog_master_items`/`products`/`merchants` أنفسهم
(خارج نطاق هذه الوثيقة — تلك جداول Catalog/Merchant القائمة أصلاً، لا جزءاً من هذا التصميم الإضافي).

---

## 19. الأمان/RBAC + سياسات RLS المقترحة لكل جدول جديد

> **قرار مُطبَّق من البداية، لا خطوة لاحقة** — استجابةً صريحة لفجوة RLS المكتشَفة في TASK-18
> (`docs/audits/2026-09-19-task-18-catalog-storefront-report.md §4`: ثلاثة جداول جديدة `catalog_
> districts`/`catalog_categories`/`catalog_subcategories` نُشرت **بلا** أي سياسة RLS قراءة، اكتُشف
> لاحقاً كحاجب فعلي). **كل جدول في هذه الوثيقة يحمل قرار RLS محدَّداً بجانب تعريفه مباشرة أعلاه — لا
> جدول "سيُقرَّر لاحقاً".**

| الجدول | النمط | التبرير |
|---|---|---|
| `catalog_category_min_margins` | النمط 2 (قفل كامل) | قرار تسعير/هامش حساس — نفس تصنيف `merchants.commission_rate` |
| `delivery_office_coverage_areas` | النمط 2 | بيانات تشغيلية تخص شركة توصيل تعاقدية، نفس نمط `delivery_offices` القائم |
| `merchant_delivery_offices` | النمط 2 | علاقة تاجر↔مكتب توصيل، نفس تصنيف `merchants` |
| `supply_resolution_weights` | النمط 2 | إعداد تشغيلي داخلي، لا قراءة عامة له أي فائدة |
| `merchant_reliability_snapshots` | النمط 2 | بيانات أداء تاجر حساسة — كشفها العام قد يُستغَل تنافسياً بين التجار |
| `fulfillment_cost_estimates` | النمط 2 | تكلفة تشغيلية داخلية |
| `resolution_records` | النمط 2 | سجل تدقيق يحمل قرارات تسعير/هامش لكل طلب — `FINANCIAL`، نفس تصنيف `order_status_history` |
| `catalog_content_review_queue` (§4.4) | النمط 2 | يحمل مقترحات محتوى من تجار قبل اعتمادها — لا قراءة عامة له أي فائدة، نفس تصنيف `catalog_review_queue` |
| `supply_resolution_global_settings` (§3.3) | النمط 2 | إعداد تسعير عالمي حساس (الحد الأدنى الافتراضي للهامش) — نفس تصنيف `catalog_category_min_margins` |
| أعمدة مضافة على `catalog_master_items` | يرث RLS الجدول القائم (النمط 2، `[CODE]`) | لا تغيير نمط — إضافة أعمدة فقط |

**بلا استثناء واحد للنمط 1 (قراءة عامة)** في هذه الوثيقة — كل جدول جديد هنا بيانات تشغيلية/مالية/تسعير
داخلية، لا محتوى يتصفحه عميل مباشرة (بخلاف `catalog_districts`/`categories`/`products` نفسها، خارج نطاق
هذا التصميم). **RBAC الفعلي (من يستدعي أي دالة تكتب/تقرأ هذه الجداول) يبقى طبقة تطبيق بحتة** (نفس نمط
`merchant_staff`/`orders` القائم بالكامل — `[CODE]`، `merchantStaff.service.ts`: "كل التخويل الفعلي هنا،
لا RLS") — `platform_admin` فقط يكتب على `catalog_category_min_margins`/`supply_resolution_weights`/
`fulfillment_cost_estimates`/`merchant_delivery_offices`/`supply_resolution_global_settings`؛ نفس
`platform_admin` وحده يحسم (`approve`/`reject`) صفوف `catalog_content_review_queue`، بينما إنشاء الصف
نفسه (اقتراح محتوى) مفتوح لأي تاجر عبر مسار استيراده الخاص (§4.2)؛ المحرك نفسه (خدمة تطبيق تعمل
بـ`service_role`) هو الكاتب الوحيد على `resolution_records`.

---

## 20. خطة ترحيل من `products.tenant_id` — إضافية وقابلة للتراجع فقط

> **بلا أي سكربت SQL فعلي هنا** — خطوات مفاهيمية فقط، بنفس صرامة §8 من `PHASE_2_DOMAIN_DESIGN.md`
> ("مسار الهجرة" هناك أيضاً وصف خطوات، لا سكربتاً واحداً قابلاً للتشغيل مباشرة بمعزل عن اعتماد منفصل).

**الوضع الحالي `[LIVE]` (§0 بند 2):** 7,506 من 7,556 منتجاً (`tenant_id IS NULL`) — الكتالوج المستورَد
بالكامل بلا مالك تجاري. **قرار مؤسس صريح (2026-09-19، §24.4.1 بند 3): تُعتمَد الخطوات أدناه كمساراً
معتمَداً، لا مجرد مقترَح.** هذا التصميم **لا يحل** غياب المالك تلقائياً بأي تعديل جماعي — يفترضه نقطة
انطلاق تُغلَق تدريجياً فقط عبر انضمام تجار حقيقيين (بمجرد أن يُسند `tenant_id`/يُربَط `master_item_id`
فعلياً لصفوف حقيقية، محرك حل التوريد يصبح ذا معنى عملي لتلك الصفوف تحديداً).

1. **لا `UPDATE` جماعي على `products.tenant_id` مباشرة — معتمَد نهائياً، لا سؤالاً مفتوحاً بعد الآن.**
   السؤال الأصلي (`docs/audits/2026-09-19-task-18-catalog-storefront-report.md §5`: "هل الكتالوج مباع
   مباشرة من ريف كمنصة، أم يُوزَّع على تجار حقيقيين لاحقاً؟") **مُحسوم بقرار المؤسس لصالح البند 2 أدناه**
   — لا إسناد جماعي، لا بيانات وهمية، لا حل مؤقت.
2. **المسار المعتمَد فعلياً (كان "المقترَح"، أصبح القرار):** لكل تاجر جديد ينضم، يستورد Excel
   يطابق (بالباركود أولاً، §4.3) عناصر الكتالوج الأساسي الموجودة فعلاً — `upsertTenantProductFromMaster`
   القائمة (`[CODE]`) تُنشئ صف `products` **جديداً** بـ`tenant_id` ذلك التاجر و`master_item_id` مطابق،
   **لا تُعدِّل** الصف القديم بلا مالك. الصفوف الـ7,506 القديمة (`master_item_id IS NULL` أيضاً اليوم —
   لم تُستورَد عبر سير `ADR-031` أصلاً، استُورِدت عبر TASK-17 المنفصل) **تبقى كما هي، أرشيفاً غير قابل
   للشراء**، بنفس فلسفة "الجداول القديمة تتوقف عن الاستقبال، لا تُهاجَر" في `PHASE_2_DOMAIN_DESIGN.md §8`
   بند 4 (`قرار معتمَد من المؤسس` هناك بصريح العبارة لحالة مشابهة).
3. **إضافية بالكامل، قابلة للتراجع دوماً** — أي صف `products` جديد بـ`tenant_id`/`master_item_id`
   يُحذَف بأمان (لا بيانات مالية مرتبطة به بعد قبل أول طلب حقيقي) بلا أثر على الكتالوج القديم.

---

## 21. ضمانات التوافق العكسي (Checkout/Orders/الاختبارات القائمة)

- **صفر تعديل على أي ملف في `src/core/modules/orders/`** — مؤكَّد تصميمياً عبر العقد الدقيق في §13:
  المحرك يعمل **قبل** `cartService.addItem()`، لا داخل أي دالة Orders قائمة.
  `orders.integration.test.ts`/`orders.service.test.ts`/`reef-city-journey.integration.test.ts`
  (`[LIVE]`، 63/63 خضراء وقت هذا التحقق) **لا تحتاج أي تعديل** لاعتماد هذا التصميم لاحقاً.
- **صفر تعديل على `cart.service.ts`/`cart.repository.ts`** — `addItem()` تُستدعى كما هي، بنفس التوقيع.
- **صفر `ALTER`/`DROP` على أي جدول مالي حي** (`customer_orders`/`merchant_suborders`/`orders`/
  `order_items`) — كل الإضافات هنا إما جداول جديدة كلياً أو `ADD COLUMN nullable` على `catalog_
  master_items` (جدول Catalog، لا جدول مالي بمعنى `FINANCIAL` القائم — راجع `docs/DATABASE.md §3.1`
  الجدول الموسَّع، `catalog_master_items` غير مصنَّف هناك أصلاً بعد لأنه أُضيف لاحقاً في `ADR-031`).
- **صفر تعديل على `InventoryService`/`InventoryRepository`** — يُقرَأ منها فقط (§15.2)، لا يُكتَب إليها
  من هذا التصميم إطلاقاً.

---

## 22. نطاق V1 الصريح

**داخل النطاق:**
- استراتيجية `delivery_office_v1` وحدها (مطابقة نصية بمدينة، §8).
- قيود صارمة الخمسة الكاملة (§6).
- تسجيل تدقيق كامل (`resolution_records`، §16).
- Schema-only لموثوقية التاجر وتكلفة التنفيذ (§11/§12) — بلا حساب فعلي.
- إنفاذ الحد الأدنى لهامش ريف على ثلاثة مستويات (استثناء منتج → قسم → افتراضي عالمي 5%، قرار مؤسس
  2026-09-19) — **لا `Fail Open` بعد الآن**، حد فعّال دائماً.
- تمييز Full/Lightweight Review + مطابقة بالباركود أولاً في مسار الاستيراد.

**خارج النطاق صراحة (لا AI/ML/تحسين مسار الآن):**
- أي استراتيجية غير `delivery_office_v1` (§9 — أسماء محجوزة فقط).
- حكيم (`Hakim`) كمُنفِّذ فعلي لأي قرار حل توريد — استشاري فقط لو استُهلِك مستقبلاً، لا اليوم.
- خرائط/مسافة/إحداثيات حقيقية — مطابقة نصية بمدينة فقط.
- حساب فعلي لـ`reliability_score`/`fulfillment_cost` — Schema فقط.
- حل تلقائي لمشكلة الـ7,506 منتج بلا `tenant_id` — قرار بيانات/عمل منفصل يخص المؤسس.
- تعديل واحد على Checkout/Orders/Cart الفعلي — محظور صراحة في هذه المهمة أصلاً.
- نظام حجز بالسعة (`BR-012`)، نموذج السوق المفتوح الكامل (`BR-017` خيار ب) — كلاهما `PROPOSED`، غير
  محسومين، `capacity_aware_v3`/`open_marketplace_v5` أسماء محجوزة فقط.

---

## 23. مصفوفة اختبار إلزامية (12+ حالة)

> اختبارات مستقبلية (لا مبنية هنا) — تصف السلوك المتوقَّع فقط، بنفس شكل جداول الاختبار في
> `PHASE_2_DOMAIN_DESIGN.md` (موجودة ضمنياً هناك كسيناريوهات نثرية، مُجمَّعة هنا صراحة كجدول).

| # | الحالة | السلوك المتوقَّع |
|---|---|---|
| 1 | تاجر واحد فقط مؤهَّل لـ`master_item_id` معيَّن | يُحل مباشرة له، `resolution_records.hard_constraints_passed = true` |
| 2 | عدة تجار مؤهَّلون، أوزان متساوية | يُختار وفق عامل العدالة (§10) — لا يفوز نفس التاجر دوماً عبر عدة طلبات متتالية متطابقة الشروط |
| 3 | نفس المنتج (`master_item_id` واحد) من أكثر من تاجر، بعضهم بمخزون أقل من المطلوب | التجار بمخزون غير كافٍ يُستبعَدون (§6 بند 1) قبل أي حساب تحسين |
| 4 | نقص مخزون كامل لدى كل التجار المرشَّحين | `resolved_product_id = null`، `rejection_reason` يوضّح السبب (مخزون) |
| 5 | عرض تاجر يخرق الحد الأدنى للهامش المضبوط لقسمه | يُستبعَد (§6 بند 4)، حتى لو كان الأقرب جغرافياً أو الوحيد المتاح |
| 6 | طلب عبر عدة أقسام (`catalog_categories`) مختلفة في نفس الطلب | كل `master_item_id` يُحل بمعزل صحيح عن هوامشه الخاصة، لا هامش موحَّد للطلب كله |
| 7 | طلب يغطي أكثر من `delivery_office` (تجار مختلفون لكل مكتب) | كل سطر يُحل ضمن تغطية مكتبه الصحيح — لا افتراض مكتب واحد للطلب كله |
| 8 | تاجر مؤهَّل بكل الشروط لكن `merchants.is_active = false` | يُستبعَد فوراً (§6 بند 3)، بصرف النظر عن أي عامل تحسين |
| 9 | طلبان متزامنان فعلياً على نفس المنتج من نفس التاجر (حالة سباق) | كلاهما قد يُحلان لنفس `product_id` (المحرك لا يحجز، §15.2) — الحسم الذرّي الفعلي يبقى حصرياً في `decrementIfAvailable()` وقت Checkout الحقيقي، أحدهما يُرفَض هناك صراحة لا في مرحلة الحل |
| 10 | صف استيراد تاجر جديد بباركود يطابق `catalog_master_items.barcode` قائماً، لكن الاسم مختلف شكلياً | يُطابَق عبر الباركود فوراً (§4.3 بند 1)، **لا** يذهب لقائمة المراجعة رغم اختلاف الاسم |
| 11 | صف استيراد بلا باركود، اسم يطابق حرفياً بعد التطبيع | يُطابَق كما اليوم بلا تغيير (§4.3 بند 2) |
| 12 | إثراء بيانات (صورة/وصف أفضل) على عنصر كتالوج أساسي قائم، عبر Lightweight Review | يمر بمسار أخف من Full Review (§4.2) — لا نموذج إدخال كامل من الصفر |
| 13 | لا حد أدنى هامش مضبوط لا على القسم ولا كاستثناء منتج | يُطبَّق الافتراضي العالمي (5% من `base_price`، §3.2 بند 3) بدلاً من عدم الإنفاذ — عرض يخرق حتى هذا الحد الافتراضي يُستبعَد (§6 بند 4)، لا `Pass` تلقائي بعد الآن |
| 14 | تحديث `resolveReviewQueueAsMerge` لعرض تاجر (Merchant Offer) قائم فعلاً ضمن طلب سبق حله | `resolution_records` السابق يبقى كما هو (Append-Only، §16) — لا إعادة كتابة لسجل تاريخي |

---

## 24. سجل قرارات

### 24.1 قرارات معمارية (مُتَّخَذة ضمن نطاق هذه الوثيقة نفسها — معتمَدة ضمن اعتماد المؤسس الشامل للوثيقة، 2026-09-19)

1. **`catalog_category_min_margins` يستخدم `catalog_categories` الجديد، لا `categories` القديم** —
   راجع §1.2/§3.2 بند 2 للتبرير الكامل (الهرمية الجديدة هي المُستهلَكة فعلياً في تصفح العميل).
2. **لا جدول `merchant_offers` منفصل جديد** — `products` (حيث `master_item_id IS NOT NULL`) يبقى هو
   كيان "عرض التاجر" فعلياً، بلا إعادة تصميم Schema قائم (§2، الملاحظة الحاسمة).
3. **الباركود أولوية أعلى من الاسم في المطابقة، لا استبدال كامل** — §4.3، يحافظ على توافق عكسي كامل
   مع مسار الاستيراد القائم بلا باركود.
4. **محرك حل التوريد "ترشيح متفائل"، لا حجز ذرّي** — §15.2، يتجنّب أي قفل جديد من فئة `DD-002` عمداً،
   يعتمد كلياً على `decrementIfAvailable()` القائمة كنقطة الحسم الذرّية الوحيدة.

### 24.2 بدائل مرفوضة

1. **إعادة تصميم `products`/`catalog_master_items` كجدولين منفصلين تماماً (`catalog_items` مرجعي +
   `merchant_offers` مستقل بالكامل)** — مرفوض هنا: `ADR-031` قائم فعلاً وحي، إعادة تصميمه Migration
   ضخمة وخطيرة على بيانات حية (7,556 منتجاً + 50 صفاً بـ`tenant_id`)، خارج نطاق "إضافي وقابل للتراجع"
   المطلوب صراحة في هذه المهمة. النموذج الحالي (نسخة مقفولة السعر لكل تاجر عبر `master_item_id`) كافٍ
   فعلياً لحل مشكلة التوريد المتعدد — لا حاجة معمارية حقيقية لإعادة بناء كامل، نفس استنتاج `ADR-031`
   نفسه حرفياً.
2. **قفل حجز مؤقت (Reservation Hold) أثناء مرحلة الحل نفسها** — مرفوض: يُدخِل تعقيداً جديداً (انتهاء
   صلاحية الحجز، تحرير الحجوزات المهجورة) من فئة `DD-002` نفسها (حالة موزَّعة بين طلبات)، بينما
   `decrementIfAvailable()` القائمة تحل نفس المشكلة الجوهرية (بيع مضاعف) دون هذا التعقيد، فقط بنافذة
   زمنية أقصر (لحظة Checkout الفعلية، لا طوال مدة تصفح العميل).
3. **Round-Robin صارم للعدالة (نقض مطلق فوق التحسين)** — مرفوض صراحة بطلب المؤسس المباشر في موجّه هذه
   المهمة ("لا نقض مطلق") — العدالة عامل موزون فقط (§10).

### 24.3 مخاطر

1. **`DD-002` يبقى Blocker منفصل قائم** (§15.3) — هذا التصميم لا يزيده سوءاً ولا يحله؛ أي تفعيل حقيقي
   لمحرك حل التوريد على أكثر من نسخة خادم يرث نفس المخاطرة المسجَّلة أصلاً.
2. **تعارض تصنيف `catalog_master_items.category_id` (قديم) مقابل `catalog_categories` (جديد)** (§1.2)
   — لو لم يُحسَم بإضافة `catalog_category_id` (§3.2 بند 2) قبل تفعيل إنفاذ الهامش، الميزة عديمة الأثر
   عملياً (كل عنصر كتالوج أساسي بلا قسم من الهرمية الفعلية المُستهلَكة).
3. **صفر تغطية اختبار حالية لأي جزء من هذا التصميم** — طبيعي لوثيقة تصميم بحتة، لكن يُسجَّل صراحة (نفس
   نمط `DD-004` القائم لمنطق `master-item`/`cascade`/مطابقة، غير المُختبَر وحدياً حتى اليوم `[CODE]`،
   `docs/DECISIONS.md`) — أي تنفيذ لاحق لهذا التصميم يجب أن يضيف اختبارات §23 كاملة، لا جزئياً.

### 24.4 أسئلة مفتوحة — الحالة بعد اعتماد المؤسس (2026-09-19)

> راجعة 2026-09-19: المؤسس اعتمد التصميم من حيث المبدأ وحسم أربعة من الأسئلة الخمسة المفتوحة أصلاً في
> هذا القسم صراحة. البنود أدناه مُعاد تنظيمها بناءً على ذلك — §24.4.1 قرارات نهائية (لم تعد أسئلة)،
> §24.4.2 يبقى مفتوحاً صراحةً. نفس بنية §10.1/§10.2 المُتَّبعة حرفياً في `PHASE_2_DOMAIN_DESIGN.md`.

#### 24.4.1 قرارات معتمَدة (كانت أسئلة مفتوحة، حُسمت في هذا الاعتماد)

1. **العلاقة بين الحد الأدنى لهامش ريف (§3) وجدول العمولات القائم في `SALSABIL_CONSTITUTION.md §19`
   (كان بند 1):** **منفصلان تماماً، بلا أي علاقة حسابية بينهما.** الحد الأدنى للهامش قيد حماية داخلي
   خاص بنظام المكتبة المشتركة فقط، وجدول العمولات يبقى كما هو تماماً لغرضه الأصلي (النموذج القديم/
   الحالات الأخرى خارج نطاق المكتبة المشتركة) — لا صيغة موحَّدة تجمعهما (§3.2، التفصيل الكامل).
2. **القيمة الافتراضية العالمية للهامش الأدنى (كان بند 2):** **5% من `base_price`**، Configuration
   قابلة للتعديل من لوحة إدارة مستقبلية بناءً على بيانات حقيقية بعد الإطلاق — **لا `Fail Open` بعد
   الآن**، يوجد دائماً حد فعّال (§3.2 بند 3، §3.3، §6 بند 4).
3. **مصير الـ7,506 منتج بلا تاجر (كان بند 3):** **تُعتمَد التوصية الأصلية في §20 حرفياً** — تبقى في
   المكتبة المشتركة بلا عروض توريد فعلية، غير قابلة للشراء حتى يضيف تاجر حقيقي عرض توريد حقيقياً
   عليها. لا حل مؤقت، لا بيانات وهمية، لا `tenant_id` مُسنَد جماعياً. §20 لا يحتاج أي تعديل بنيوي —
   كان يصف هذا المسار أصلاً كـ"المسار الآمن المقترَح"، أصبح الآن معتمَداً رسمياً لا مقترَحاً فقط.
4. **إعادة تسمية الملف (كان بند 4):** **منفَّذة.** `specs/orders/PHASE_3_SUPPLY_RESOLUTION_DESIGN.md`
   → `specs/orders/SUPPLY_RESOLUTION_ENGINE_DESIGN.md` (`git mv`، تاريخ الملف محفوظ) — كل إشارة داخلية
   لـ"Phase 3" في هذه الوثيقة نفسها صُحِّحت (راجع الملاحظة أعلى الوثيقة).

#### 24.4.2 يبقى مفتوحاً صراحةً (مؤجَّل بقرار مؤسس، لا منسي)

1. **(كان بند 5) متى يُبنى `open_marketplace_v5` فعلياً؟** مرتبط مباشرة بحسم `BR-017` (لا يزال
   `PROPOSED`، بلا قرار مؤسس نهائي). **تأكيد صريح من المؤسس (2026-09-19): مؤجَّل عمداً حتى حسم
   `BR-017` بالكامل — لا منسياً، لا ملغىً** — يبقى اسماً محجوزاً فقط في §9، بلا أي جدول زمني مقترَح
   حتى تلك اللحظة.

### 24.5 امتدادات مستقبلية (أسماء محجوزة فقط، لا التزام)

`route_optimized_v2`، `capacity_aware_v3`، `ai_assisted_v4`، `open_marketplace_v5` (§9، مؤجَّل حتى حسم
`BR-017` — §24.4.2) — لوحة إدارة لضبط `supply_resolution_weights`/`catalog_category_min_margins`/
`supply_resolution_global_settings` وحسم صفوف `catalog_content_review_queue` (غير مبنية هنا، تحتاج
واجهة `platform_admin` جديدة) — حساب فعلي لـ`merchant_reliability_snapshots.reliability_score`/
`fulfillment_cost_estimates.estimated_cost` بقاعدة حقيقية بدل الإدخال اليدوي.

---

*نهاية الوثيقة — ✅ APPROVED من المؤسس بتاريخ 2026-09-19 (توثيق تصميم فقط — لا يُشكِّل إذناً ببدء أي
تنفيذ، راجع Founder Gate أعلى الوثيقة). راجع §0 لملخص التحقق الحي الكامل، و§24.4.1 لقرارات الاعتماد
الأربعة، و§24.4.2 للبند الوحيد المتبقي مفتوحاً (مؤجَّل).*
