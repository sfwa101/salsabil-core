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
};

/**
 * هوية الحي البصرية إن وُجدت، وإلا null (يعني: استخدم توكنز الثيم العامة بلا أي تخصيص).
 * worldSlug هنا دائماً هوية العالم التجارية الثابتة ("reef")، لا اسم الثيم المرئي الحالي — راجع
 * تعليق أعلى الملف.
 */
export function getNeighborhoodIdentity(worldSlug: WorldSlug, categorySlug: string): NeighborhoodIdentity | null {
  return NEIGHBORHOOD_IDENTITIES[`${worldSlug}:${categorySlug}`] ?? null;
}
