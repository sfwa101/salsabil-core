---
title: نظام التصميم (Design System)
status: PROPOSED (الاتجاه العام + معمارية الثيمات متعددة العوالم §8 ACCEPTED من حيث المبدأ ومُنفَّذة تقنياً لديوان/ريف، القيم الدقيقة للألوان و5 العوالم الأخرى لا تزال PROPOSED)
version: 1.3
last_updated: 2026-09-03
owner: المؤسس (أبوحتاب)
source_of_truth: هذا الملف، SALSABIL_CONSTITUTION.md §21, §30.2 (المصدر الأصلي)
---

# نظام التصميم

> **تحذير لأي أداة تنفيذ:** لا تخترع Design System جديداً لأي شاشة. إذا احتجت قيمة غير موجودة هنا (لون، مسافة، خط)، توقف واسأل بدل الاختراع.

---

## 1. الفلسفة العامة — Evidence: `CONSTITUTION` §21, `ACCEPTED`

```
❌ نرفض: نمط أمازون/نون (ألوان صاخبة، ازدحام بصري، تصميم إدماني)
✅ نبني: نمط آبل/إيكيا/كوستكو (مساحات تنفّس، تنسيق منتقى، هدوء بصري)
```

- ألوان هادئة (Pastel)، مساحات بيضاء، أقل عدد ممكن من العناصر في كل شاشة.
- "مشاهد حياة" لا "كتالوج منتجات باردًا".
- حركات وانتقالات ناعمة وبطيئة — بلا وميض أو اهتزاز.

---

## 2. 🟡 الألوان — Evidence: `PROPOSED` (قيم دقيقة غير مؤكدة نهائياً)

الدستور (§21) يذكر قيماً محددة من عمل سابق على ريف المدينة:
```
أخضر أساسي: #2D6A4F
برتقالي ثانوي: #F4845F
```
لكن الدستور نفسه يصفها كـ"نقطة انطلاق قابلة للتعديل"، وفي محادثات لاحقة تحدث المؤسس عن "ألوان باستيلية بستايل آبل" دون أرقام محددة. **لا تعارض صريح، لكن الحسم غير نهائي.**

**الحالة الرسمية لهذا الملف:** الاتجاه العام (هادئ، آبل/إيكيا/كوستكو) = `ACCEPTED`. القيم الدقيقة (Hex codes) أعلاه = `PROPOSED` فقط، قابلة للتعديل عند بدء العمل الفعلي على التصميم (بعد اليوم 7 من §23).

**تحديث 2026-09-01:** هاتان القيمتان (أخضر/برتقالي) أصبحتا الآن `IMPLEMENTED` فعلياً في واجهة متجر ريف المدينة (Next.js 16، commit `2de9345`، راجع `ADR-006` في `docs/DECISIONS.md`). القيمتان لم تعودا نقطة انطلاق نظرية فقط، بل واقع كود قائم — أي تعديل عليهما الآن "تغيير" لا "حسم أول". لمعمارية الألوان الكاملة عبر كل العوالم (لا ريف فقط)، راجع **§8 أدناه**.

---

## 3. Typography — Evidence: `PROPOSED`

خطوط عربية مذكورة سابقاً في عمل تصميمي مرجعي: Tajawal / Cairo. **لم تُعتمد رسمياً بعد لسلسبيل تحديداً** — `PROPOSED`.

---

## 4. الهوية البصرية المرجعية — Evidence: `PROPOSED`

من عمل سابق على "ريف المدينة": طابع زجاجي (Glass Morphism)، مكوّنات بأسلوب iOS. **نقطة انطلاق موثَّقة، ليست قراراً نهائياً.**

---

## 5. معمارية الواجهات المتعددة (Stem Cell UI) — Evidence: `CONSTITUTION` §30.2, `PROPOSED` تقنياً

```
أوضاع الشاشة الرئيسية المخطَّطة:
├── وضع "منشورات" (Feed)
├── وضع "ريلز" (Reels) — افتراضي على الموبايل
├── وضع "بسيط لكبار السن"
└── ثيمات مخصصة (طلبة، بنات، إلخ)
```

**تمييز مهم موثَّق في الدستور:** تبديل طريقة العرض = بسيط ورخيص (إعداد شخصي). التعقيد الحقيقي في نوع المحتوى نفسه (الفيديو القصير) لا في وجود الزر (`CONSTITUTION §30.2`, §32.2). **لا شيء من هذا مُنفَّذ بعد.**

> **ملاحظة تمييزية مهمة (2026-09-01):** §5 هنا يتحدث عن تبديل **طريقة العرض** (Feed/Reels/بسيط) داخل نفس العالم لنفس المستخدم. أما **§8 أدناه** فيتحدث عن شيء مختلف تماماً: الهوية البصرية (الألوان) لكل **عالم** (ريف مقابل أسراب مقابل نبض...). الاثنان يستخدمان نفس الآلية التقنية (تبديل عبر سمة/Attribute + CSS Variables) لكنهما قراران منفصلان — لا تخلط بينهما عند التنفيذ.

---

## 6. عناصر غير محسومة بعد — `OPEN_QUESTION`

هذه العناصر مطلوبة في القالب الأصلي للملف لكن **لا معلومة عنها في الدستور أو المحادثات حتى الآن** — لا تُخترَع:

- Spacing system الدقيق (8px grid أم غيره؟)
- Border radius القياسي
- Shadows / Elevation levels
- تصميم البطاقات (Cards) — لا مرجع بصري دقيق بعد
- Buttons / Inputs — لا مواصفات دقيقة
- Bottom navigation / Bottom sheets — لا تصميم بعد
- Skeletons / Loading states / Empty states / Error states — لا تصميم بعد
- Accessibility guidelines — لم تُناقَش بعد
- **مكتبة الأيقونات الفعلية (Lucide / Phosphor / Heroicons أو غيرها)** — لم تُحسم؛ راجع §8.4 أدناه للمفاهيم الرمزية الوصفية فقط
- **Dark Mode لكل عالم** — لم يُطلب بعد، معمارية §8 لا تمنعه مستقبلاً لكنه خارج نطاق هذا التحديث

**قاعدة صريحة:** كل هذه القرارات تُتخذ عند بدء العمل الفعلي على واجهة المستخدم (بعد اليوم 5-7 من §23) — لن تُخترع الآن لمجرد ملء هذا الملف.

---

## 7. RTL و Mobile-First — Evidence: `IMPLEMENTED` (الإعداد التقني + مكوّنات حقيقية فعلية منذ اليوم 5)

Next.js مُعَدّ باتجاه RTL افتراضي (`SALSABIL_CONSTITUTION.md §9`). **تصحيح (اليوم 14-16):** الجملة السابقة هنا ("لا مكونات واجهة حقيقية موجودة حتى الآن") كانت دقيقة وقت كتابتها (اليوم 6) لكنها أصبحت بالية — عشرات المكوّنات الحقيقية موجودة الآن (`CategoryCard`, `ProductCard`, `ProductOptions`, `CheckoutForm`, `OrderRow`, `MerchantLoginForm`, `AdminLoginForm`, `AdminMerchantRow`, `Header`)، كلها تتّبع RTL عبر Flexbox القياسي (`justify-between` يعكس ترتيب العناصر تلقائياً مع `dir="rtl"` بلا حاجة لـ`flex-row-reverse` صريح — مُتحقَّق منه حياً في `Header.tsx`، أول مكوّن تنقّل موحّد عبر كل صفحات `(reef)`). Mobile-first كتوجه عام (§32.3) يبقى غير مُختبَر صراحة على مقاسات شاشة متعددة حتى الآن — لا يزال `OPEN_QUESTION` عملياً، لا `IMPLEMENTED`.

---

## 8. معمارية الثيمات متعددة العوالم (Multi-World Theming Architecture) — Evidence: `FOUNDER_DECISION` (الاتجاه المعماري)، `IMPLEMENTED` (الآلية التقنية، اليوم 6)، `PROPOSED` (لا يزال — اعتماد المؤسس الرسمي لقيم 5 العوالم غير المبنية بعد)

> مصدر هذا القسم: محادثة "04 — UI/UX & Design Engine"، 2026-09-01. القرار المعماري (طبقتان من المتغيرات + بلا هاردكود لوني في `/src/components`) صادر مباشرة عن المؤسس = `FOUNDER_DECISION`. القيم الدقيقة (Hex) هي اقتراح معماري من Claude بناءً على طبيعة كل عالم = `PROPOSED`، بانتظار اعتماد المؤسس. راجع `ADR-007` في `docs/DECISIONS.md` للقرار الكامل بصيغة ADR — **الآلية نُفِّذت فعلياً اليوم 6 قبل تغيير حالة ADR-007 رسمياً من PROPOSED (نفس نمط ADR-006: التنفيذ سبق الاعتماد الرسمي) — تغيير حالة ADR-007 نفسه قرار المؤسس وحده، لم يُغيَّر هنا.**

### 8.1 المبدأ الحاكم

**لا هاردكود لوني في `/src/components` أبداً.** كل مكوّن مشترك محايد تماماً، ولا يعرف أي عالم يعمل بداخله. اللون يصل إليه فقط عبر CSS Variables دلالية (Semantic Tokens). هذا امتداد مباشر لمبدأ الخلايا الجذعية (`CONSTITUTION §4, §8`) على طبقة الواجهة.

### 8.2 طبقتا الـ Tokens

```
الطبقة 1 — Primitive Tokens (خام، خاصة بكل عالم)
  مثال: --reef-green-600: #2D6A4F;  --reef-orange-500: #F4845F;
  لا تُستخدم مباشرة في أي مكوّن.

الطبقة 2 — Semantic Tokens (دلالية، هي فقط ما يستهلكه /src/components)
  --background / --foreground
  --card / --card-foreground
  --primary / --primary-foreground
  --secondary / --secondary-foreground
  --accent / --accent-foreground
  --muted / --muted-foreground
  --border
  --destructive / --destructive-foreground   ← مشتركة عبر كل العوالم، لا تُخصَّص (خطأ يجب أن يُقرأ كخطأ في أي عالم)
```

**ملاحظة تقنية — Evidence: `IMPLEMENTED` (تحقَّق منه فعلياً اليوم 6):** `shadcn/ui` **غير مثبّتة** في هذا المشروع — لا `components.json` في جذر المستودع، `src/components/ui/` فارغ فعلياً (لا ملفات)، لا `class-variance-authority`/`clsx`/`cn()` في أي مكان. سُجِّل كـ `CONFLICT-005` في `docs/DECISIONS.md` كما طلب موجّه اليوم 6. استُخدمت لذلك الأسماء القياسية بادئة `--sb-` بصيغة Hex مباشرة (لا HSL)، مربوطة بأسماء Tailwind القياسية (`bg-primary`, `text-foreground`...) عبر `@theme inline` في `globals.css` — راجع `docs/ARCHITECTURE.md §2.1` للتفصيل التقني الكامل (بما فيه خطأ `@theme` العادية الذي وقع وأُصلح فعلياً أثناء التنفيذ).

### 8.3 آلية التبديل

كل عالم = سمة `data-world="<slug>"` على العنصر الجذر لذلك القسم من الشجرة (وليس على `<html>` كلياً، لأن ديوان قد يحتضن أكثر من عالم داخل نفس الجلسة عبر التنقل). كل سمة `data-world` تعيد تعريف قيم الطبقة 2 فقط. المكوّنات نفسها لا تتغير سطراً واحداً بين عالم وآخر.

**التخصيص لكل مستأجر (Tenant) — Evidence: `PROPOSED`، امتداد لنمط `ADR-004`:** نفس نمط JSONB المعتمد لخيارات المنتج (`products.options`) يُقترَح لاحقاً لعمود `theme_overrides` على جدول المستأجر (`merchants`/`stores`، غير موجود بعد — راجع `DOMAIN_MAP.md → Tenant/Authorization`)، يُحقَن كقيم Inline Style على نفس متغيرات الطبقة 2 فوق ثيم العالم الافتراضي. **هذا الجزء تصميم جاهز للمستقبل فقط — لا يُبنى في اليوم 6.**

### 8.4 لوحات الألوان المقترحة لكل عالم — `PROPOSED`، بانتظار اعتماد المؤسس

جميع القيم أدناه Light Mode فقط (Dark Mode خارج النطاق — راجع §6). الرمز الوصفي عمداً "مفهوم" لا اسم مكتبة أيقونات محدد (راجع §6).

#### ديوان سلسبيل (Diwan) — الغلاف الرئيسي ولوحة التحكم — `slug: diwan` — Evidence: `IMPLEMENTED` (اليوم 6 — الافتراضي على `<html>` في `src/app/layout.tsx`؛ لا شاشة/لوحة تحكم فعلية بعد تستهلكه غير الغلاف نفسه)

القيمة النفسية: السيادة، الأمان، الهدوء الملكي. لافندر وأرجواني ملكي هادئ كما حدده المؤسس.

| Token | Hex |
|---|---|
| background | #FAF8FD |
| foreground | #241B3D |
| card | #FFFFFF |
| card-foreground | #241B3D |
| primary | #5B3E96 |
| primary-foreground | #FFFFFF |
| secondary | #E4D9F5 |
| secondary-foreground | #3D2463 |
| accent | #8B6DC7 |
| accent-foreground | #FFFFFF |
| muted | #F1ECFA |
| muted-foreground | #6E6285 |
| border | #E4DCF2 |

رمز مقترح: قوس/محراب مبسّط أو "ختم" دائري — يرمز لديوان كمجلس/غلاف جامع.

#### ريف المدينة (Reef) — `slug: reef` — Evidence: `IMPLEMENTED` (القيم والتوكنز الدلالية معاً، اليوم 6 — `[data-world="reef"]` مطبَّقة فعلياً على `src/app/(reef)/layout.tsx`)

القيمة النفسية: الحياة اليومية، الغذاء، النماء المستمر. **القيم هنا ثابتة (لا تُغيَّر) لأنها منفَّذة فعلياً في الكود — التوكنز الدلالية أدناه إعادة تغليف لنفس القيم، لا استبدال لها.**

| Token | Hex |
|---|---|
| background | #FAFBF7 |
| foreground | #1F2E24 |
| card | #FFFFFF |
| card-foreground | #1F2E24 |
| primary | #2D6A4F |
| primary-foreground | #FFFFFF |
| secondary | #F4845F |
| secondary-foreground | #FFFFFF |
| accent | #F4A65F |
| accent-foreground | #2E1B0F |
| muted | #EEF3EC |
| muted-foreground | #5B6D5F |
| border | #E3EDE6 |

رمز مقترح: سنبلة قمح أو ورقة نبتة — الاستهلاك اليومي والزراعة.

#### أسراب (Asrab) — `slug: asrab`

القيمة النفسية: القرارات الكبرى، الرحلة (حج/عمرة)، الثقة طويلة المدى، الأصول الثمينة. أخضر مزرق عميق (ثبات ووقار، يميّزها عن أخضر ريف اليومي) + ذهبي دافئ (قيمة، أصول ثمينة).

| Token | Hex |
|---|---|
| background | #F8F7F2 |
| foreground | #1E2620 |
| card | #FFFFFF |
| card-foreground | #1E2620 |
| primary | #1B4B43 |
| primary-foreground | #FFFFFF |
| secondary | #C9A15D |
| secondary-foreground | #2E2107 |
| accent | #E4C88A |
| accent-foreground | #2E2107 |
| muted | #F0EEE3 |
| muted-foreground | #5C6A5E |
| border | #E3DFC9 |

رمز مقترح: سرب طيور بتشكيل V — المعنى الحرفي لكلمة "سرب" (تحرّك جماعي نحو وجهة)، يناسب الحج والانتقالات الكبرى معاً.

#### نبض (Nabdh) — `slug: nabdh`

القيمة النفسية: الثقة الطبية، الهدوء، الحيوية. أزرق مخضر طبي هادئ (لا رمادي بارد)، مع أحمر مرجاني دافئ كلون تنبيه فقط (نبض/طوارئ)، لا كخلفية.

| Token | Hex |
|---|---|
| background | #F6FAFA |
| foreground | #1C2B2A |
| card | #FFFFFF |
| card-foreground | #1C2B2A |
| primary | #2F7A78 |
| primary-foreground | #FFFFFF |
| secondary | #E8646B |
| secondary-foreground | #FFFFFF |
| accent | #9FD4D1 |
| accent-foreground | #143332 |
| muted | #EAF4F3 |
| muted-foreground | #5A7472 |
| border | #DCEBEA |

رمز مقترح: خط نبض (ECG) — حرفي وعالمي الفهم.

**تنبيه:** `secondary` هنا (المرجاني) يُستخدم فقط لمؤشرات حيوية/تنبيهات داخل نبض تحديداً — لا يُستخدم كلون واجهة عام واسع الانتشار، حفاظاً على الهدوء البصري (§1).

#### نور الدين (Noor Al-Din) — `slug: noor`

القيمة النفسية: النور، المعرفة، التركيز. أزرق نيلي عميق (تركيز/ليل الدراسة) + ذهبي فاتح (النور — إحالة لمعنى الاسم نفسه ولمشكاة النور).

| Token | Hex |
|---|---|
| background | #F7F8FB |
| foreground | #1B2438 |
| card | #FFFFFF |
| card-foreground | #1B2438 |
| primary | #24406B |
| primary-foreground | #FFFFFF |
| secondary | #E8A33D |
| secondary-foreground | #2E1F04 |
| accent | #F0C878 |
| accent-foreground | #2E1F04 |
| muted | #EEF1F7 |
| muted-foreground | #58627A |
| border | #DCE2ED |

رمز مقترح: فانوس/مشكاة مضيئة — إحالة مباشرة لمعنى "نور".

#### تكوين (Takween) — `slug: takween`

القيمة النفسية: البناء، الدقة، الطابع التقني. رمادي غرافيتي محايد (هيكلة) + أزرق نيلي كهربائي (دقة رقمية).

| Token | Hex |
|---|---|
| background | #F6F7F9 |
| foreground | #1E222B |
| card | #FFFFFF |
| card-foreground | #1E222B |
| primary | #3B4252 |
| primary-foreground | #FFFFFF |
| secondary | #5B6EF5 |
| secondary-foreground | #FFFFFF |
| accent | #A9B3F5 |
| accent-foreground | #232A4D |
| muted | #ECEDF1 |
| muted-foreground | #5C6270 |
| border | #E1E4EA |

رمز مقترح: مكعبات/وحدات متشابكة — "تكوين" = تركيب وحدات بناء (يتردد أيضاً مع معنى "الخلايا الجذعية" نفسه).

#### بيان (Bayan) — `slug: bayan`

القيمة النفسية: التعبير، التواصل، الانفتاح — بلا صخب (لا نمط أمازون/نون رغم أن هذا عالم "المحتوى"). تراكوتا/مرجاني مطفّى دافئ (تعبير إنساني) + أزرق سماوي فاتح (انفتاح/بث/وصول).

| Token | Hex |
|---|---|
| background | #FBF7F5 |
| foreground | #2B211D |
| card | #FFFFFF |
| card-foreground | #2B211D |
| primary | #C97B5F |
| primary-foreground | #FFFFFF |
| secondary | #5FA8C9 |
| secondary-foreground | #FFFFFF |
| accent | #E8B8A2 |
| accent-foreground | #2E1D14 |
| muted | #F4EAE6 |
| muted-foreground | #6E5C54 |
| border | #EFDFD8 |

رمز مقترح: فقاعة حوار بموجات بث، أو ريشة قلم عربي (بيان = بلاغة/فصاحة أيضاً في المعنى اللغوي).

### 8.5 ملاحظة حوكمة صريحة

جدول `DOMAIN_MAP.md → OPEN_QUESTION-001` لا يزال مفتوحاً بخصوص هل خليل/حكيم/برق/تيسير/بيان "عوالم" أم "محركات نواة". تصميم هوية بصرية مستقلة لـ"بيان" هنا **لا يحسم** ذلك السؤال رسمياً لبقية الأربعة — راجع الملاحظة المضافة في `docs/DECISIONS.md` تحت `CONFLICT-001`.