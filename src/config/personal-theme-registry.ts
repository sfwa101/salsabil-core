// src/config/personal-theme-registry.ts
// السجل المركزي لمحور "التفضيل الشخصي للثيمات" (اليوم 30، BAYAN-HOME-FEED-001) — تخزين محلي فقط
// (localStorage)، بلا عمود جديد على users (قرار مسبق، راجع docs/CHANGELOG.md اليوم 23).
//
// ⚠️ استقلال كامل عن WorldSlug/[data-world] (theme-registry.ts، ADR-007): ذلك المحور يمثّل
// "أي عالم/منظومة يتصفحها المستخدم" (ريف، بيان، ...)، هذا المحور يمثّل "أي تفضيل شخصي للألوان
// يريده المستخدم نفسه" — لا علاقة بينهما، ولا تُستخدَم أسماء متغيرات CSS مشتركة (--sb-pt- هنا
// بدل --sb-) لضمان ألا يكسب أحدهما الآخر عبر الوراثة (القيم الحقيقية المطابقة في globals.css
// تحت html[data-personal-theme][data-personal-mode]، لا [data-world]).
//
// لا مستهلك واجهة بعد يقرأ --sb-pt-* (البنية التحتية فقط اليوم — نفس نمط اليوم 6 لعوالم بلا واجهة
// وقتها، واليوم 19 للمخطط قبل مستهلك الكود). shadcn/ui غير مثبَّتة (نفس ملاحظة theme-registry.ts)،
// لذا القيم هنا Hex مباشر أيضاً.

export type PersonalThemeSlug = 'masculine' | 'feminine' | 'youth' | 'simplified';
export type PersonalColorMode = 'light' | 'dark';

export interface PersonalThemeTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  // معامل تكبير الخط الأساسي (16px × fontScale) — 1 للثلاثة الأولى، أكبر لـ"مبسّط" فقط
  // ("خط أكبر" في نص الموجّه). راجع html[data-personal-theme] في globals.css لتطبيقه فعلياً.
  fontScale: number;
}

export interface PersonalTheme {
  slug: PersonalThemeSlug;
  name: { ar: string; en: string };
  modes: Record<PersonalColorMode, PersonalThemeTokens>;
}

export const PERSONAL_THEMES: Record<PersonalThemeSlug, PersonalTheme> = {
  masculine: {
    slug: 'masculine',
    name: { ar: 'رجالي', en: 'Masculine' },
    modes: {
      light: {
        background: '#F5F7FA',
        foreground: '#1E2A38',
        card: '#FFFFFF',
        cardForeground: '#1E2A38',
        primary: '#5B7C99',
        primaryForeground: '#FFFFFF',
        secondary: '#B8C4CE',
        secondaryForeground: '#1E2A38',
        accent: '#8FA6B8',
        accentForeground: '#1E2A38',
        muted: '#E7ECEF',
        mutedForeground: '#5A6B78',
        border: '#D6DEE3',
        fontScale: 1,
      },
      dark: {
        background: '#1B222B',
        foreground: '#E6EBEF',
        card: '#232C37',
        cardForeground: '#E6EBEF',
        primary: '#7FA1BC',
        primaryForeground: '#0F1620',
        secondary: '#3A4653',
        secondaryForeground: '#E6EBEF',
        accent: '#5B7C99',
        accentForeground: '#FFFFFF',
        muted: '#2A333E',
        mutedForeground: '#9AA7B2',
        border: '#333F4B',
        fontScale: 1,
      },
    },
  },
  feminine: {
    slug: 'feminine',
    name: { ar: 'نسائي', en: 'Feminine' },
    modes: {
      light: {
        background: '#FDF6F7',
        foreground: '#3A2229',
        card: '#FFFFFF',
        cardForeground: '#3A2229',
        primary: '#D98A9B',
        primaryForeground: '#FFFFFF',
        secondary: '#F3C9CF',
        secondaryForeground: '#3A2229',
        accent: '#E7A9B6',
        accentForeground: '#3A2229',
        muted: '#F7E8EA',
        mutedForeground: '#7A5960',
        border: '#F0D8DC',
        fontScale: 1,
      },
      dark: {
        background: '#2B1D21',
        foreground: '#F6E8EA',
        card: '#35252A',
        cardForeground: '#F6E8EA',
        primary: '#E39CAA',
        primaryForeground: '#2B1D21',
        secondary: '#55393F',
        secondaryForeground: '#F6E8EA',
        accent: '#D98A9B',
        accentForeground: '#2B1D21',
        muted: '#3E2A2F',
        mutedForeground: '#B98F96',
        border: '#4A333A',
        fontScale: 1,
      },
    },
  },
  youth: {
    slug: 'youth',
    name: { ar: 'شبابي', en: 'Youth' },
    modes: {
      light: {
        background: '#F6F9FA',
        foreground: '#21243A',
        card: '#FFFFFF',
        cardForeground: '#21243A',
        primary: '#3FB6B0',
        primaryForeground: '#FFFFFF',
        secondary: '#B79CF0',
        secondaryForeground: '#2B2050',
        accent: '#6BD6CE',
        accentForeground: '#12332F',
        muted: '#E9F3F3',
        mutedForeground: '#506A6C',
        border: '#D8ECEA',
        fontScale: 1,
      },
      dark: {
        background: '#171B2A',
        foreground: '#E8EEF0',
        card: '#1F2438',
        cardForeground: '#E8EEF0',
        primary: '#59D4CB',
        primaryForeground: '#0D2422',
        secondary: '#9B7FE0',
        secondaryForeground: '#FFFFFF',
        accent: '#3FB6B0',
        accentForeground: '#FFFFFF',
        muted: '#262C42',
        mutedForeground: '#9AA6C0',
        border: '#313A52',
        fontScale: 1,
      },
    },
  },
  simplified: {
    slug: 'simplified',
    name: { ar: 'الوضع المبسّط', en: 'Simplified' },
    modes: {
      light: {
        background: '#FFFFFF',
        foreground: '#000000',
        card: '#FFFFFF',
        cardForeground: '#000000',
        primary: '#0047AB',
        primaryForeground: '#FFFFFF',
        secondary: '#000000',
        secondaryForeground: '#FFFFFF',
        accent: '#B30000',
        accentForeground: '#FFFFFF',
        muted: '#E0E0E0',
        mutedForeground: '#000000',
        border: '#000000',
        fontScale: 1.125,
      },
      dark: {
        background: '#000000',
        foreground: '#FFFFFF',
        card: '#000000',
        cardForeground: '#FFFFFF',
        primary: '#6FA8FF',
        primaryForeground: '#000000',
        secondary: '#FFFFFF',
        secondaryForeground: '#000000',
        accent: '#FF6B6B',
        accentForeground: '#000000',
        muted: '#1A1A1A',
        mutedForeground: '#FFFFFF',
        border: '#FFFFFF',
        fontScale: 1.125,
      },
    },
  },
};
