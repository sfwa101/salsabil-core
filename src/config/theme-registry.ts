// src/config/theme-registry.ts
// السجل المركزي لثيمات العوالم — فلسفة الخلايا الجذعية على طبقة الواجهة
// (docs/UI_UX_SYSTEM.md §8، ADR-007 في docs/DECISIONS.md)
//
// هذا السجل هو مصدر بيانات التوكنز الدلالية لكل عالم. القيم الفعلية المطبَّقة
// كـ CSS موجودة في src/app/globals.css تحت [data-world="<slug>"] — يجب أن تبقى
// متطابقة مع هذا الملف. shadcn/ui غير مثبّتة في هذا المشروع (تحقَّق منه فعلياً
// يوم 6 — لا components.json، لا cva/clsx)، لذا التوكنز هنا بصيغة Hex مباشرة
// بدل HSL، وتُستهلك عبر متغيرات CSS مسبوقة بـ --sb-.

export type WorldSlug = 'diwan' | 'reef' | 'reef-lavender' | 'asrab' | 'nabdh' | 'noor' | 'takween' | 'bayan';

export interface WorldSemanticTokens {
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
  destructive: string;
  destructiveForeground: string;
  /** ثابت عبر كل العوالم/الأوضاع (لا يتبادل بين الفاتح/الداكن كـforeground/background) — طبقة
   *  تعتيم/نص فوق وسائط عشوائية (فيديو Reels، تدرجات StoryBar). راجع globals.css → --sb-scrim. */
  scrim: string;
  scrimForeground: string;
}

export interface WorldTheme {
  slug: WorldSlug;
  name: { ar: string; en: string };
  tokens: WorldSemanticTokens;
}

// مشتركة عبر كل العوالم — لا تُخصَّص لكل عالم (docs/UI_UX_SYSTEM.md §8.2)
const DESTRUCTIVE = {
  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
} as const;

// ثابتة عبر كل العوالم *وكل الأوضاع* (لا [data-personal-mode] أيضاً، بعكس DESTRUCTIVE التي لا تزال
// نظرياً قابلة للتخصيص لكل عالم لو احتاج الأمر لاحقاً) — راجع تعليق --sb-scrim في globals.css.
const SCRIM = {
  scrim: '#000000',
  scrimForeground: '#FFFFFF',
} as const;

export const WORLD_THEMES: Record<WorldSlug, WorldTheme> = {
  diwan: {
    slug: 'diwan',
    name: { ar: 'ديوان سلسبيل', en: 'Diwan' },
    tokens: {
      background: '#FAF8FD',
      foreground: '#241B3D',
      card: '#FFFFFF',
      cardForeground: '#241B3D',
      primary: '#5B3E96',
      primaryForeground: '#FFFFFF',
      secondary: '#E4D9F5',
      secondaryForeground: '#3D2463',
      accent: '#8B6DC7',
      accentForeground: '#FFFFFF',
      muted: '#F1ECFA',
      mutedForeground: '#6E6285',
      border: '#E4DCF2',
      ...DESTRUCTIVE,
      ...SCRIM,
    },
  },
  reef: {
    slug: 'reef',
    name: { ar: 'ريف المدينة', en: 'Reef' },
    tokens: {
      // القيم الفعلية المُنفَّذة (اليوم 4-5) — لا تُغيَّر، فقط أُعيد تغليفها هنا (ADR-007)
      background: '#FAFBF7',
      foreground: '#1F2E24',
      card: '#FFFFFF',
      cardForeground: '#1F2E24',
      primary: '#2D6A4F',
      primaryForeground: '#FFFFFF',
      secondary: '#F4845F',
      secondaryForeground: '#FFFFFF',
      accent: '#F4A65F',
      accentForeground: '#2E1B0F',
      muted: '#EEF3EC',
      mutedForeground: '#5B6D5F',
      border: '#E3EDE6',
      ...DESTRUCTIVE,
      ...SCRIM,
    },
  },
  'reef-lavender': {
    slug: 'reef-lavender',
    name: { ar: 'ريف المدينة (لافندر)', en: 'Reef (Lavender)' },
    tokens: {
      // مُستخرَجة حرفياً (تحويل HSL→Hex دقيق، لا تقريب بصري) من ثيم "lavender" الحقيقي في مستودع
      // Lovable المرجعي (reefam-d6cc4e17، src/styles.css) — راجع docs/DECISIONS.md → ADR-023 للتفصيل
      // الكامل ومصدر كل قيمة. نفس هوية "ريف المدينة" التجارية (world_scope يبقى reef في بيان/الكتالوج)
      // بغلاف بصري بديل فقط — لا تُستبدَل قيم reef الأخضر أعلاه، تُضاف كخيار مستقل (طلب مؤسس صريح).
      background: '#FBF9FE',
      foreground: '#251C33',
      card: '#FEFCFF',
      cardForeground: '#251C33',
      primary: '#9561D1',
      primaryForeground: '#FEFCFF',
      secondary: '#F1E9FA',
      secondaryForeground: '#251C33',
      accent: '#EC79C6',
      accentForeground: '#FFFFFF',
      muted: '#F0ECF7',
      mutedForeground: '#766E82',
      border: '#E5DCF2',
      ...DESTRUCTIVE,
      ...SCRIM,
    },
  },
  asrab: {
    slug: 'asrab',
    name: { ar: 'أسراب طيبة', en: 'Asrab' },
    tokens: {
      background: '#F8F7F2',
      foreground: '#1E2620',
      card: '#FFFFFF',
      cardForeground: '#1E2620',
      primary: '#1B4B43',
      primaryForeground: '#FFFFFF',
      secondary: '#C9A15D',
      secondaryForeground: '#2E2107',
      accent: '#E4C88A',
      accentForeground: '#2E2107',
      muted: '#F0EEE3',
      mutedForeground: '#5C6A5E',
      border: '#E3DFC9',
      ...DESTRUCTIVE,
      ...SCRIM,
    },
  },
  nabdh: {
    slug: 'nabdh',
    name: { ar: 'نبض', en: 'Nabdh' },
    tokens: {
      background: '#F6FAFA',
      foreground: '#1C2B2A',
      card: '#FFFFFF',
      cardForeground: '#1C2B2A',
      primary: '#2F7A78',
      primaryForeground: '#FFFFFF',
      secondary: '#E8646B',
      secondaryForeground: '#FFFFFF',
      accent: '#9FD4D1',
      accentForeground: '#143332',
      muted: '#EAF4F3',
      mutedForeground: '#5A7472',
      border: '#DCEBEA',
      ...DESTRUCTIVE,
      ...SCRIM,
    },
  },
  noor: {
    slug: 'noor',
    name: { ar: 'نور الدين', en: 'Noor Al-Din' },
    tokens: {
      background: '#F7F8FB',
      foreground: '#1B2438',
      card: '#FFFFFF',
      cardForeground: '#1B2438',
      primary: '#24406B',
      primaryForeground: '#FFFFFF',
      secondary: '#E8A33D',
      secondaryForeground: '#2E1F04',
      accent: '#F0C878',
      accentForeground: '#2E1F04',
      muted: '#EEF1F7',
      mutedForeground: '#58627A',
      border: '#DCE2ED',
      ...DESTRUCTIVE,
      ...SCRIM,
    },
  },
  takween: {
    slug: 'takween',
    name: { ar: 'تكوين', en: 'Takween' },
    tokens: {
      background: '#F6F7F9',
      foreground: '#1E222B',
      card: '#FFFFFF',
      cardForeground: '#1E222B',
      primary: '#3B4252',
      primaryForeground: '#FFFFFF',
      secondary: '#5B6EF5',
      secondaryForeground: '#FFFFFF',
      accent: '#A9B3F5',
      accentForeground: '#232A4D',
      muted: '#ECEDF1',
      mutedForeground: '#5C6270',
      border: '#E1E4EA',
      ...DESTRUCTIVE,
      ...SCRIM,
    },
  },
  bayan: {
    slug: 'bayan',
    name: { ar: 'بيان', en: 'Bayan' },
    tokens: {
      background: '#FBF7F5',
      foreground: '#2B211D',
      card: '#FFFFFF',
      cardForeground: '#2B211D',
      primary: '#C97B5F',
      primaryForeground: '#FFFFFF',
      secondary: '#5FA8C9',
      secondaryForeground: '#FFFFFF',
      accent: '#E8B8A2',
      accentForeground: '#2E1D14',
      muted: '#F4EAE6',
      mutedForeground: '#6E5C54',
      border: '#EFDFD8',
      ...DESTRUCTIVE,
      ...SCRIM,
    },
  },
};
