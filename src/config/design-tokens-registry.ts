// src/config/design-tokens-registry.ts
// السجل المركزي للقيم الفيزيائية الخام (Physical Design Tokens) — نصف الأقطار، الظلال، منحنيات
// الحركة، ومعطيات الطباعة/المسافات — نفس نمط theme-registry.ts (سجل بيانات، لا هاردكود inline داخل
// أي مكوّن). يُغلق هذا الملف جزئياً OPEN_QUESTION المسجَّل في docs/UI_UX_SYSTEM.md §6 ("Spacing
// system الدقيق؟"، "Border radius القياسي؟"، "Shadows / Elevation levels؟") — استخراج حرفي من مرجع
// Lovable (D:\temp\reefam-lovable-reference، src/styles.css) لا اختراع، بمهمة
// EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS (2026-09-08).
//
// ⚠️ الفرق الجوهري عن theme-registry.ts: هذا الملف لا يتغيّر بتغيّر [data-world] — القيم هنا "لغة
// فيزيائية" واحدة (مدى الاستدارة، عمق الظل، سرعة الحركة) تشترك فيها كل العوالم، بعكس الألوان
// (Semantic Tokens) التي تتغيّر لكل عالم. القيم التي يجب أن تتفاعل مع لون العالم النشط (مثال:
// shadow-pill مُلوَّن بلون العالم) مبنية عبر `var(--sb-primary)` مباشرة — لا Hex مباشر — لتبقى واعية
// بأي [data-world] تلقائياً بلا تخصيص هنا.
//
// ⚠️ نطاق التطبيق — تحديث (المرحلة 2، 2026-09-08، قرار مؤسس مباشر): RADIUS_SCALE لم تعد بيانات
// خاملة بانتظار الاستهلاك — طُبِّقت فعلياً وحرفياً على `--radius`/`--radius-sm..3xl` القياسية في
// src/app/globals.css (تغيير عالمي شامل، يمس كل عنصر `rounded-*` في التطبيق بأكمله، لا شاشات
// (reef) الجديدة فقط — AGENTS.md §13، مُعلَن صراحة لا صامت). SHADOW_SCALE/GLASS_SURFACE/
// MOTION_EASING تبقى بيانات إضافية موازية (--sb-shadow-*/--sb-ease-*) — لا مستهلك حي عالمي بعد،
// جاهزة للاستخدام في شاشات المرحلة 2. القيم الفعلية الكاملة في src/app/globals.css تحت تعليق
// "DESIGN TOKENS — EXTRACT-DESIGN-DNA" — يجب أن يبقى الملفان متطابقين، نفس عُرف theme-registry.ts.

/** نصف قطر الاستدارة — سلسلة تراكمية (Additive Scale)، استخراج حرفي من --radius + الحسابات
 *  المرتبطة به في مرجع Lovable (src/styles.css §"--radius: 1.5rem"، وتعليق @theme calc(var(--radius)
 *  ± Npx)). القيمة الأساس في المرجع نفسه لها متغيّران: 1.5rem (الثيم الافتراضي "sage" + معظم الثيمات
 *  الجادة: ocean/amber/midnight/plum/navy) و1.75rem (الثيمات الباستيلية الأنثوية الأربعة:
 *  blush/lavender/mint/peach). عالم ريف عندنا (أخضر) أقرب دلالياً لعائلة "sage" الجادة — لذا
 *  `base` هنا يعكس 1.5rem، و`baseSoft` (1.75rem) محفوظة كخيار بديل موثَّق لأي ثيم/عالم مستقبلي أكثر
 *  "أنثوية/دافئة" (مثال محتمل مستقبلاً: reef-lavender الحالي يستخدم ألوان lavender الحقيقية من
 *  المرجع لكن دون هذا التحول في نصف القطر بعد — فجوة موثَّقة، لا قرار بتطبيقه الآن).
 *  ⚠️ **مُطبَّقة فعلياً الآن** حرفياً على `--radius`/`--radius-sm..3xl` القياسية في globals.css —
 *  ليست بيانات موازية بادئتها `--sb-` (أُزيلت عمداً لتفادي تكرار مصدر الحقيقة). */
export interface RadiusScale {
  /** القيمة الأساس (rem) التي تُشتَق منها كل الدرجات أدناه. */
  base: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
}

export const RADIUS_SCALE: RadiusScale = {
  base: '1.5rem',
  sm: '1.25rem', // base - 4px
  md: '1.375rem', // base - 2px
  lg: '1.5rem', // = base
  xl: '1.75rem', // base + 4px
  '2xl': '2rem', // base + 8px
  '3xl': '2.25rem', // base + 12px
};

/** نسخة "أدفأ" من سلسلة الاستدارة — نفس الصيغة الإضافية لكن أساسها 1.75rem (ثيمات
 *  blush/lavender/mint/peach في المرجع). موثَّقة للاستخدام المستقبلي فقط — لا مستهلك حي اليوم. */
export const RADIUS_SCALE_SOFT: RadiusScale = {
  base: '1.75rem',
  sm: '1.5rem',
  md: '1.625rem',
  lg: '1.75rem',
  xl: '2rem',
  '2xl': '2.25rem',
  '3xl': '2.5rem',
};

/** الظلال — استخراج حرفي من --shadow-* في مرجع Lovable. القيم المحايدة (soft/tile/float) بصيغة
 *  hsl(...) حرفية كما وردت في المرجع (لا تعتمد على عالم مُعيَّن). القيم "المُلوَّنة بالعالم"
 *  (pill/tinted/glow) أُعيد بناؤها عمداً عبر `var(--sb-primary)` (توكن سلسبيل الدلالي القائم) بدل
 *  Hex ثابت من المرجع (كان `hsl(142 50% 30%)` — أخضر ريف تحديداً) — هذا هو "إعادة البناء فوق بنيتنا"
 *  المطلوبة في موجّه المهمة، لا نسخاً حرفياً: نفس *النمط* (ظل بلون العلامة التجارية بشفافية 35%)
 *  لكن يتبع تلقائياً أي [data-world] نشط بدل التجمّد على أخضر ريف وحده. */
export interface ShadowScale {
  soft: string;
  tile: string;
  float: string;
  /** ظل مُلوَّن بلون العالم النشط — يستخدم var(--sb-primary) فيتكيّف تلقائياً مع أي [data-world]. */
  pill: string;
  /** نفس مبدأ pill لكن أعمق/أوسع انتشاراً — لبطاقات مرتفعة (Hero/Elevated Cards). */
  tinted: string;
  /** توهّج نابض خفيف — لعناصر تنبيه/تمييز حي (مثال محتمل: شارة "جديد"، نقطة حالة). */
  glow: string;
}

export const SHADOW_SCALE: ShadowScale = {
  soft: '0 1px 2px hsl(150 20% 20% / 0.04), 0 8px 24px -8px hsl(150 25% 25% / 0.10)',
  tile: '0 2px 4px hsl(150 20% 20% / 0.05), 0 24px 48px -16px hsl(142 40% 25% / 0.18)',
  float: '0 8px 32px hsl(150 30% 15% / 0.18), 0 2px 6px hsl(150 25% 20% / 0.08)',
  pill: '0 6px 20px -4px hsl(var(--sb-primary) / 0.35)',
  tinted: '0 10px 30px -10px hsl(var(--sb-primary) / 0.35)',
  glow: '0 0 20px hsl(var(--sb-primary) / 0.3)',
};

/** سطح زجاجي (Glass Morphism) — استخراج حرفي من .glass/.glass-strong في مرجع Lovable. القيمتان
 *  اللونيتان هنا محايدتان (تعتمد على --sb-card/--sb-border الحاليين لا لون ثابت) — نفس مبدأ عدم
 *  الهاردكود اللوني (docs/UI_UX_SYSTEM.md §8.1) مطبَّقاً على طبقة السطوح لا الألوان فقط. */
export interface GlassSurface {
  /** شفافية خلفية البطاقة (0-1) فوق --sb-card. */
  backgroundOpacity: number;
  /** مقدار blur (px) — CSS backdrop-filter: blur(Npx) saturate(180%). */
  blurPx: number;
  /** شفافية الحد (border) فوق --sb-border. */
  borderOpacity: number;
}

export const GLASS_SURFACE: GlassSurface = { backgroundOpacity: 0.85, blurPx: 24, borderOpacity: 0.6 };
/** نسخة أكثف (أقل شفافية) — لعناصر تحتاج وضوح نص أعلى فوق خلفية مزدحمة (مثال: Header ثابت). */
export const GLASS_SURFACE_STRONG: GlassSurface = { backgroundOpacity: 0.96, blurPx: 32, borderOpacity: 0.7 };

/** منحنيات الحركة (Easing Curves) — استخراج حرفي. `apple` هو المنحنى الأساسي المستخدم في كل
 *  انتقالات المرجع تقريباً (--ease-apple). `spring` منحنى "قفزة" أخف استُخرِج من طبقة utilities
 *  الإدارية في نفس الملف (.transition-spring) — يُستخدم فقط لحركات "بروز" قصيرة (إضافة عنصر، ظهور
 *  Badge)، لا للانتقالات العامة (لا يخالف "بلا Framer Motion" — كلاهما CSS cubic-bezier خالص). */
export interface MotionEasing {
  apple: string;
  spring: string;
}

export const MOTION_EASING: MotionEasing = {
  apple: 'cubic-bezier(0.32, 0.72, 0, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

/** نتيجة فحص Typography/Spacing في المرجع — لا Tailwind config منفصل هناك (Tailwind v4، CSS-first
 *  عبر @import "tailwindcss" فقط)، ولا @theme تخصيص لمقياس الخط أو المسافات إطلاقاً — كلاهما مقياس
 *  Tailwind الافتراضي (شبكة 4px للمسافات، سلسلة text-xs..text-9xl القياسية للخط) بلا أي قيمة مخصَّصة
 *  مكتشَفة. هذا يُغلِق OPEN_QUESTION (UI_UX_SYSTEM.md §6) بالنتيجة السلبية نفسها: **لا مقياس مسافات
 *  مخصَّص موجود للاستخراج — القرار الفعلي المكتشَف هو استخدام Tailwind الافتراضي كما هو، لا اختراع
 *  مقياس 8px أو غيره.** الخط: أسرة الخط الوحيدة المُطبَّقة فعلياً هي `'Tajawal', 'Cairo', system-ui`
 *  (body font-family حرفياً في المرجع). ⚠️ **مُطبَّقة فعلياً الآن عندنا أيضاً** (المرحلة 2،
 *  2026-09-08، قرار مؤسس مباشر) — `next/font/google` في src/app/layout.tsx (متغيّرا
 *  `--font-tajawal`/`--font-cairo`) + `--font-sans` في globals.css. كانت PROPOSED
 *  (docs/UI_UX_SYSTEM.md §3) منذ اليوم 6 — الآن IMPLEMENTED. لا وزن خط (font-weight) مخصَّص مكتشَف
 *  خارج default/medium/semibold/bold القياسية لـ Tailwind. */
export const TYPOGRAPHY_EXTRACTION_FINDING = {
  customSpacingScaleFound: false,
  customFontSizeScaleFound: false,
  fontFamily: "'Tajawal', 'Cairo', system-ui, -apple-system, sans-serif",
  status: 'IMPLEMENTED' as const,
  note:
    'لا مقياس مسافات/خط مخصَّص في المرجع (Tailwind الافتراضي كما هو). أسرة الخط (Tajawal/Cairo) مُطبَّقة فعلياً عبر next/font/google منذ 2026-09-08 — راجع src/app/layout.tsx وdocs/UI_UX_SYSTEM.md §3.',
} as const;
