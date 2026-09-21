---
title: تقرير تنفيذ — إصلاح منتجات وهمية على الرئيسية + Dark Mode (staging.reefam.com)
status: EXECUTED AND VERIFIED LIVE ON STAGING
version: 1.0
last_updated: 2026-09-19
owner: Claude (تنفيذ) — للمراجعة من المؤسس
source_of_truth: هذا الملف تقرير تنفيذ staging، مكمِّل لـ
  docs/audits/2026-09-19-fix-fake-products-darkmode-execution-report.md (dev). نفس القسمين 1 و2 فقط من
  docs/audits/2026-09-19-staging-homepage-fake-products-darkmode-report.md — القسم 3 لم يُلمَس.
related: docs/audits/2026-09-19-fix-fake-products-darkmode-execution-report.md،
  docs/audits/2026-09-19-staging-homepage-fake-products-darkmode-report.md،
  docs/audits/2026-09-19-followup-notes-header-postcard-literal-colors.md (ملاحظة منفصلة، §4 أدناه)
---

## 0. ملخص تنفيذي

كل من البيانات (§1) والكود (§2) الآن **حيّان فعلياً على `staging.reefam.com`** — تحقَّقت منهما بـ`curl`/
استعلام DB مباشر/Playwright حقيقي ضد الدومين نفسه، لا افتراضاً. اكتشفت أثناء التنفيذ أن `git push` وحده
**لم يكن كافياً** لنشر الكود على staging (تفصيل §3) — تطلَّب خطوة إضافية (`vercel promote`) بعد تأكيدك
الصريح عليها.

## 1. منشورات حقيقية بدل الوهمية — نفس السكربت، بيئة staging

شغّلت `scripts/seed-real-merchant-highlight-posts.ts --env=staging` (يقرأ `.env.staging.local`، نفس
منطق نسخة dev حرفياً — لا تعديل على السكربت نفسه):

- **20 منشوراً جديداً** (منتجان لكل تاجر من التجار العشرة الفعليين على staging، `pilot-merchant-01..10`):

  | التاجر | المنتجان |
  |---|---|
  | pilot-merchant-01 | فيبا منظف اطباق ليمون اخضر 3ك، بسكاتو بسكويت بالفراولة 8قطع |
  | pilot-merchant-02 | كاستيلو جبنة ريكفورد 1ك، خير زمان بسبوسة بالقشطة 400 جم |
  | pilot-merchant-03 | يمامه صويا صوص 500 مل، خير زمان ملح طعام مكرر ناعم 500جم |
  | pilot-merchant-04 | ويندكس منظف زجاج 500 مل عرض، وايبي مناديل مبللة مضاد للبكتريا |
  | pilot-merchant-05 | العبد علبة بسكويت شوكولاتة 72ق، كورونا بيمبو جامبو بسكويت بالشيكولاتة |
  | pilot-merchant-06 | فريش فارم لانشون بقري بالفلفل 1ك، ماجي مرقة لحم بقري 20 جم |
  | pilot-merchant-07 | نستله كورن فليكس فيتنيس 375ج، بيتي عصير كوكتيل 235 مل |
  | pilot-merchant-08 | هيد اند شولدرز شامبو ناعم وحرير 600مل، هيركود كريم جل 150مل |
  | pilot-merchant-09 | بيبي جوي حفاضات سترتش مقاس 5، بيبيتو جيلي كولا صور استيكس 35جم |
  | pilot-merchant-10 | كلين آند كلير سائل منظف يومي، فيراند لافلي كريم تفتيح البشرة مالتي 40ج |

  السكربت تحقَّق أولاً (نفس الشرط المُنفَّذ على dev) من صلاحية كل منتج — لم يتوقف، كل المنتجات صالحة.
  `caption` = اسم المنتج (بلا `description` في DB، لا نص مُخترَع).

- **19 منشوراً وهمياً عُطِّل نشرها** (`is_published=false`، لا حذف) — **يطابق تماماً** رقم التشخيص
  الأصلي (تقرير التشخيص §1.2: "19 صفاً، كلها is_published=true" قبل الإصلاح). لا فرق بين dev (17) و
  staging (19) — بيئتان منفصلتان ببيانات Demo مختلفة الحجم أصلاً، كما هو متوقَّع ومُوثَّق.

### التحقق الحي (استعلام DB مباشر بعد التنفيذ)

```
إجمالي منشورات staging: 39 (كان 19 قبل التنفيذ)
منشورات منشورة (is_published=true): 20 — كلها الـ20 الجديدة بالضبط
منشورات poultry-test المرتبطة: 19 — is_published=true لعدد: 0 (0/19، كلها معطَّلة الآن)
منشورات pilot-merchant المرتبطة: 20 — is_published=true لعدد: 20 (20/20)
```

### التحقق الحي عبر `curl` ضد `staging.reefam.com` فعلياً (لا cache — `x-vercel-cache: MISS`)

```
مرجع "demo-products" في HTML المُعاد: 0 (كان 1+ قبل التنفيذ)
أسماء منتجات حقيقية ظاهرة فعلياً في الصفحة الأولى من الخلاصة (عيّنة من الطلب الفعلي):
  بيبي جوي حفاضات سترتش مقاس 5 58حفاضة
  ماجي مرقة لحم بقري 20 جم
  نستله كورن فليكس فيتنيس 375 ج
  هيد اند شولدرز شامبو ناعم وحرير600ملل
```

## 2. Dark Mode — نفس تعديلات الكود، منشورة الآن فعلياً على staging

الكود **مطابق حرفياً** لما نُفِّذ على dev (نفس commit، لا تعديل إضافي):

| الملف | أسطر متغيرة |
|---|---|
| `src/components/storefront/MobileHeroProductCard.tsx` | 30 (+15/-15) |
| `src/components/storefront/MobileSmallProductCard.tsx` | 18 (+9/-9) |
| `src/components/storefront/MobileStorefront.tsx` | 2 (+1/-1) |
| `src/components/QuantityStepper.tsx` | 4 (+2/-2) |
| `src/lib/personal-theme.ts` | 15 (+12/-3) |

(شارة "رائج" في `MobileSmallProductCard.tsx` لم تُلمَس، كما في dev — خارج النطاق صراحة.)

### التحقق الحي عبر `curl` ضد `staging.reefam.com` (قبل/بعد النشر الفعلي)

| المؤشر | قبل | بعد |
|---|---|---|
| `bg-emerald-600` (لون حرفي من الملفات الأربعة) | 9 | **0** |
| `text-gray-900` | 20 | **0** |
| `bg-card` / `bg-primary` / `text-primary-foreground` | موجودة جزئياً (من مكوّنات أخرى سليمة أصلاً) | 48 / 99 / 46 — زيادة تعكس استهلاك الملفات الأربعة للتوكنز الآن |

### التحقق الحي عبر Playwright فعلي ضد `https://staging.reefam.com/` نفسها (لا محاكاة محلية)

محاكاة "زائر جديد يختار داكن من قسم الوضع بلا ثيم مسبق" (`localStorage.setItem('sb_personal_mode',
'dark')` ثم إعادة تحميل الصفحة الحقيقية):

```json
{
  "personalTheme": "sage",
  "personalMode": "dark",
  "sbBackground": "#121714",
  "sbCard": "#1c221f"
}
```

لون خلفية بطاقة منتج حقيقية على الصفحة (`getComputedStyle` فعلي ضد الصفحة الحية): `rgb(28, 34, 31)` =
`#1c221f` — مطابق تماماً لنتيجة dev، يؤكد أن كلا الإصلاحين (منطق الثيم الافتراضي + استبدال الألوان
الحرفية) يعملان معاً بشكل صحيح على staging الفعلية، لا نسخة محلية.

## 3. ⚠️ اكتشاف غير متوقَّع أثناء النشر — `git push` وحده لم يكفِ

بعد `commit` + `push` إلى `origin/feature/ui-antigravity` (نجح، مرَّت كل الاختبارات في pre-push hook:
267/267 وحدة + 63/63 تكامل)، تحقَّقت حياً عبر `curl` ضد `staging.reefam.com` فوجدت الألوان القديمة
(`bg-emerald-600`) **لا تزال موجودة** رغم النشر. فحصت بـ Vercel CLI (`vercel list`/`vercel alias ls`)
واكتشفت:

- `staging.reefam.com` كان (ولا يزال أساساً) alias ثابتاً لبيئة **Production** في Vercel، والتي تُبنى
  **من فرع `main` فقط** — تأكَّد ذلك من alias مطابق تماماً
  (`salsabil-core-git-main-salsabil2.vercel.app` يشير لنفس deployment الذي كان معلَّقاً على
  `staging.reefam.com`).
- `push` إلى `feature/ui-antigravity` أنشأ **نشر Preview منفصل تماماً**
  (`salsabil-core-git-feature-ui-antigravity-salsabil2.vercel.app`) — لا علاقة له بـ`staging.reefam.com`
  إطلاقاً بحكم إعداد Vercel الحالي.

**بعد تأكيدك الصريح**، رقَّيت (`vercel promote`) ذلك النشر (المبني من `feature/ui-antigravity` نفسه، يحوي
كل إصلاحاتي) مباشرة إلى Production — `staging.reefam.com` أصبح الآن مُعلَّقاً على deployment جديد
(`salsabil-core-9ogk0qgeo-salsabil2`) بدل القديم، بلا حاجة لدمج `main` أو فتح PR. تحقَّقت فوراً بعدها
(§1، §2 أعلاه) أن كل شيء حي فعلياً.

**ملاحظة للمستقبل:** أي تعديل كود لاحق على `feature/ui-antigravity` يحتاج نفس الخطوتين (push + promote)
ليصل فعلياً لـ`staging.reefam.com` ما دام إعداد Vercel الحالي (Production ← `main`) كما هو — ليس مجرد
`git push` كما كان مفترَضاً في البداية.

## 4. الملاحظة الجانبية المطلوب توثيقها فقط (لا إصلاح الآن)

راجع تقريراً منفصلاً: `docs/audits/2026-09-19-followup-notes-header-postcard-literal-colors.md` —
`Header.tsx`/`PostCard.tsx` لا يزالان يحملان ألوان Tailwind حرفية (`bg-white`) رغم أن التشخيص الأصلي
وصفهما كمكوّنين "سليمين"، تحقَّقتُه حياً على `staging.reefam.com` بعد النشر (لا يزالان موجودين، كما هو
متوقَّع — خارج نطاق هذه المهمة تماماً).
