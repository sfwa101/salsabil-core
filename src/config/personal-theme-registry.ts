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
// ✅ (COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS، بند 6، 2026-09-09) --sb-pt-* أصبحت
// الآن مستهلَكة فعلياً (globals.css يربطها بـ--sb-* عند وجود data-personal-theme — راجع تعليق
// الإصلاح هناك). shadcn/ui غير مثبَّتة وقت إنشاء هذا الملف (نفس ملاحظة theme-registry.ts قبل
// ADR-025) — القيم هنا تبقى Hex مباشر للاتساق مع كل الثيمات الأربعة الأصلية، لا تغيير قائم.
//
// الثيمات العشرة الإضافية (ocean/amber/blush/lavender/mint/peach/midnight/plum/navy/sage) —
// مُستخرَجة حرفياً من مرجع Lovable (D:\temp\reefam-lovable-reference\src\styles.css،
// [data-theme="<slug>"]/.dark[data-theme="<slug>"], + ThemeContext.tsx لقائمة الـColorTheme
// الكاملة) وHSL→Hex محوَّل رياضياً (لا تقريب بصري). حقل مفقود في بلوك dark بعينه في المرجع (مثال:
// primary-foreground/accent لأغلب الثيمات) يعني فعلياً "لم يُعاد تعريفه" — بحسب Cascade الحقيقي في
// المرجع (`.dark[data-theme]` و`[data-theme]` كلاهما يطابقان نفس العنصر، فتُوَرَّث القيمة من البلوك
// الأقل تخصيصاً لكل خاصية لم تُعَد تعريفها تحديداً) — لا قيمة مُخترَعة، فقط إعادة بناء لنفس النتيجة
// المرئية الفعلية في المرجع بصيغة جدول ثابت بلا وراثة CSS جزئية (PersonalThemeTokens يتطلب كل حقل
// صريحاً). الأسماء العربية أدناه مطابقة حرفياً لما ورد في موجّه المهمة، بالترتيب: ليلي=midnight،
// كهرماني=amber، محيطي=ocean، ريفي=sage (القيمة الافتراضية الأصلية "sage/reef green" في المرجع
// نفسه — أقرب معنى لكلمة "ريفي" في هذه القائمة)، خوخي=peach، نعناعي=mint، لافندر=lavender،
// وردي ناعم=blush، أزرق ليلي=navy، بنفسجي ملكي=plum (تعليق المرجع نفسه: "royal purple").

export type PersonalThemeSlug =
  | 'masculine'
  | 'feminine'
  | 'youth'
  | 'simplified'
  | 'sage'
  | 'ocean'
  | 'amber'
  | 'blush'
  | 'lavender'
  | 'mint'
  | 'peach'
  | 'midnight'
  | 'plum'
  | 'navy';
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
  sage: {
    slug: 'sage',
    name: { ar: 'ريفي', en: 'Sage' },
    modes: {
      light: {
        background: '#F8FBF8', foreground: '#1E2924', card: '#FFFFFF', cardForeground: '#1E2924',
        primary: '#3F8358', primaryForeground: '#FBFBF8', secondary: '#EDF3EE', secondaryForeground: '#25372E',
        accent: '#E0A752', accentForeground: '#281F15', muted: '#EAF0EC', mutedForeground: '#63746B',
        border: '#DCE5DF', fontScale: 1,
      },
      dark: {
        background: '#121714', foreground: '#ECF3ED', card: '#1C221F', cardForeground: '#E8EEE9',
        primary: '#53C675', primaryForeground: '#101814', secondary: '#262C29', secondaryForeground: '#E8EEE9',
        accent: '#E0A752', accentForeground: '#1B140E', muted: '#262C29', mutedForeground: '#94A89B',
        border: '#2F3733', fontScale: 1,
      },
    },
  },
  ocean: {
    slug: 'ocean',
    name: { ar: 'محيطي', en: 'Ocean' },
    modes: {
      light: {
        background: '#F7FBFD', foreground: '#1B2637', card: '#FBFDFE', cardForeground: '#1B2637',
        primary: '#2084B6', primaryForeground: '#F6FBFE', secondary: '#E6F0F4', secondaryForeground: '#202C3C',
        accent: '#EB9947', accentForeground: '#281F15', muted: '#E3EDF2', mutedForeground: '#5E6B78',
        border: '#CFDFE8', fontScale: 1,
      },
      dark: {
        background: '#0D131C', foreground: '#E6ECF0', card: '#151D28', cardForeground: '#E6ECF0',
        primary: '#4EB7DA', primaryForeground: '#F6FBFE', secondary: '#1F2733', secondaryForeground: '#E6ECF0',
        accent: '#EB9947', accentForeground: '#281F15', muted: '#1F2733', mutedForeground: '#90A3AD',
        border: '#263140', fontScale: 1,
      },
    },
  },
  amber: {
    slug: 'amber',
    name: { ar: 'كهرماني', en: 'Amber' },
    modes: {
      light: {
        background: '#FDFBF7', foreground: '#392618', card: '#FEFDFA', cardForeground: '#392618',
        primary: '#DF7416', primaryForeground: '#FEFBF6', secondary: '#F5EDE0', secondaryForeground: '#3E2B1E',
        accent: '#2DA9D2', accentForeground: '#152228', muted: '#F1EADF', mutedForeground: '#7B6B5B',
        border: '#E6DCCB', fontScale: 1,
      },
      dark: {
        background: '#1E1610', foreground: '#F1ECE4', card: '#292019', cardForeground: '#F1ECE4',
        primary: '#EB9E47', primaryForeground: '#FEFBF6', secondary: '#342A23', secondaryForeground: '#F1ECE4',
        accent: '#2DA9D2', accentForeground: '#152228', muted: '#342A23', mutedForeground: '#ADA290',
        border: '#43362D', fontScale: 1,
      },
    },
  },
  blush: {
    slug: 'blush',
    name: { ar: 'وردي ناعم', en: 'Blush' },
    modes: {
      light: {
        background: '#FEF8F9', foreground: '#3E1E29', card: '#FFFCFD', cardForeground: '#3E1E29',
        primary: '#DF497B', primaryForeground: '#FFFAFB', secondary: '#FAE5EA', secondaryForeground: '#4C2432',
        accent: '#F7A76E', accentForeground: '#342419', muted: '#F7E8EC', mutedForeground: '#8D6874',
        border: '#F2D9DF', fontScale: 1,
      },
      dark: {
        background: '#201317', foreground: '#F4EBED', card: '#2C1C21', cardForeground: '#F4EBED',
        primary: '#EC799F', primaryForeground: '#FFFAFB', secondary: '#36262B', secondaryForeground: '#F4EBED',
        accent: '#F7A76E', accentForeground: '#342419', muted: '#36262B', mutedForeground: '#B1959C',
        border: '#422E35', fontScale: 1,
      },
    },
  },
  lavender: {
    slug: 'lavender',
    name: { ar: 'لافندر', en: 'Lavender' },
    modes: {
      light: {
        background: '#FBF9FD', foreground: '#2E203C', card: '#FEFDFF', cardForeground: '#2E203C',
        primary: '#9561D1', primaryForeground: '#FDFAFF', secondary: '#F1E8F7', secondaryForeground: '#382749',
        accent: '#EC79C6', accentForeground: '#321B2A', muted: '#F1EAF6', mutedForeground: '#7A6C89',
        border: '#E7DBF0', fontScale: 1,
      },
      dark: {
        background: '#1A1320', foreground: '#F0ECF4', card: '#241C2C', cardForeground: '#F0ECF4',
        primary: '#B889E6', primaryForeground: '#FDFAFF', secondary: '#2E2636', secondaryForeground: '#F0ECF4',
        accent: '#EC79C6', accentForeground: '#321B2A', muted: '#2E2636', mutedForeground: '#A598AE',
        border: '#382E42', fontScale: 1,
      },
    },
  },
  mint: {
    slug: 'mint',
    name: { ar: 'نعناعي', en: 'Mint' },
    modes: {
      light: {
        background: '#F7FDFB', foreground: '#1D3531', card: '#FAFEFD', cardForeground: '#1D3531',
        primary: '#30A68E', primaryForeground: '#F6FEFB', secondary: '#E5F5F0', secondaryForeground: '#203C37',
        accent: '#EB7099', accentForeground: '#321B22', muted: '#E3F2ED', mutedForeground: '#5E7874',
        border: '#CFE8DF', fontScale: 1,
      },
      dark: {
        background: '#111D1B', foreground: '#E6F0EC', card: '#1A2826', cardForeground: '#E6F0EC',
        primary: '#54D4B4', primaryForeground: '#F6FEFB', secondary: '#243331', secondaryForeground: '#E6F0EC',
        accent: '#EB7099', accentForeground: '#321B22', muted: '#243331', mutedForeground: '#92AAA2',
        border: '#2E423F', fontScale: 1,
      },
    },
  },
  peach: {
    slug: 'peach',
    name: { ar: 'خوخي', en: 'Peach' },
    modes: {
      light: {
        background: '#FEFAF8', foreground: '#40271C', card: '#FFFEFC', cardForeground: '#40271C',
        primary: '#EC7551', primaryForeground: '#FFFCFA', secondary: '#FBEAE0', secondaryForeground: '#4F2F22',
        accent: '#52B1E0', accentForeground: '#152228', muted: '#F7EBE3', mutedForeground: '#8D7368',
        border: '#F0DCD1', fontScale: 1,
      },
      dark: {
        background: '#211712', foreground: '#F4EEEB', card: '#2D201B', cardForeground: '#F4EEEB',
        primary: '#EF8F6C', primaryForeground: '#FFFCFA', secondary: '#372A25', secondaryForeground: '#F4EEEB',
        accent: '#52B1E0', accentForeground: '#152228', muted: '#372A25', mutedForeground: '#B1A095',
        border: '#43342D', fontScale: 1,
      },
    },
  },
  midnight: {
    slug: 'midnight',
    name: { ar: 'ليلي', en: 'Midnight' },
    modes: {
      light: {
        background: '#F8F9FC', foreground: '#151A32', card: '#FBFCFE', cardForeground: '#151A32',
        primary: '#27369B', primaryForeground: '#F6F7FE', secondary: '#E8EAF3', secondaryForeground: '#1C2240',
        accent: '#F4C434', accentForeground: '#2B2112', muted: '#E6E7F0', mutedForeground: '#5E6378',
        border: '#D2D5E4', fontScale: 1,
      },
      dark: {
        background: '#0B0D19', foreground: '#ECEDF4', card: '#121526', cardForeground: '#ECEDF4',
        primary: '#6778E4', primaryForeground: '#F6F7FE', secondary: '#1F2133', secondaryForeground: '#ECEDF4',
        accent: '#F4C434', accentForeground: '#2B2112', muted: '#1F2133', mutedForeground: '#959AB1',
        border: '#262A40', fontScale: 1,
      },
    },
  },
  plum: {
    slug: 'plum',
    name: { ar: 'بنفسجي ملكي', en: 'Plum' },
    modes: {
      light: {
        background: '#FAF4FA', foreground: '#321B37', card: '#FEFBFE', cardForeground: '#321B37',
        primary: '#85358D', primaryForeground: '#FDF6FE', secondary: '#F2E8F3', secondaryForeground: '#391E3E',
        accent: '#F5C73D', accentForeground: '#2B2112', muted: '#EFE6F0', mutedForeground: '#745E78',
        border: '#E3D2E4', fontScale: 1,
      },
      dark: {
        background: '#160C18', foreground: '#F3ECF4', card: '#221325', cardForeground: '#F3ECF4',
        primary: '#DE7CDE', primaryForeground: '#200F24', secondary: '#2F2032', secondaryForeground: '#F3ECF4',
        accent: '#ECC551', accentForeground: '#2B2112', muted: '#2F2032', mutedForeground: '#AF95B1',
        border: '#402C44', fontScale: 1,
      },
    },
  },
  navy: {
    slug: 'navy',
    name: { ar: 'أزرق ليلي', en: 'Navy' },
    modes: {
      light: {
        background: '#F4F7FB', foreground: '#141E34', card: '#FBFCFE', cardForeground: '#141E34',
        primary: '#18428B', primaryForeground: '#F6F9FE', secondary: '#E7ECF3', secondaryForeground: '#192743',
        accent: '#2BBDEE', accentForeground: '#142229', muted: '#E4EAF1', mutedForeground: '#5B677B',
        border: '#D1DAE6', fontScale: 1,
      },
      dark: {
        background: '#080C17', foreground: '#ECEFF4', card: '#0E1525', cardForeground: '#ECEFF4',
        primary: '#5E9AED', primaryForeground: '#0A111F', secondary: '#1B2232', secondaryForeground: '#ECEFF4',
        accent: '#47C2EB', accentForeground: '#142229', muted: '#1B2232', mutedForeground: '#96A3B6',
        border: '#242D42', fontScale: 1,
      },
    },
  },
};
