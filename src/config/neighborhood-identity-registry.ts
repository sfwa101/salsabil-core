// src/config/neighborhood-identity-registry.ts
// السجل المركزي لهوية كل "حي" (category) البصرية — نمط Zero Hardcode مطابق لـ theme-registry.ts
// حرفياً (docs/UI_UX_SYSTEM.md §8)، لكن على مستوى أدنى: لا يستبدل ثيم العالم (theme-registry.ts)،
// بل يضيف تمييزاً بصرياً اختيارياً فوقه لحي بعينه (مثال مكتشَف في مرجع Lovable: اللحوم بلون
// rose-600 ثابت مهما كان الثيم العام — راجع docs/DECISIONS.md → ADR-024 للتفصيل الكامل والمصدر).
//
// المفتاح `${WorldSlug}:${categorySlug}` — لا `categorySlug` وحده — عمداً قابل لإعادة الاستخدام عبر
// أي عالم مستقبلي (أسراب، نبض...) لا حصراً على ريف، حتى لو كل القيم المسجَّلة اليوم بادئتها 'reef:'
// فقط (راجع ADR-024 للمبرر الكامل). يُستهلَك `WorldSlug` نفسه من theme-registry.ts — لا نوع مكرَّر.
//
// ⚠️ لا علاقة لهذا بـ [data-world] الفعلي المطبَّق على الصفحة (قد يكون 'reef' أو 'reef-lavender' —
// غلاف بصري بديل فقط). مفتاح هذا السجل يستخدم دائماً هوية العالم التجارية الثابتة ("reef")، لا اسم
// الثيم المرئي الحالي — نفس تمييز world_scope عن data-world الموثَّق أصلاً في
// src/core/modules/bayan/types.ts (تعليق أعلى الملف).
//
// ⚠️ CONFLICT-009 (راجع docs/DECISIONS.md → سجل التعارضات): توسيع هذا الملف بالـ14 قيمة المتبقية
// من storeThemes.ts (2026-09-08، EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS) هو بالضبط النمط
// الذي رفضه ADR-024 صراحة كـ"Alternative (ب)" ("زرع كل الـ15 قيمة فوراً بمفاتيح تخمينية لأحياء لم
// تُنشَأ بعد — مرفوضة: انتهاك مباشر لمبدأ الأقسام بيانات من جدول Supabase لا قيم ثابتة بالكود")،
// ونفس ما وثَّقته ideas/IDEAS.md → IDEA-002 صراحة ("لا تُدخَل في السجل الحي إلا عند إنشاء حي حقيقي").
// موجّه المهمة الحالي يطلب صراحة عكس ذلك بالضبط. عُومِل هذا كتكليف مؤسس مباشر يُسقِط قيد ADR-024/
// IDEA-002 لهذه الدفعة تحديداً (نفس سابقة قبول التكليف المباشر كموافقة صريحة، CONFLICT-008) — لا
// حسماً صامتاً؛ مُسجَّل هنا وفي CONFLICT-009 لأن التناقض حقيقي بين قرارين للمؤسس نفسه بفارق يوم واحد
// فقط، ويستحق مراجعته صراحة لا افتراض أيهما "الصحيح" نهائياً. **كل الأحياء الأربعة عشر أدناه غير
// موجودة في قاعدة البيانات — لا تُنشأ هنا، فقط الألوان محفوظة "جاهزة عند الإنشاء الفعلي" كما طلب
// الموجّه صراحة.**

import type { WorldSlug } from './theme-registry';

export interface NeighborhoodIdentity {
  /** لون تمييز الحي — Hex. يُطبَّق فوق primary/accent العام لهذا العالم، لا يستبدله كلياً. */
  accentColor: string;
  /** لون النص/الأيقونة فوق accentColor مباشرة (تباين كافٍ). */
  accentForeground: string;
  /**
   * شكل بطاقة المنتج البديل لهذا الحي — حقل مُعَدّ للمستقبل فقط (مثال مكتشَف في المرجع: بطاقة
   * "منتجات القرية" الأفقية 140px/1fr، مختلفة عن الشبكة العمودية القياسية). 'default' فقط اليوم —
   * لا حي مسجَّل يحتاج شكلاً بديلاً فعلياً بعد؛ تفعيل قيمة أخرى يتطلب تعديل ProductCard.tsx نفسه
   * (خارج نطاق RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS عمداً).
   */
  cardVariant: 'default';
  /** توثيق حي داخل الكود: من أين استُخرجت القيمة ولماذا (إلزامي — لا قيمة بلا مصدر مذكور). */
  sourceNote: string;
}

type NeighborhoodKey = `${WorldSlug}:${string}`;

// لا حي بلا هوية مميزة يُضاف هنا — إن لم يوجد سطر لمفتاح مُعطى، getNeighborhoodIdentity تُعيد null
// والمستهلك يستخدم توكنز الثيم العامة (bg-primary/border-primary...) بلا أي تغيير — هذا هو
// "الافتراضي" المطلوب (docs/DECISIONS.md → ADR-024)، لا قيمة hex افتراضية مكرَّرة هنا (كانت ستكرر
// بيانات موجودة أصلاً في theme-registry.ts، عكس Zero Hardcode).
const NEIGHBORHOOD_IDENTITIES: Partial<Record<NeighborhoodKey, NeighborhoodIdentity>> = {
  'reef:daily-food': {
    // تحويل HSL→Hex دقيق لقيمة storeThemes.supermarket.hue ("142 55% 38%") من مرجع Lovable
    // (reefam-d6cc4e17، src/lib/storeThemes.ts). لا مطابقة اسم حرفي — "حي الطعام اليومي" عندنا
    // يجمع بقالة جافة + خضار + ألبان في حي واحد (راجع scripts/seed-daily-food-demo-content.ts)،
    // بخلاف تقسيم المرجع الدقيق (سوبرماركت/خضار/ألبان منفصلة). أقرب مطابقة دلالية حقيقية: وصف
    // storeThemes.supermarket نفسه "كل ما تحتاجه يومياً" — نفس معنى "الطعام اليومي" بالضبط.
    accentColor: '#2C9653',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote:
      'storeThemes.supermarket.hue ("142 55% 38%") في reefam-d6cc4e17/src/lib/storeThemes.ts — مطابقة دلالية (لا حرفية) لعدم وجود حي "سوبرماركت" منفصل عندنا. راجع ADR-024.',
  },
  // ── الـ14 قيمة المتبقية من storeThemes.ts — لا حي حقيقي يقابلها في قاعدة البيانات اليوم، محفوظة
  // فقط جاهزة للاستخدام عند إنشاء الحي فعلياً (راجع تحذير CONFLICT-009 أعلى الملف). accentForeground
  // محسوبة آلياً (نسبة تباين WCAG بين أبيض/أسود دافئ #1A1206 مقابل accentColor)، لا اختياراً بصرياً.
  'reef:produce': {
    accentColor: '#58962C',
    accentForeground: '#1A1206',
    cardVariant: 'default',
    sourceNote: 'storeThemes.produce.hue ("95 55% 38%") — reefam-d6cc4e17/src/lib/storeThemes.ts. لا حي "خضار وفواكه" منفصل عندنا بعد (يقع اليوم ضمن daily-food). راجع CONFLICT-009.',
  },
  'reef:dairy': {
    accentColor: '#D09125',
    accentForeground: '#1A1206',
    cardVariant: 'default',
    sourceNote: 'storeThemes.dairy.hue ("38 70% 48%") — reefam-d6cc4e17/src/lib/storeThemes.ts. راجع CONFLICT-009.',
  },
  'reef:kitchen': {
    accentColor: '#DF5920',
    accentForeground: '#1A1206',
    cardVariant: 'default',
    sourceNote: 'storeThemes.kitchen.hue ("18 75% 50%") — reefam-d6cc4e17/src/lib/storeThemes.ts ("المطبخ الجاهز"). راجع CONFLICT-009.',
  },
  'reef:pharmacy': {
    accentColor: '#2091B6',
    accentForeground: '#1A1206',
    cardVariant: 'default',
    sourceNote: 'storeThemes.pharmacy.hue ("195 70% 42%") — reefam-d6cc4e17/src/lib/storeThemes.ts. أقرب مطابقة جاهزة لحي "الصحة والدواء" المخطَّط في ideas/IDEAS.md → IDEA-002 عند إنشائه فعلياً.',
  },
  'reef:library': {
    accentColor: '#6839C6',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote: 'storeThemes.library.hue ("260 55% 50%") — reefam-d6cc4e17/src/lib/storeThemes.ts. أقرب مطابقة جاهزة لحي "القرطاسية" المخطَّط في ideas/IDEAS.md → IDEA-002 عند إنشائه فعلياً.',
  },
  'reef:subscriptions': {
    accentColor: '#D22D80',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote: 'storeThemes.subscriptions.hue ("330 65% 50%") — reefam-d6cc4e17/src/lib/storeThemes.ts. ⚠️ نفس Hue الحرفي لـ storeThemes.sweets في المرجع نفسه (تكرار حقيقي مصدره المرجع، لا خطأ استخراج) — راجع reef:sweets أدناه.',
  },
  'reef:wholesale': {
    accentColor: '#1F5093',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote: 'storeThemes.wholesale.hue ("215 65% 35%") — reefam-d6cc4e17/src/lib/storeThemes.ts ("ريف الجملة").',
  },
  'reef:recipes': {
    accentColor: '#D04125',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote: 'storeThemes.recipes.hue ("10 70% 48%") — reefam-d6cc4e17/src/lib/storeThemes.ts.',
  },
  'reef:home-tools': {
    accentColor: '#2C9696',
    accentForeground: '#1A1206',
    cardVariant: 'default',
    sourceNote: 'storeThemes.homeTools.hue ("180 55% 38%") — reefam-d6cc4e17/src/lib/storeThemes.ts ("الأدوات المنزلية"). slug مُحوَّل kebab-case لمطابقة عُرف daily-food.',
  },
  'reef:village': {
    accentColor: '#966A2C',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote: 'storeThemes.village.hue ("35 55% 38%") — reefam-d6cc4e17/src/lib/storeThemes.ts ("منتجات القرية").',
  },
  'reef:baskets': {
    accentColor: '#C98F1D',
    accentForeground: '#1A1206',
    cardVariant: 'default',
    sourceNote: 'storeThemes.baskets.hue ("40 75% 45%") — reefam-d6cc4e17/src/lib/storeThemes.ts ("سلال الريف").',
  },
  'reef:restaurants': {
    accentColor: '#225B77',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote: 'storeThemes.restaurants.hue ("200 55% 30%") — reefam-d6cc4e17/src/lib/storeThemes.ts ("مطاعم مختارة").',
  },
  'reef:meat': {
    accentColor: '#9B3027',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote: 'storeThemes.meat.hue ("5 60% 38%") — reefam-d6cc4e17/src/lib/storeThemes.ts ("اللحوم والمجمدات") — القيمة المذكورة في تعليق ADR-024 الأصلي كمثال "rose-600"، الآن مُدخَلة فعلياً بدل الذكر النصي فقط.',
  },
  'reef:sweets': {
    accentColor: '#D22D80',
    accentForeground: '#FFFFFF',
    cardVariant: 'default',
    sourceNote: 'storeThemes.sweets.hue ("330 65% 50%") — reefam-d6cc4e17/src/lib/storeThemes.ts. ⚠️ نفس Hue الحرفي لـ storeThemes.subscriptions في المرجع نفسه — راجع reef:subscriptions أعلاه.',
  },
};

/**
 * هوية الحي البصرية إن وُجدت، وإلا null (يعني: استخدم توكنز الثيم العامة بلا أي تخصيص).
 * worldSlug هنا دائماً هوية العالم التجارية الثابتة ("reef")، لا اسم الثيم المرئي الحالي — راجع
 * تعليق أعلى الملف.
 */
export function getNeighborhoodIdentity(worldSlug: WorldSlug, categorySlug: string): NeighborhoodIdentity | null {
  return NEIGHBORHOOD_IDENTITIES[`${worldSlug}:${categorySlug}`] ?? null;
}
