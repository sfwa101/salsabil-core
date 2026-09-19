---
title: تقرير تنفيذ — إصلاح منتجات وهمية على الرئيسية + Dark Mode (dev فقط، بانتظار إذن staging)
status: EXECUTED ON DEV — بانتظار إذن التكرار على staging
version: 1.0
last_updated: 2026-09-19
owner: Claude (تنفيذ) — للمراجعة من المؤسس
source_of_truth: هذا الملف تقرير تنفيذ للقسمين 1 و2 فقط من
  docs/audits/2026-09-19-staging-homepage-fake-products-darkmode-report.md — القسم 3 (Hardcoding
  الأخرى) لم يُلمَس، كما طُلب صراحة.
related: docs/audits/2026-09-19-staging-homepage-fake-products-darkmode-report.md
---

> **بيئة التنفيذ:** dev فقط (`.env.local`) — لم يُنفَّذ أي شيء على staging بعد، بانتظار إذن صريح.

## 1. منشورات حقيقية بدل الوهمية

سكربت جديد `scripts/seed-real-merchant-highlight-posts.ts` (نفس نمط `seed-product-highlight-posts.ts`
حرفياً)، شغّلته فعلياً على dev (`npx tsx scripts/seed-real-merchant-highlight-posts.ts`):

- **20 منشوراً جديداً** (`product_highlight` + `post_media` + `post_products`)، منتجان لكل تاجر من
  التجار العشرة (الأعلى والأقل سعراً لكل تاجر — تنويع بسيط)، تغطي الأحياء العشرة كاملة:

  | التاجر | المنتجان |
  |---|---|
  | pilot-merchant-01 (خضراوات وفواكه) | هاربيك منظف تواليت تألق الليمون، رووتس نعناع 4 فتلة |
  | pilot-merchant-02 (ألبان وأجبان) | جونسون كريم منعم بزبدة الشيا، Crunchy Cheetos Fried cheese |
  | pilot-merchant-03 (مطبخ ومؤن) | دريا أرز بسمتي بني، صافي مكرونة مرمرية |
  | pilot-merchant-04 (منظفات) | برسيل مسحوق اتوماتيك ورد، سوفت هاند مناديل مبللة |
  | pilot-merchant-05 (مفرحات) | برنجلز شيبسي هوت اند سبايسي، توك بسكويت بالبيتزا |
  | pilot-merchant-06 (لحوم ودواجن وأسماك) | ثري شفس بيف برجر، كاي نودلز الشوفان الفراخ بالكاري |
  | pilot-merchant-07 (مشروبات) | يمني قهوة محوجة فاتحة، فيفا عصير كوكتيل نكتار |
  | pilot-merchant-08 (صحة ودواء) | هيربل شامبو باي باي جفاف، كلوس اب معجون أسنان ريد هوت |
  | pilot-merchant-09 (الطفل) | فاين بيبي حفاضات وسط، ديزني مناديل مبللة للأطفال |
  | pilot-merchant-10 (المرأة) | فيت شمع كبير بشرة عادية، سوفي حفاضات نسائية طويلة |

  السكربت يتحقق أولاً من صلاحية كل منتج (سعر > 0، صورة موجودة، `is_active=true`) ويتوقف بلا أي تعديل
  إن وُجد أي منتج غير صالح — لم يحدث هذا على dev (98/98 منتجاً صالحاً). `caption` = اسم المنتج نفسه
  (كل المنتجات بلا `description`، لا نص تسويقي مُخترَع).

- **17 منشوراً وهمياً عُطِّل نشرها** (`is_published=false`، لا حذف) — كل المنشورات المرتبطة بمنتجات
  تاجر `poultry-test` على dev (dev لديه 17 لا 19 كما في staging — بيئة مختلفة، رقم متوقَّع). تحقَّقت
  حياً بعد التنفيذ: 0/17 لا يزال منشوراً.

### التحقق الحي (Verification Gate)

- `curl http://localhost:3000/` (dev server حي، نفس مسار `loadFeedPageAction`) → **200**، صفر مرجع
  لـ`demo-products` في HTML المُعاد، وأسماء منتجات حقيقية من 5 تجار مختلفين على الأقل ظاهرة فعلياً في
  الصفحة الأولى من الخلاصة (`ثري شفس بيف برجر`, `فاين بيبي حفاضات`, `فيت شمع`, `هيربل شامبو`, `يمني
  قهوة`...).
- إجمالي منشورات dev بعد التنفيذ: 39 (22 منشوراً منشوراً فعلياً)، كلها الآن تشير إما لمنتجات حقيقية
  جديدة أو لمنشورات قديمة أخرى غير poultry-test (لم تُلمَس).

## 2. Dark Mode

### 2.1 الملفات المعدَّلة (استبدال ألوان Tailwind حرفية بتوكنز دلالية)

| الملف | أسطر متغيرة (git diff --stat) |
|---|---|
| `src/components/storefront/MobileHeroProductCard.tsx` | 30 (+15/-15) |
| `src/components/storefront/MobileSmallProductCard.tsx` | 18 (+9/-9) |
| `src/components/storefront/MobileStorefront.tsx` | 2 (+1/-1) |
| `src/components/QuantityStepper.tsx` | 4 (+2/-2) |

استُبدلت كل الألوان الحرفية المذكورة في §2.3 من التقرير (`bg-white`→`bg-card`، `text-gray-900`→
`text-foreground`/`text-card-foreground`، `bg-gray-50/100`→`bg-muted`، `text-gray-400/500`→
`text-muted-foreground`، `bg-emerald-600`→`bg-primary`، `hover:text-red-500`→`hover:text-destructive`،
`hover:text-blue-500`→`hover:text-primary`، `text-white` في كبسولة `QuantityStepper`→
`text-primary-foreground`). **باستثناء واحد متعمَّد**: شارة "رائج" (`bg-rose-50 text-rose-600`) في
`MobileSmallProductCard.tsx` — لم تُلمَس، كما نصَّ التوجيه صراحة (خارج النطاق، §3 من التقرير).

تحقَّقت بـ`grep` بعد التعديل: صفر ألوان Tailwind حرفية متبقية في الأربع ملفات (عدا شارة "رائج"
المستثناة عمداً).

**ملاحظة جانبية غير مطلوب إصلاحها هنا:** أثناء التحقق الحي وجدت أن `Header.tsx` وبعض أزرار
`PostCard.tsx` (`bg-white`/`bg-white/90`) لا تزالان تحملان ألوان حرفية أيضاً رغم أن التقرير الأصلي ذكرهما
كمكوّنين "سليمين" — خارج نطاق هذه المهمة (4 ملفات محدَّدة فقط)، أُبلغ بها فقط.

### 2.2 إصلاح منطق `applyPersonalThemeToDocument`

`src/lib/personal-theme.ts`: عند `theme=null` (لم يختر المستخدم ثيماً مسمّى بعد) و`mode='dark'`، يُطبَّق
الآن ثيم افتراضي (`DEFAULT_PERSONAL_THEME_FOR_DARK = 'sage'` — "ريفي"، القيمة المقترحة في التوجيه) مع
`data-personal-mode='dark'`، بدل حذف السمتين كليهما. حالة `theme=null` مع `mode='light'` بلا تغيير (لا
تزال تحذف السمتين، تُبقي ألوان `[data-world]` الفاتحة الافتراضية كما كانت — لا انحدار).

### 2.3 نتيجة اختبار الوضع الداكن الحي

اختبار Playwright حي فعلي (لا محاكاة) ضد dev server يعمل فعلاً:

1. `localStorage.setItem('sb_personal_mode', 'dark')` فقط (بلا أي ثيم مخزَّن — نفس سيناريو "زائر لم
   يفتح الشيت من قبل" بالضبط) ثم إعادة تحميل الصفحة.
2. النتيجة الفعلية بعد التحميل:
   ```json
   {
     "personalTheme": "sage",
     "personalMode": "dark",
     "sbBackground": "#121714",
     "sbForeground": "#ecf3ed",
     "sbCard": "#1c221f"
   }
   ```
3. لون خلفية بطاقة منتج حقيقية على الصفحة (`getComputedStyle` فعلي): `rgb(28, 34, 31)` = `#1c221f`
   (نفس قيمة `--sb-card` الداكنة أعلاه) — **قبل الإصلاح كانت ستبقى بيضاء ثابتة** (`bg-white` حرفي، أو
   السمتان محذوفتان فلا يوجد وضع داكن إطلاقاً). التأكيد الحي يغطي كلا الإصلاحين معاً (منطق الثيم +
   استبدال الألوان الحرفية).

بالإضافة لاختبار وحدة جديد دائم: `src/lib/personal-theme.test.ts` (3 حالات: `null+dark`→sage مطبَّق،
`null+light`→حذف كما كان، ثيم مسمّى صراحة→يُحترَم بصرف النظر عن الوضع).

## 3. حالة الاختبارات

```
npm run typecheck    → 0 أخطاء
npm run test:unit    → 267/267 ✅ (264 أصلاً + 3 اختبارات جديدة لـpersonal-theme.ts)
npm run test:integration → 63/63 ✅ (بلا انحدار — لا اختبار تكامل مخصَّص لـbayan/feed موجود أصلاً في
  المشروع؛ الأقرب `reef-city-journey.integration.test.ts` ضمن الـ63، أخضر)
```

لا `arch:check` أو اختبار وحدة مخصَّص لـ`bayan.repository`/`bayan.service` كان يحتاج تحديثاً — لم يُمَس
أي كود في تلك الطبقة، فقط بيانات (posts/post_media/post_products) عبر سكربت جديد، وملفات عرض (Dark
Mode) لا منطق أعمال.

## 4. ما لم يُنفَّذ بعد (بانتظار إذن)

- **تكرار القسمين 1 و2 على staging** (نفس السكربت بـ`--env=staging`، نفس تعديلات الكود — الكود مُطبَّق
  بالفعل على كل البيئات فور الدفع؛ البيانات تحتاج تشغيل السكربت مرة أخرى صراحة على staging).
- لم أُغيِّر `git add`/commit — كل التعديلات في working tree فقط، بانتظار توجيهك.
