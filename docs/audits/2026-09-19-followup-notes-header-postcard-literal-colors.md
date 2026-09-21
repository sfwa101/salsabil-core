---
title: ملاحظة متابعة — ألوان Tailwind حرفية متبقية خارج نطاق FIX-STAGING-HOMEPAGE-FAKE-PRODUCTS-DARKMODE
status: DOCUMENTATION ONLY — بلا أي تعديل كود
version: 1.0
last_updated: 2026-09-19
owner: Claude (توثيق) — للمراجعة من المؤسس
source_of_truth: هذا الملف توثيق فقط، لا تنفيذ. الإصلاح الذي نُفِّذ فعلياً (4 ملفات محدَّدة) موثَّق في
  docs/audits/2026-09-19-fix-fake-products-darkmode-execution-report.md (dev) و
  docs/audits/2026-09-19-fix-fake-products-darkmode-execution-report-staging.md (staging).
related: docs/audits/2026-09-19-staging-homepage-fake-products-darkmode-report.md (§2.3)
---

> **لا إصلاح هنا بطلب صريح** — هذا الملف يوثِّق فقط ما اكتُشِف أثناء التحقق الحي بعد إصلاح Dark Mode في
> الأربع ملفات المحدَّدة (`MobileHeroProductCard.tsx`, `MobileSmallProductCard.tsx`,
> `MobileStorefront.tsx`, `QuantityStepper.tsx`)، ليُراجَع لاحقاً ويُقرَّر نطاقه.

## 1. التناقض مع التقرير الأصلي

تقرير التشخيص الأصلي (`2026-09-19-staging-homepage-fake-products-darkmode-report.md §2.3`) ذكر صراحة:

> "فحصتُ عمداً بقية مكوّنات الرئيسية (`Feed.tsx`, `PostCard.tsx`, `StoryBar.tsx`,
> `DesktopCartSidebar.tsx`, `DesktopCategorySidebar.tsx`, `Header.tsx`, `BottomNav.tsx`) — **صفر** ألوان
> حرفية فيها."

تحقَّقت حياً (`grep` مباشر على الكود + فحص HTML المُعاد فعلياً من `staging.reefam.com` بعد نشر إصلاح
هذه المهمة) أن هذا **غير دقيق** — `Header.tsx` و`PostCard.tsx` تحديداً يحملان ألوان حرفية فعلية، وهما
على مسار الصفحة الرئيسية مباشرة (نفس مسار المكوّنات الأربعة التي أُصلحت).

## 2. المواضع الدقيقة

| الملف | السطر | الكود |
|---|---|---|
| `src/components/Header.tsx` | 47 | `bg-white` — خلفية الهيدر الثابت بكامل الموقع (`<header>`) |
| `src/components/PostCard.tsx` | 145 | `bg-white/90 ... hover:bg-white` — زر "إعجاب" العائم فوق صورة المنشور |
| `src/components/PostCard.tsx` | 148 | `bg-white/90 ... hover:bg-white` — زر "مشاركة" العائم فوق صورة المنشور |

**الأثر البصري:** في الوضع الداكن (بعد إصلاح هذه المهمة)، الهيدر أعلى كل صفحة سيبقى أبيض ثابتاً رغم أن
بقية الصفحة أصبحت داكنة فعلياً — تناقض بصري ملحوظ سيظهر فوراً لأي مستخدم يفعِّل الوضع الداكن الآن.

## 3. مواضع إضافية مكتشَفة أثناء نفس الفحص (خارج نطاق §2.3 الأصلي تماماً — لم يذكرها التقرير أصلاً)

فحص أوسع (`grep -rl` على كل `src/components/**/*.tsx`) وجد 3 ملفات إضافية، كلها في مسار السلة
(Cart)، لم يذكرها تقرير التشخيص الأصلي إطلاقاً (كان نطاقه محصوراً بمسار الرئيسية):

| الملف | الأسطر | الكود |
|---|---|---|
| `src/components/CartCapsule.tsx` | 195, 226 | `bg-white` (حاوية السلة المنبثقة على الموبايل بكاملها + تذييلها) |
| `src/components/storefront/CartLoadErrorPanel.tsx` | 16 | `bg-white` (لوحة خطأ تحميل السلة، سطح المكتب) |
| `src/components/storefront/DesktopCartSidebar.tsx` | 108, 135 | `bg-white` (الشريط الجانبي للسلة، سطح المكتب + تذييله) |

**الأثر البصري المتوقَّع:** نفس أثر الهيدر — أي مستخدم يفتح السلة (موبايل أو سطح مكتب) في الوضع الداكن
سيرى صندوق سلة أبيض ثابتاً وسط واجهة داكنة.

`src/components/ReelsFeed.tsx:70` (`bg-zinc-900`) **لم يُدرَج هنا** — التقرير الأصلي وثَّقه بالفعل (§2.3)
كـ"كود ميت مؤكَّد، منخفض الأولوية"، لا جديد.

## 4. التوصية (بلا تنفيذ)

نفس نمط الإصلاح المُطبَّق في هذه المهمة (استبدال `bg-white`→`bg-card`، مراجعة `hover:bg-white`→
`hover:bg-accent` أو ما يعادلها دلالياً) قابل للتطبيق مباشرة على الملفات الخمسة أعلاه — لا تعقيد إضافي،
لكنه قرار نطاق عمل منفصل (يمس الهيدر الظاهر بكل صفحة + مسار السلة الكامل، لا مسار الرئيسية فقط) يستحق
موافقة صريحة قبل التنفيذ، خاصة أن التقرير الأصلي استثناه عمداً من التشخيص.
