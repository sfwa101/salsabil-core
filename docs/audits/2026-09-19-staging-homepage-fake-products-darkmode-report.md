---
title: تقرير تشخيصي — منتجات وهمية على الصفحة الرئيسية + Dark Mode لا يعمل جزئياً + فحص Hardcoding (staging.reefam.com)
status: DIAGNOSIS ONLY — بلا أي تعديل كود
version: 1.0
last_updated: 2026-09-19
owner: Claude (تشخيص) — للمراجعة من المؤسس
source_of_truth: هذا الملف تقرير تشخيص فقط، لا تنفيذ. راجع docs/audits/2026-09-19-task-18-catalog-storefront-report.md
  للسياق السابق (كان تحقّقه على dev فقط) — هذا التقرير يتحقّق من staging مباشرة.
related: docs/audits/2026-09-19-task-18-catalog-storefront-report.md، docs/audits/2026-09-19-launch-readiness-report.md
---

> **منهجية:** كل رقم هنا تحقّقتُ منه مباشرة ضد قاعدة بيانات **staging** الحية (`.env.staging.local`،
> `yrenjgufmmebdssyvyoy.supabase.co`) عبر سكربتات Node مؤقتة (`@supabase/supabase-js`، مفتاحي
> service_role وanon)، حُذفت فور الاستخدام. كل ادعاء عن الكود مرفق بمسار الملف والسطر.

## 0. الخلاصة التنفيذية (للقراءة السريعة)

| # | المشكلة | السبب الجذري | الحجم التقديري |
|---|---|---|---|
| 1 | الرئيسية تعرض منتجات وهمية فقط | الخلاصة الرئيسية مصدرها **حصرياً** جدول `posts` (بيان/CMS) لا جدول `products` مباشرة — على staging توجد 19 منشوراً فقط، **كلها** بلا استثناء تشير لـ19 منتج Demo من مرجع تصميمي خارجي. صفر من 7,506 منتج TASK-17 المستورَد وصفر من 103 منتج التجار العشرة الحقيقيين الجدد لهم أي منشور. | متوسط–كبير (قرار معماري + بيانات) |
| 2 | Dark Mode لا يعمل في بعض الأجزاء | (أ) لا يوجد "Dark Mode نظام تشغيل" حقيقي في الكود إطلاقاً — `.dark` class لا يُطبَّق على أي عنصر أبداً. (ب) زر "داكن" الفعلي (مظهر التطبيق) **يُلغي نفسه صامتاً** إن لم يخترِ المستخدم ثيماً شخصياً أيضاً. (ج) 4 مكوّنات (بطاقات المنتج على الموبايل تحديداً) تستخدم ألوان Tailwind حرفية (`bg-white`, `text-gray-900`, `bg-emerald-600`...) بدل توكنز الثيم، فلا تتفاعل مع أي آلية ثيم مهما كانت. | صغير–متوسط |
| 3 | شك Hardcoding | مؤكَّد — 5 مواضع محددة (تفصيل §3)، أهمها نفس سبب المشكلة #1. | يتفاوت لكل بند (تفصيل أدناه) |

---

## 1. السبب الجذري لظهور منتجات وهمية بدل الحقيقية

### 1.1 كيف تُبنى الصفحة الرئيسية فعلياً

مسار الاستدعاء الكامل، مُتحقَّق من الكود مباشرة:

```
src/app/(reef)/page.tsx:36-37
  → loadFeedPageAction()                         [src/app/(reef)/feed-actions.ts:24-27]
    → bayanService.listFeed()                     [src/core/modules/bayan/bayan.service.ts:46-68]
      → bayanRepository.listPublishedPosts()       [src/core/modules/bayan/bayan.repository.ts:126-147]  ← SELECT * FROM posts
      → bayanRepository.findPostProductsWithProductsByPostIds()  [bayan.repository.ts:170-186]  ← JOIN post_products→products
```

النتيجة (`firstPage.products`) تُمرَّر حرفياً لكل من:
- `<Feed initialProducts={firstPage.products} .../>` (سطح المكتب) — [page.tsx:80](../../src/app/(reef)/page.tsx#L80)
- `<MobileStorefront products={firstPage.products} .../>` (الموبايل) — [page.tsx:91](../../src/app/(reef)/page.tsx#L91)

**لا يوجد أي مسار بديل يستعلم `products` مباشرة للصفحة الرئيسية.** `catalogService` يُستدعى فقط لجلب `districts`/`categories` (تصفح القوائم)، لا لمنتجات الخلاصة نفسها.

بعبارة أخرى: الصفحة الرئيسية ليست "شبكة منتجات حية من الكتالوج" — هي **خلاصة محتوى مُنسَّقة يدوياً** (نمط CMS، جدول `posts`)، تعرض فقط منتجاً له منشور (`post`) مرتبط به صراحة عبر جدول الربط `post_products`. منتج موجود في `products`، نشط (`is_active=true`)، مصنَّف بحي صحيح — **لن يظهر على الرئيسية أبداً** إلا إذا أنشأ أحدٌ له صف `post`/`post_media`/`post_products` يدوياً.

### 1.2 التحقق الحي من staging (لا افتراض)

```
posts (staging)                    → 19 صفاً، كلها is_published=true
post_products (staging)            → 19 صفاً (1 لكل منشور، لا أكثر)
products.image_url LIKE '/demo-products/%'  → 19 منتجاً (تطابق تام مع عدد المنشورات)
```

كل الـ19 منشوراً على staging **بلا استثناء واحد** تشير لهذه الـ19 منتجاً بالضبط (تحقّق مباشر عبر JOIN
`post_products → posts (is_published) → products (image_url)`، النتيجة 19/19). أي زائر لـ
staging.reefam.com اليوم يرى **فقط** هذه المنتجات الـ19.

**مصدر هذه المنتجات الـ19 موثَّق صراحة في الكود نفسه كبيانات Demo:**

- [`scripts/seed-lovable-reference-demo-products.ts:1-7`](../../scripts/seed-lovable-reference-demo-products.ts#L1-L7):
  > "⚠️ بيانات عرض توضيحي (DEMO DATA) — مستوردة من مرجع تصميمي خارجي، لا بيانات تاجر حقيقي ⚠️ ...
  > **ليست** منتجات باعها تاجر حقيقي فعلياً."
  يُدرِج 19 منتجاً (خيار، خس، موز، تفاح، ...) بصور `public/demo-products/*.jpg` (صور Stock محلية) تحت
  تاجر وهمي `poultry-test` ("محل الدواجن التجريبي — Staging"، `merchants.slug='poultry-test'`).
- [`scripts/seed-product-highlight-posts.ts:1-16`](../../scripts/seed-product-highlight-posts.ts#L1-L16):
  يُنشئ لكل واحد من هذه الـ19 منتجاً منشور `product_highlight` + `post_media` + `post_products` —
  **هذا تحديداً** ما يجعلها تظهر على الخلاصة الرئيسية.

تحقّقت حياً: `merchants.id='147dacbe-4cd7-402d-b5db-b30fca85100d'` (poultry-test) يملك 49 منتجاً على
staging؛ الـ19 المعروضة على الرئيسية هي جزء منها فقط (الباقي 30 من دفعة تجريبية أقدم — راجع
`seed-daily-food-demo-content.ts` — لا منشورات لها أيضاً، لا تظهر على الرئيسية).

### 1.3 التحقق الحي من غياب المنتجات الحقيقية عن نفس الآلية

**منتجات TASK-17 المستورَدة (7,506 منتجاً حقيقياً):**
```
products.category_id IS NULL (= دفعة TASK-17)  → 7,506
منها بعينة عشوائية (5 منتجات لها district_id مضبوط) → 0/5 لها أي صف في post_products
```

**منتجات التجار العشرة الحقيقيين الجدد** (أُنشئوا اليوم 2026-09-19، حسب `merchants.created_at`):

```
pilot-merchant-01 … pilot-merchant-10  (10 تجار، كل واحد مُخصَّص لحي حقيقي مختلف)
  → 103 منتج إجمالاً، كلها:
     is_active = true (103/103)
     district_id مضبوط (103/103)
     catalog_category_id مضبوط (103/103)
     → مصنَّفة بشكل صحيح تماماً، تظهر بنجاح عند تصفّح /<حيها>/<قسمها> مباشرة
  لكن: post_products المطابقة لهذه الـ103 منتج → 0 (صفر مطلق)
```

**الخلاصة الجذرية:** المشكلة **ليست** أن المنتجات الحقيقية غير موجودة أو غير مربوطة في staging — هي
موجودة، نشطة، ومصنَّفة بحي/قسم صحيحين 100%. المشكلة أن **الصفحة الرئيسية أصلاً لا تستعلم عن `products`
بحسب الحي/التصنيف مطلقاً** — تستعلم فقط عن "منشورات" (`posts`)، ولم يُنشئ أحد بعد منشوراً واحداً يربط
أياً من هذه المنتجات الحقيقية (لا الـ7,506 المستورَدة، ولا الـ103 من التجار العشرة) بالخلاصة. صفحات
تصفح الحي (`/[district]/[category]`، من TASK-18) **تعمل بشكل صحيح وتُظهر هذه المنتجات فعلياً** — المستخدم
فقط لا يصل إليها من الرئيسية لأن الرئيسية أصلاً تعرض شيئاً آخر (خلاصة منشورات، لا شبكة كتالوج).

---

## 2. السبب الجذري لعدم تفاعل بعض عناصر الواجهة مع Dark Mode

هناك **ثلاث مشاكل منفصلة ومتراكبة**، وأي واحدة منها كافية لتفسير الأعراض:

### 2.1 لا يوجد "Dark Mode نظام تشغيل" (prefers-color-scheme) في الكود إطلاقاً

[`src/app/globals.css:7`](../../src/app/globals.css#L7):
```css
@custom-variant dark (&:is(.dark *));
```
أي `dark:` class في Tailwind لا يُفعَّل إلا إذا وُجد عنصر أب يحمل class حرفي اسمه `dark`. بحثتُ في كامل
`src/` عن أي كود يضيف هذا الـclass (`classList.add('dark')`, مكتبة `next-themes`,
`prefers-color-scheme`) — **لا يوجد ولا موضع واحد.** النتيجة: أي استخدام لـ`dark:` في الكود **كود ميت
بنيوياً**، لن يُفعَّل أبداً بأي تفاعل من المستخدم. الاستخدامان الوحيدان الموجودان فعلياً:
- [`src/components/ui/button.tsx`](../../src/components/ui/button.tsx) (توليد shadcn تلقائي، غير مُستخدَم فعلياً)
- [`src/app/(reef)/cart/page.tsx:100`](../../src/app/(reef)/cart/page.tsx#L100) (صندوق تنبيه واحد فقط)

### 2.2 الزر الفعلي الذي يراه المستخدم باسم "داكن" له عطل منطقي يُلغيه صامتاً

الزر الحقيقي هو "مظهر التطبيق" ([`PersonalThemeSheet.tsx`](../../src/components/PersonalThemeSheet.tsx))
— شيت فيه قسمان: "الوضع" (فاتح/داكن) و"الثيم" (10 ثيمات مسمّاة: ريفي، محيطي، كهرماني...). اختيار "الوضع"
وحده يستدعي [`persistPersonalMode()`](../../src/lib/personal-theme.ts#L60-63) التي بدورها تستدعي:

```ts
// src/lib/personal-theme.ts:44-53
export function applyPersonalThemeToDocument(theme: PersonalThemeSlug | null, mode: PersonalColorMode): void {
  if (typeof document === 'undefined') return;
  if (theme) {
    document.documentElement.dataset.personalTheme = theme;
    document.documentElement.dataset.personalMode = mode;
  } else {
    delete document.documentElement.dataset.personalTheme;   // ← هنا
    delete document.documentElement.dataset.personalMode;    // ← وهنا
  }
}
```

إن لم يكن المستخدم قد اختار "ثيماً" من القسم الثاني مسبقاً (`readStoredPersonalTheme()` تُعيد `null` —
**هذه هي الحالة الافتراضية لكل زائر لم يفتح الشيت من قبل، أي الأغلبية الساحقة**)، فإن اختيار "داكن" من
القسم الأول **يحذف كلا السمتين من `<html>` بدل تطبيق الوضع الداكن** — لأن الشرط `if (theme)` يفشل. لا
خطأ يظهر، لا شيء يتغيّر بصرياً، والمستخدم يظن أن "بعض العناصر لا تتفاعل" بينما الحقيقة أن **لا شيء
تفاعل إطلاقاً** إلا إذا اختار ثيماً مسمّى أيضاً بالتوازي — سلوك غير بديهي وغير موثَّق في واجهة الشيت نفسها
(لا رسالة "اختر ثيماً أولاً").

القيمة التي يقرأها كل مكوّن فعلياً معرَّفة في CSS بشرط مركَّب:
```css
/* src/app/globals.css:320-321 */
html[data-personal-theme][data-personal-mode][data-world],
html[data-personal-theme][data-personal-mode] [data-world] {
  --sb-background: var(--sb-pt-background); /* ... */
}
```
يتطلب الاثنين معاً (`data-personal-theme` **و** `data-personal-mode`) — غياب أحدهما يُسقط القاعدة
بالكامل، فتُستخدَم ألوان `[data-world='reef']` الفاتحة الافتراضية دائماً (`globals.css:171-186`).

### 2.3 حتى مع اختيار الوضعين معاً بشكل صحيح — مكوّنات محدَّدة تتجاهل نظام التوكنز كلياً

بحثت في كل `src/components` و`src/app` عن ألوان Tailwind **حرفية** (`bg-white`, `text-gray-900`,
`bg-emerald-600`...) بدل التوكنز الدلالية (`bg-card`, `text-foreground`, `bg-primary`...). الألوان
الحرفية **لا تقرأ أي CSS variable إطلاقاً** — ثابتة بصرف النظر عن أي ثيم أو وضع.

**نتيجة الفحص — المكوّنات المتأثرة بالاسم (كلها فعلياً على مسار الصفحة الرئيسية للموبايل تحديداً):**

| الملف | الأسطر | التفصيل |
|---|---|---|
| [`src/components/storefront/MobileHeroProductCard.tsx`](../../src/components/storefront/MobileHeroProductCard.tsx) | 30, 33, 35, 36, 39, 41, 43, 48, 62, 65, 102, 104, 106, 121 | بطاقة المنتج "الكبيرة" على خلاصة الموبايل — كل الخلفيات/النصوص/الحدود حرفية (`bg-white`, `text-gray-900/500/400`, `bg-gray-50/100`, `bg-emerald-600`, `hover:text-red-500`, `hover:text-blue-500`) |
| [`src/components/storefront/MobileSmallProductCard.tsx`](../../src/components/storefront/MobileSmallProductCard.tsx) | 29, 34, 47, 56, 63, 64, 65, 84 | بطاقة المنتج "الصغيرة" (الشبكة) على خلاصة الموبايل — نفس النمط، زائداً شارة "رائج" الحرفية (`bg-rose-50 text-rose-600`، راجع أيضاً §3.5) |
| [`src/components/storefront/MobileStorefront.tsx`](../../src/components/storefront/MobileStorefront.tsx) | 65 | عنوان قسم داخل خلاصة الموبايل: `text-gray-900` |
| [`src/components/QuantityStepper.tsx`](../../src/components/QuantityStepper.tsx) | 63 | `text-gray-900` على رقم الكمية — **هذا المكوّن مُعاد استخدامه في 9 مواضع أخرى** (`DesktopCartSidebar`, `CartCapsule`, `PostCard`, `ProductCard`, `CartLineItem`...) فيؤثر عملياً في كل مكان يظهر فيه عدّاد كمية، سطح المكتب والموبايل معاً |
| [`src/components/ReelsFeed.tsx`](../../src/components/ReelsFeed.tsx) | 70 | `bg-zinc-900` — لكن هذا المكوّن **كود ميت مؤكَّد** (لا مسار وصول فعلي، موثَّق في `MobileStorefront.tsx:34-36` وباختبار regression مخصَّص) — منخفض الأولوية |
| [`src/app/(reef)/cart/page.tsx`](../../src/app/(reef)/cart/page.tsx) | 100 | صندوق تنبيه واحد يستخدم `dark:text-amber-300` — لكن كما في §2.1، `dark:` ميت بنيوياً، فهذا السطر لن يعمل حتى لو أُصلحت §2.2 |

**فحصتُ عمداً** بقية مكوّنات الرئيسية (`Feed.tsx`, `PostCard.tsx`, `StoryBar.tsx`,
`DesktopCartSidebar.tsx`, `DesktopCategorySidebar.tsx`, `Header.tsx`, `BottomNav.tsx`) — **صفر** ألوان
حرفية فيها، كلها تستخدم التوكنز الدلالية بشكل صحيح (`bg-card`, `text-foreground`, `bg-primary`...).
**الخلل مركَّز حصراً في بطاقات المنتج على واجهة الموبايل** (`MobileHeroProductCard`/`MobileSmallProductCard`)
+ `QuantityStepper` المشترك — وهذا يطابق تماماً وصف المؤسس "بعض الأجزاء" لا كل الواجهة.

---

## 3. قائمة كاملة بكل موضع Hardcode مكتشَف

| # | الموضع | النوع | الوصف | خطورة على المصداقية |
|---|---|---|---|---|
| 1 | [`scripts/seed-lovable-reference-demo-products.ts:63-216`](../../scripts/seed-lovable-reference-demo-products.ts#L63-L216) | بيانات (DB seed) | 19 منتجاً Demo بأسماء/أسعار/صور Stock ثابتة، مُدرَجة فعلياً في جدول `products` الحقيقي تحت تاجر وهمي | **عالية** — هذا تحديداً سبب المشكلة #1 |
| 2 | [`scripts/seed-product-highlight-posts.ts:46-66`](../../scripts/seed-product-highlight-posts.ts#L46-L66) | بيانات (DB seed) | يربط الـ19 منتجاً أعلاه بمنشورات فعلية تجعلها تظهر على الرئيسية | **عالية** — الآلية الفعلية لظهور #1 |
| 3 | [`src/components/DeliveryAddressButton.tsx:21-25`](../../src/components/DeliveryAddressButton.tsx#L21-L25) | نص/بيانات UI | `FAKE_ADDRESSES` — 3 عناوين وهمية ثابتة ("شارع النموذج 12، القاهرة"...) تظهر في زر عنوان التوصيل أسفل شعار "ريف المدينة" في الهيدر **بكل صفحة**؛ لا اتصال DB، لا حفظ فعلي. موثَّق صراحة في تعليق الملف كـ placeholder مؤقت | متوسطة — ظاهر لكل زائر، لكن موثَّق كقرار مؤقت مقصود |
| 4 | [`src/components/ReelsFeed.tsx:8-43`](../../src/components/ReelsFeed.tsx#L8-L43) | بيانات UI | `MOCK_REELS` — بيانات فيديو/تجار وهمية ثابتة بالكامل | منخفضة — **كود ميت مؤكَّد**، لا مسار وصول فعلي في الواجهة اليوم |
| 5 | [`src/components/storefront/MobileSmallProductCard.tsx:33-36`](../../src/components/storefront/MobileSmallProductCard.tsx#L33-L36) | شارة UI ثابتة | شارة "رائج" تُعرَض على **كل** بطاقة منتج في الشبكة بلا استثناء، غير مشتقة من أي مقياس مبيعات/شعبية حقيقي | متوسطة — تضليل تسويقي بسيط، ليس بيانات وهمية بمعنى منتج غير موجود |

**بالإضافة** لقائمة الألوان الحرفية في §2.3 (5 ملفات) — هذه "hardcoding" من نوع مختلف (تجاوز نظام
التصميم لا بيانات وهمية)، مذكورة هناك بالتفصيل لتجنب التكرار.

**لم أجد** أي hardcoding لأسماء أحياء/فئات/بانرات مستقلة خارج ما سبق — صفحات تصفح الحي
(`/[district]`, `/[district]/[category]`) وقوائم `StoryBar`/`DesktopCategorySidebar` كلها تستعلم
`catalogService.getDistricts()`/`listCategories()` مباشرة، تحقَّقت من ذلك عبر قراءة الكود مباشرة، لا
مصفوفات ثابتة.

---

## 4. تقدير حجم الإصلاح (بدون تنفيذ)

### المشكلة #1 — منتجات وهمية بدل حقيقية

- **إصلاح سريع/تشغيلي (صغير):** سكربت واحد (بنفس نمط `seed-product-highlight-posts.ts` الموجود فعلاً)
  ينشئ منشورات لعيّنة من الـ103 منتج (التجار العشرة الحقيقيين) و/أو عيّنة من الـ7,506 المستورَدة، ويُلغي
  نشر (`is_published=false`) الـ19 منشوراً الوهمياً الحالية. لا تعديل كود، بيانات فقط. **يحل العرض
  الفوري لكن لا يُحل الجذر** (الخلاصة تبقى "منسَّقة يدوياً"، تحتاج تحديثاً يدوياً متكرراً مستقبلاً كلما
  انضم تاجر جديد).
- **الحل الجذري (متوسط–كبير):** تعديل معماري — إما (أ) الصفحة الرئيسية تستعلم `products` مباشرة (حسب
  حي المستخدم مثلاً) بدل الاعتماد الحصري على `posts`، مع إبقاء `posts` كطبقة "تمييز/بانرات" فوقها، أو
  (ب) بناء أداة إدارية (Admin) لإنشاء منشورات بالجملة من منتجات موجودة (لا يدوياً واحداً تلو الآخر عبر
  سكربت). يتقاطع هذا القرار مع فجوة `tenant_id IS NULL` لـ7,506 منتجاً المذكورة في
  `docs/audits/2026-09-19-task-18-catalog-storefront-report.md §5` — منتج بلا تاجر لا يمكن أن يُشترى
  حتى لو ظهر على الرئيسية، فالقرار الكامل ("هل نعرض المستورَد كمباع مباشرة من ريف، أم ننتظر تجاراً
  حقيقيين لكل صنف؟") قرار مؤسس، لا تقني بحت.

### المشكلة #2 — Dark Mode

- **§2.2 (منطق `applyPersonalThemeToDocument`):** صغير — تعديل سطري في `personal-theme.ts` (مثال: عند
  اختيار "داكن" بلا ثيم مسبق، طبّق ثيماً افتراضياً بدل حذف السمتين) + قرار منتج بسيط (ما الثيم
  الافتراضي؟). لا مخاطرة معمارية.
- **§2.3 (الألوان الحرفية):** صغير–متوسط — استبدال ~30 صفاً موزّعة على 4 ملفات فعلية (`MobileHeroProductCard`,
  `MobileSmallProductCard`, `MobileStorefront`, `QuantityStepper`) بتوكنز دلالية مكافئة (`bg-card`
  بدل `bg-white`، `text-foreground` بدل `text-gray-900`، `bg-primary` بدل `bg-emerald-600`، إلخ) —
  ميكانيكي إلى حد كبير، يحتاج فقط مراجعة بصرية بعد التطبيق (تباين الألوان لكل ثيم/وضع).
- **§2.1 (`dark:`/`.dark` الميت):** لا حاجة لإصلاحه إن اعتُمد نظام "الثيم الشخصي" كحل دائم وحيد — يمكن
  ببساطة حذف الاستخدامين الميتين (`button.tsx`, `cart/page.tsx:100`) بدل ربطهما بآلية لا وجود لها.

### المشكلة #3 — Hardcoding

- عناصر #4 (`MOCK_REELS`) و#5 (شارة "رائج"): صغير جداً — حذف/تعطيل مباشر.
- عنصر #3 (`FAKE_ADDRESSES`): متوسط–كبير — يتطلب فعلياً بناء نطاق عناوين حقيقي (`user_addresses` +
  خريطة)، مذكور أصلاً كبند مؤجَّل في `docs/audits/2026-09-19-launch-readiness-report.md` (غير حاجز
  للإطلاق المحدود حسب ذلك التقرير) — ليس إصلاحاً سريعاً حقيقياً، بل قرار نطاق عمل منفصل.
- عناصر #1/#2 (سكربتات الـseed): نفس تقدير المشكلة #1 أعلاه (مرتبطان بنفس القرار).
