// src/config/animation-registry.ts
// السجل المركزي للحركات/الانتقالات — نفس نمط design-tokens-registry.ts وtheme-registry.ts (سجل
// بيانات، لا هاردكود). استخراج حرفي لأنماط الحركة من مرجع Lovable
// (D:\temp\reefam-lovable-reference، src/styles.css، @layer utilities) — بمهمة
// EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS (2026-09-08).
//
// قيد صارم غير قابل للتفاوض (docs/design/DESIGN_CONSTITUTION.md §4، docs/design/UX_RULES.md §3):
// **لا Framer Motion.** كل حركة هنا CSS @keyframes/transitions خالصة — إعادة بناء بنفس "الإحساس"
// (المدة، منحنى التسارع، نمط الحركة) لا نسخ مكتبة. المنحنيات المستخدمة مصدرها الوحيد
// design-tokens-registry.ts → MOTION_EASING (لا قيمة cubic-bezier مكرَّرة هنا).
//
// ⚠️ هذا الملف بيانات وصفية (توثيق + مرجع سريع لاسم الـclass) — الـ@keyframes الفعلية والـ
// utility classes المطابقة حرفياً لأسماء `className` أدناه مُضافة بشكل إضافي بحت (لا تُعدِّل أي
// حركة/انتقال موجود فعلياً في مكوّن حي — مثال: نبضة CartCapsule.tsx تبقى كما هي، آلية className
// مشروط مختلفة عمداً، هذا السجل يوفّر بديلاً جاهزاً لعناصر *جديدة* فقط) في src/app/globals.css تحت
// تعليق "ANIMATIONS — EXTRACT-DESIGN-DNA". يجب أن يبقى الملفان متطابقين.

import { MOTION_EASING } from './design-tokens-registry';

export interface AnimationDefinition {
  /** اسم الـ utility class الفعلي في globals.css — يُستخدَم حرفياً كـ className في JSX. */
  className: string;
  /** المدة بالمللي ثانية. */
  durationMs: number;
  /** منحنى التسارع — دائماً من MOTION_EASING، لا قيمة حرة. */
  easing: string;
  /** هل الحركة تتكرر لا نهائياً (مؤشرات حالة/نبض) أم مرة واحدة (دخول/خروج عنصر)؟ */
  loop: boolean;
  /** الاستخدام المقصود بلغة بسيطة. */
  purpose: string;
  /** من أين استُخرجت (keyframe الأصلي في المرجع) — إلزامي، لا حركة بلا مصدر موثَّق. */
  sourceNote: string;
}

export const ANIMATION_REGISTRY = {
  /** ظهور بسيط بالتلاشي — لعناصر محتوى تُحمَّل تدريجياً (بطاقة منتج، قسم جديد يدخل الشاشة). */
  fadeIn: {
    className: 'animate-sb-fade-in',
    durationMs: 300,
    easing: MOTION_EASING.apple,
    loop: false,
    purpose: 'ظهور تدريجي بسيط (opacity فقط) لعنصر محتوى جديد.',
    sourceNote: 'نمط عام مستنبَط من فلسفة الحركة الهادئة في styles.css (لا keyframe محدد باسم مطابق) — أبسط تطبيق ممكن لنفس الروح.',
  },
  /** ظهور بالتلاشي + تكبير + إزالة ضبابية — لعناصر بارزة كاملة الشاشة (Splash/Hero يظهر لأول مرة). */
  fadeScaleIn: {
    className: 'animate-sb-fade-scale-in',
    durationMs: 900,
    easing: MOTION_EASING.apple,
    loop: false,
    purpose: 'دخول عنصر Hero/شاشة كاملة بإحساس "توضّح تدريجي" (blur → حاد).',
    sourceNote: '@keyframes splash-in (styles.css) — opacity 0→1, scale(0.92)→scale(1), blur(12px)→blur(0).',
  },
  /** انزلاق للأعلى + تلاشي دخول — لعناصر تدخل من أسفل الشاشة (بطاقة في Feed، صف جديد). */
  slideUp: {
    className: 'animate-sb-slide-up',
    durationMs: 700,
    easing: MOTION_EASING.apple,
    loop: false,
    purpose: 'دخول عنصر من الأسفل مع تلاشي — محتوى يظهر أثناء التمرير.',
    sourceNote: '@keyframes float-up (styles.css) — opacity 0→1, translateY(20px)→translateY(0).',
  },
  /** بروز مرن (Overshoot) — لعنصر يظهر فجأة كنتيجة فعل مباشر (إضافة شارة، تفعيل حالة). */
  scalePop: {
    className: 'animate-sb-scale-pop',
    durationMs: 450,
    easing: MOTION_EASING.apple,
    loop: false,
    purpose: 'ظهور عنصر بقفزة خفيفة تتجاوز الحجم النهائي ثم تستقر — إحساس "بروز حي".',
    sourceNote: '@keyframes capsule-pop (styles.css) — scale(0.6)→scale(1.06)→scale(1) مع opacity.',
  },
  /** نسخة أفقية من scalePop مخصَّصة لعناصر تدخل من جانب الشاشة (كبسولة عائمة جديدة). */
  cartPulse: {
    className: 'animate-sb-cart-pulse',
    durationMs: 500,
    easing: MOTION_EASING.apple,
    loop: false,
    purpose: 'دخول كبسولة/شارة عائمة جديدة من جانب الشاشة — بديل جاهز لأي عنصر عائم مشابه لـCartCapsule مستقبلاً (لا يستبدل نبضة CartCapsule.tsx القائمة).',
    sourceNote: '@keyframes cart-capsule-in (styles.css) — translateX(20px)scale(0.7)→translateX(-3px)scale(1.05)→translateX(0)scale(1).',
  },
  /** مؤشر "+1" عائم يطفو للأعلى ثم يتلاشى — تغذية راجعة فورية لفعل إضافة/زيادة. */
  plusOnePop: {
    className: 'animate-sb-plus-one',
    durationMs: 900,
    easing: MOTION_EASING.apple,
    loop: false,
    purpose: 'مؤشر "+1" يطفو ويتلاشى — تغذية راجعة بصرية عند زيادة كمية/إضافة عنصر.',
    sourceNote: '@keyframes plus-one-pop (styles.css) — translate(-50%,0)scale(0.6) → translate(-50%,-14px)scale(1.1) → translate(-50%,-36px)scale(0.9) مع opacity.',
  },
  /** ظهور كبسولة عد أفقية (QuantityStepper) بامتداد أفقي بدل التلاشي البسيط. */
  qtyCapsuleIn: {
    className: 'animate-sb-qty-capsule-in',
    durationMs: 350,
    easing: MOTION_EASING.apple,
    loop: false,
    purpose: 'ظهور كبسولة عدّاد كمية بامتداد أفقي من نقطة ارتكاز واحدة.',
    sourceNote:
      '@keyframes qty-capsule-in (styles.css) — scaleX(0.4)→scaleX(1). ⚠️ المرجع LTR يستخدم transform-origin: left — نحن RTL دائماً (dir="rtl" ثابت)، فنقطة الارتكاز الصحيحة عندنا "right" (نفس تصحيح origin-right الموثَّق فعلياً في تعليق CartCapsule.tsx لسبب مطابق) — القيمة في globals.css مُصحَّحة لـ transform-origin: right center، لا نسخاً حرفياً للقيمة الاتجاهية.',
  },
  /** شريط لامع متحرك — لعناصر Skeleton أثناء التحميل (لا تصميم Skeleton كامل، فقط نمط الحركة). */
  shimmerSlide: {
    className: 'animate-sb-shimmer',
    durationMs: 1600,
    easing: 'linear',
    loop: true,
    purpose: 'حركة "لمعان" أفقية متكررة لعناصر Skeleton أثناء التحميل — يبقى تصميم شكل الـSkeleton نفسه OPEN_QUESTION (UI_UX_SYSTEM.md §6)، هذا نمط الحركة فقط.',
    sourceNote: '@keyframes shimmer-slide (styles.css) — background-position 200% 0 → -200% 0، linear لا apple (حركة ميكانيكية متكررة، لا "حية").',
  },
  /** نبضة حلقة حول عنصر دائري (Avatar/Story) — تكرار بطيء لجذب انتباه خفيف بلا إزعاج. */
  ringPulse: {
    className: 'animate-sb-ring-pulse',
    durationMs: 2400,
    easing: MOTION_EASING.apple,
    loop: true,
    purpose: 'حلقة نابضة حول عنصر دائري حي (بديل جاهز لحلقات StoryBar.tsx المتدرّجة — بلا استبدال التدرّج اللوني الحالي، إضافة حركة اختيارية فوقه).',
    sourceNote: '@keyframes ring-pulse (styles.css) — box-shadow 0→6px حول hsl(var(--primary)) — أُعيد بناؤه بـvar(--sb-primary) ليتكيّف مع أي [data-world].',
  },
  /** توهّج نابض أوسع — لشارات مميّزة (Premium/جديد/عرض خاص). */
  glowPulse: {
    className: 'animate-sb-glow-pulse',
    durationMs: 2600,
    easing: MOTION_EASING.apple,
    loop: true,
    purpose: 'توهّج نابض حول شارة/عنصر مميَّز — جذب انتباه هادئ بلا اهتزاز أو وميض حاد (يحترم docs/design/DESIGN_CONSTITUTION.md §3).',
    sourceNote: '@keyframes glow-pulse (styles.css) — box-shadow مزدوج حول hsl(var(--primary)) — أُعيد بناؤه بـvar(--sb-primary).',
  },
  /** نبضة ناعمة لنقطة حالة (Status Dot) — حجم+شفافية بلا حركة موضعية. */
  pulseSoft: {
    className: 'animate-sb-pulse-soft',
    durationMs: 2200,
    easing: MOTION_EASING.apple,
    loop: true,
    purpose: 'نبضة هادئة لنقطة حالة حية (مثال محتمل: مؤشر "مباشر"/"متاح الآن").',
    sourceNote: '@keyframes pulse-soft (styles.css) — opacity 1→0.55، scale(1)→scale(0.85).',
  },
} as const satisfies Record<string, AnimationDefinition>;

export type AnimationKey = keyof typeof ANIMATION_REGISTRY;

/** تعريف الحركة إن وُجد المفتاح، وإلا undefined — مطابقة نمط getNeighborhoodIdentity الآمن. */
export function getAnimation(key: AnimationKey): AnimationDefinition {
  return ANIMATION_REGISTRY[key];
}
