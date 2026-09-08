---
title: نظام التصميم (Design System)
status: PROPOSED (الاتجاه العام + معمارية الثيمات متعددة العوالم §8 ACCEPTED من حيث المبدأ ومُنفَّذة تقنياً لديوان/ريف، القيم الدقيقة للألوان و5 العوالم الأخرى لا تزال PROPOSED؛ محور التفضيل الشخصي §8.6 IMPLEMENTED كاملاً بمستهلك واجهة حقيقي، BAYAN-CLOSEOUT-UI-GAPS؛ Responsive §7 IMPLEMENTED لخلاصة بيان تحديداً، اليوم 31؛ §9 ملخّص أنماط دفعة بيان المُغلَقة بالكامل + BottomNav)
version: 1.11
last_updated: 2026-09-08
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

- ~~Spacing system الدقيق (8px grid أم غيره؟)~~ **مُغلَق جزئياً (2026-09-08،
  `EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS`):** فحص مباشر لمرجع Lovable
  (`D:\temp\reefam-lovable-reference`) لم يجد أي مقياس مسافات مخصَّص — Tailwind الافتراضي (شبكة 4px)
  كما هو، بلا تخصيص. النتيجة موثَّقة في `src/config/design-tokens-registry.ts` →
  `TYPOGRAPHY_EXTRACTION_FINDING`. **هذا لا يعني "لا قرار" — يعني القرار الفعلي المكتشَف هو عدم وجود
  تخصيص، لا حاجة لاختراع مقياس جديد.**
- ~~Border radius القياسي~~ **مُغلَق (2026-09-08):** سلسلة استدارة تراكمية (Additive Scale) مُستخرَجة
  حرفياً من `--radius` في المرجع (أساس `1.5rem` + `sm/md/lg/xl/2xl/3xl` بفوارق ±px ثابتة) —
  `src/config/design-tokens-registry.ts` → `RADIUS_SCALE` (+ `RADIUS_SCALE_SOFT` بديل بأساس
  `1.75rem` للثيمات الباستيلية الأكثر "أنثوية"، غير مُطبَّق افتراضياً). القيم كـ CSS Custom
  Properties إضافية بحتة (`--sb-radius-*`) في `src/app/globals.css` — **لم تُستبدَل** سلسلة
  `--radius-*` الحالية المولَّدة من shadcn init، إضافة موازية جاهزة للاستخدام في شاشات جديدة فقط.
- ~~Shadows / Elevation levels~~ **مُغلَق (2026-09-08):** سلسلة ظلال مُستخرَجة حرفياً من `--shadow-*`
  في المرجع — `src/config/design-tokens-registry.ts` → `SHADOW_SCALE` (+ `GLASS_SURFACE`/
  `GLASS_SURFACE_STRONG` لسطح Glass Morphism، §4 أعلاه). القيم "المُلوَّنة بالعالم" (`pill`/`tinted`/
  `glow`) أُعيد بناؤها عبر `var(--sb-primary)` بدل تجميدها على أخضر ريف كما في المرجع — تتكيّف تلقائياً
  مع أي `[data-world]` نشط. مُضافة كـ `--sb-shadow-*`/`.sb-glass*` في `src/app/globals.css`، إضافية بحتة.
- تصميم البطاقات (Cards) — لا مرجع بصري دقيق بعد
- Buttons / Inputs — لا مواصفات دقيقة
- Bottom navigation — لا تصميم بعد. **Bottom sheets تحديداً: تحديث (اليوم 25-26):** `src/components/BottomSheet.tsx` مكوّن عام `IMPLEMENTED` فعلياً (فتح/إغلاق بالزر/الخلفية/`Escape`)، بأول استخدام حي حقيقي (اختيار عنوان في `FeedTopBar.tsx`، اليوم 26). التصميم الدقيق (radius `rounded-t-2xl`, `shadow-xl`) امتداد للأنماط القائمة أصلاً لا قرار جديد رسمي — لا يُعتبَر هذا حسماً شاملاً لكل استخدامات Bottom Sheet مستقبلية، فقط أول نمط حي يُرجَع إليه.
- Skeletons / Loading states / Empty states / Error states — لا تصميم بعد (تحديث 2026-09-08: نمط
  حركة اللمعان فقط — لا شكل Skeleton نفسه — متاح الآن عبر `src/config/animation-registry.ts` →
  `shimmerSlide`/`.animate-sb-shimmer`؛ هذا لا يُغلِق الفجوة، فقط جزء "الحركة" منها)
- Accessibility guidelines — لم تُناقَش بعد
- **مكتبة الأيقونات الفعلية (Lucide / Phosphor / Heroicons أو غيرها)** — لم تُحسم رسمياً، لكن **`lucide-react` أصبح النمط الفعلي القائم** (`Header.tsx` منذ اليوم 14، ثم `FeedTopBar.tsx` اليوم 26: `Globe`/`MapPin`/`Barcode`/`Search`/`ChevronDown`) — أي مكوّن جديد يحتاج أيقونة يجب أن يستخدم `lucide-react` لا مكتبة أخرى، تفادياً لتضارب بصري، إلى أن يصدر قرار مؤسس رسمي مغاير. راجع §8.4 أدناه للمفاهيم الرمزية الوصفية المستقلة عن مكتبة الأيقونات نفسها.
- **Dark Mode لكل عالم** — لم يُطلب بعد، معمارية §8 لا تمنعه مستقبلاً لكنه خارج نطاق هذا التحديث

**قاعدة صريحة:** كل هذه القرارات تُتخذ عند بدء العمل الفعلي على واجهة المستخدم (بعد اليوم 5-7 من §23) — لن تُخترع الآن لمجرد ملء هذا الملف.

---

## 7. RTL و Mobile-First — Evidence: `IMPLEMENTED` (الإعداد التقني + مكوّنات حقيقية فعلية منذ اليوم 5)

Next.js مُعَدّ باتجاه RTL افتراضي (`SALSABIL_CONSTITUTION.md §9`). **تصحيح (اليوم 14-16):** الجملة السابقة هنا ("لا مكونات واجهة حقيقية موجودة حتى الآن") كانت دقيقة وقت كتابتها (اليوم 6) لكنها أصبحت بالية — عشرات المكوّنات الحقيقية موجودة الآن (`CategoryCard`, `ProductCard`, `ProductOptions`, `CheckoutForm`, `OrderRow`, `MerchantLoginForm`, `AdminLoginForm`, `AdminMerchantRow`, `Header`)، كلها تتّبع RTL عبر Flexbox القياسي (`justify-between` يعكس ترتيب العناصر تلقائياً مع `dir="rtl"` بلا حاجة لـ`flex-row-reverse` صريح — مُتحقَّق منه حياً في `Header.tsx`، أول مكوّن تنقّل موحّد عبر كل صفحات `(reef)`). Mobile-first كتوجه عام (§32.3) يبقى غير مُختبَر صراحة على مقاسات شاشة متعددة حتى الآن — لا يزال `OPEN_QUESTION` عملياً، لا `IMPLEMENTED`. **تحديث (اليوم 26):** أول تحقُّق حي فعلي على Viewport موبايل حقيقي (390×844، `scripts/day26-feed-header-verify.ts`) — الصفحة الرئيسية تعمل صحيحاً على هذا المقاس تحديداً (RTL، تمرير أفقي فعلي لـ`HorizontalShelf`، `sticky` للتبويبات). هذا التحديث وحده لم يكن يُغلِق الـ`OPEN_QUESTION` — مقاس واحد فقط اختُبِر وقتها.

**تحديث (اليوم 31، Responsive Pass):** تخطيط `md:`/`xl:` حقيقي (لا Hardcode لمقاس واحد) طُبِّق على كل مكوّنات خلاصة بيان (`Feed`/`PostCard`/`HorizontalShelf`/`BottomSheet`/`WorldSwitcher`/`FeedTopBar`/`FeedTabBar`/`Header`) — عمود واحد على الموبايل، عمودان من `md` (768px)، 3 أعمدة من `xl` (1280px). تحقُّق حي كامل ودائم (`scripts/day31-responsive-verify.ts`، 25/25) على **ثلاثة** أحجام حقيقية (375×667، 768×1024، 1440×900): لا انسكاب أفقي، عدد أعمدة الشبكة صحيح على كل حجم، `BottomSheet`/`WorldSwitcher` يعملان بلا كسر بصري أو تراكب على أي حجم. **هذا يُغلِق الـ`OPEN_QUESTION` جزئياً فقط — لخلاصة بيان (`/`) تحديداً**: بقية صفحات `(reef)` (سلة، Checkout، صفحة منتج، تتبّع طلب، صفحة قسم) لا تزال غير مُختبَرة على مقاسات متعددة، خارج نطاق موجّه اليوم 31 صراحة (`Feed`/`Bayan` فقط). `OPEN_QUESTION` يبقى مفتوحاً لتلك الصفحات تحديداً.

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

**ملاحظة تقنية — Evidence: `IMPLEMENTED`:** `shadcn/ui` كانت **غير مثبّتة** في هذا المشروع منذ اليوم 6 (لا `components.json`، `src/components/ui/` فارغ، لا `class-variance-authority`/`clsx`/`cn()`) — سُجِّل حينها كـ `CONFLICT-005` في `docs/DECISIONS.md`. **تحديث 2026-09-07 (`ADR-025`):** أصبحت مثبَّتة فعلياً الآن (`npx shadcn@latest init`) — `CONFLICT-005` مُحدَّثة إلى `SUPERSEDED`. أسماء التوكنز الدلالية الأساسية لسلسبيل **لم تتغيّر** — تبقى بادئة `--sb-` بصيغة Hex مباشرة (لا HSL)، مربوطة بأسماء Tailwind القياسية (`bg-primary`, `text-foreground`...) عبر `@theme inline` في `globals.css`، وتبقى مصدر الحقيقة لكل عالم عبر `[data-world]` — راجع `docs/ARCHITECTURE.md §2.1`/`§13` وADR-025 للتفصيل الكامل لكيفية تعايش الطبقتين معاً.

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

### 8.6 محور التفضيل الشخصي للثيمات (Personal Theme Preference) — Evidence: `IMPLEMENTED` (اليوم 30، BAYAN-HOME-FEED-001)

**هذا أول تنفيذ فعلي لبند "ثيمات مخصصة (طلبة، بنات، إلخ)" الوارد في القائمة التخطيطية بـ§5 أعلاه —
لكن كتفضيل بصري خالص (ألوان + حجم خط)، لا كـ"طريقة عرض" (Feed/Reels/بسيط لكبار السن) التي تبقى
`PROPOSED` بلا كود بعد كما هي.** محور مستقل تماماً عن `WorldSlug`/`[data-world]` (§8.1-8.4 أعلاه):
الأول "أي عالم يتصفحه المستخدم"، هذا "أي تفضيل شخصي للألوان يريده هو نفسه" — لا تقاطع بينهما.

- **المصدر:** `src/config/personal-theme-registry.ts` (4 ثيمات — `masculine`/`feminine`/`youth`
  Pastel + `simplified` تباين أعلى وخط أكبر — × `light`/`dark` لكل منها = 8 تركيبات).
- **آلية التطبيق:** نطاق CSS Variables منفصل كلياً بادئة `--sb-pt-` (لا `--sb-` المستخدمة لـ
  `[data-world]`) على `html[data-personal-theme][data-personal-mode]` — **عمداً على `<html>` نفسها
  لا قسم فرعي**، بعكس `[data-world]` (§8.3، على جذر القسم لا `<html>` كلياً) لأن هذا تفضيل عام
  للمستخدم عبر كل التطبيق، لا خاص بعالم واحد. لو استُخدمت أسماء `--sb-` نفسها هنا لكسبها
  `[data-world]` المتداخل دائماً (معرَّفة مباشرة على عنصر أقرب) — بالضبط الخلط الممنوع.
- **التخزين:** `localStorage` فقط (`src/lib/personal-theme.ts`) — بلا عمود جديد على `users` (قرار
  مسبق، راجع `docs/CHANGELOG.md` اليوم 23). يُطبَّق عند التحميل عبر
  `src/components/PersonalThemeInitializer.tsx` (مُركَّب في `src/app/layout.tsx`).
  **قيد معروف مقبول:** فلاش قصير محتمل بين الرسمة الأولى (بلا السمتين) وتطبيق `useEffect` — لا
  كوكي SSR (نفس نتيجة حتمية لقرار localStorage-فقط)، مقبول لعدم وجود مستهلك واجهة حقيقي بعد.
- **نطاق مستبعَد صراحة يوم 30، مُغلَق لاحقاً (`BAYAN-CLOSEOUT-UI-GAPS`، 2026-09-06):** لم يكن هناك
  مكوّن UI لاختيار الثيم يوم 30 (بنية تحتية فقط، تحقُّق حي عبر صفحة معاينة مؤقتة + سكربت Playwright
  مؤقتان حُذفا بعد التأكد، نفس نمط اليوم 25). **الآن يوجد** — `src/components/PersonalThemeSheet.tsx`
  هو المستهلك الواجهة الحقيقي الأول (نقطة دخول وحيدة عبر صفحة `/account`، زر يفتح `BottomSheet.tsx`
  يعرض 4 ثيمات × فاتح/داكن، ينادي `persistPersonalTheme`/`persistPersonalMode` مباشرة). تحقُّق حي
  12/12 (`scripts/bayan-closeout-ui-gaps-verify.ts`) — راجع `docs/CHANGELOG.md` للتفصيل الكامل.

---

## 9. أنماط عامة مُنشأة عبر دفعة بيان (BAYAN-HOME-FEED-001، الأيام 23-32) — Evidence: `IMPLEMENTED`

ملخّص مرجعي سريع لأربعة أنماط/مكوّنات عامة صارت جزءاً من مفردات الواجهة القائمة بعد إغلاق الدفعة
كاملة (اليوم 32) — كل واحد بمسؤولية واحدة، لا تفاصيل مكرَّرة هنا (كل بند يُحيل لمصدره الكامل أعلاه
أو في `docs/CHANGELOG.md`):

| النمط/المكوّن | الملف | المسؤولية | أول استخدام حي | ملاحظة معمارية أساسية |
|---|---|---|---|---|
| رف أفقي عام | `src/components/HorizontalShelf.tsx` | تمرير أفقي بعنوان/رسالة فراغ اختياريين، لا يفرض شكل/عرض عناصره الداخلية | اليوم 26 (`StoryBar`)، ثم `PostCard`/`ReelsShelfPlaceholder` (27) | مكوّن واحد يخدم كل حالات "رف" في التطبيق (منتجات، أحياء، ريلز نائبة) بنفس الـAPI — لا تكرار |
| نافذة سفلية → Modal مُمركَز | `src/components/BottomSheet.tsx` | محتوى حر بالكامل (`children`)، لا حالة فتح/إغلاق داخلية (يديرها المستدعي) | اليوم 26 (عناوين وهمية)، ثم Product/Recipe (28) | `createPortal` إلى `document.body` (يوم 29، يتفادى فخ "containing block" لأي سلف بخاصية `transform`)؛ سفلي بعرض كامل على الموبايل → `md:max-w-lg` مُمركَز من `md` فصاعداً (يوم 31) |
| مبدّل بنمط Stories | `src/components/WorldSwitcher.tsx` | عرض دوائر Avatar بأنيميشن دخول/خروج، بيانات حقيقية عبر `khalilService.listActiveWorlds()` | اليوم 29 | نفس آلية `BottomSheet` (Portal + `md:`/`sm:` مُمركَز) — **مصدر النمط الذي نُقِل إلى `BottomSheet` لاحقاً في اليوم 31، لا العكس** |
| محور تفضيل شخصي مستقل | `src/config/personal-theme-registry.ts` + `src/lib/personal-theme.ts` + `src/components/PersonalThemeInitializer.tsx` | ثيمات شخصية (ألوان + حجم خط) مستقلة تماماً عن `WorldSlug`/`[data-world]` | اليوم 30 (راجع §8.6 أعلاه للتفصيل الكامل) | نطاق CSS منفصل كلياً (`--sb-pt-` لا `--sb-`) لمنع تصادم وراثة مع نظام العوالم — **لا مستهلك واجهة (UI اختيار) بعد** |

**مقياس عرض المحتوى الموحَّد** (اليوم 31، §7 أعلاه للتفصيل): `max-w-2xl` (موبايل) →
`md:max-w-4xl` (تابلت، عمودان) → `xl:max-w-6xl` (ديسكتوب، 3 أعمدة) — مُطبَّق حرفياً عبر
`Header.tsx`/`FeedTopBar.tsx`/`FeedTabBar.tsx`/`Feed.tsx`/`src/app/(reef)/page.tsx` معاً، أي مكوّن
جديد يحتاج مطابقة عرض الخلاصة يجب استخدام نفس السلسلة الثلاثية حرفياً لا قيماً مقارِبة.

**تحقُّق حي إجمالي عبر الدفعة (`docs/CHANGELOG.md` للتفصيل الكامل لكل رقم):** 8/8 (23) + 14/14
(24) + 10/10 (25) + 14/14 (26) + 11/11 (27) + 13/13 (28) + 8/8 (29) + 26/26 (30) + 25/25 (31) +
21/21 (32، E2E شامل لرحلة كاملة على حجمي هاتف/سطح مكتب) — راجع `docs/DOMAIN_MAP.md → بيان` للحالة
النهائية والنطاق المتبقي خارج هذه الدفعة صراحة.

**✅ تحديث (`BAYAN-CLOSEOUT-UI-GAPS`، 2026-09-06):** بندا `BottomNav`/UI اختيار الثيم الشخصي —
المذكوران أعلاه كنطاق متبقٍّ في نسخة سابقة من هذا القسم — أُغلقا الآن ببناء حقيقي:
`src/components/BottomNav.tsx` (4 وجهات: الرئيسية/الأقسام/طلباتي/حسابي، يستهلك `ScrollHideBar.tsx`
عبر `prop` جديد `edge="bottom"` لا إعادة بناء)، و`src/components/PersonalThemeSheet.tsx` (نقطة
الدخول الوحيدة لمحور §8.6، تستهلك `persistPersonalTheme`/`persistPersonalMode` القائمتين مباشرة).
تحقُّق حي 12/12 (`scripts/bayan-closeout-ui-gaps-verify.ts`). راجع `docs/CHANGELOG.md` للتفصيل
الكامل — **لا فجوة UI متبقية من كامل دفعة بيان بعد هذا الإغلاق.**

**✅ تحديث (`HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT` دفعة 1، 2026-09-07):**
`BottomNav.tsx` أُعيد بناؤه لخمسة وجهات (الرئيسية | التواصل | الأقسام | محفظة | ملفي) بدل الأربعة
أعلاه — بنية طلبها المؤسس مباشرة في موجّه المهمة (لم يُعثَر على نص مطابق حرفياً في
`SALSABIL_CONSTITUTION.md` وقت التنفيذ رغم إحالة الموجّه إليه؛ التكليف المباشر من المؤسس في نفس
المحادثة اعتُمد كموافقة صريحة، نفس سابقة `ADR-025` — راجع `CONFLICT-008` في `docs/DECISIONS.md`).
"التواصل" و"محفظة" أزرار بلا وجهة حقيقية بعد (لا دردشة، لا محفظة مبنيتان) — توست "قريباً" بنفس نمط
`WorldSwitcher.tsx`. **"طلباتي" لم تعد تبويباً مستقلاً** — قدرتها الحقيقية (تتبّع آخر طلب،
`src/lib/last-order.ts`) انتقلت إلى بطاقة `LastOrderCard.tsx` داخل صفحة `/account` (المُعاد تسميتها
"ملفي" في العنوان الظاهر). `Header.tsx` أُعيد بناؤه بصرياً فوق `Button` (`shadcn/ui`، `ADR-025`) —
نفس الوظائف الحقيقية القائمة (رابط السلة + عدّاده)، توكنز `--sb-*` فقط، بلا نظام ألوان موازٍ.