// src/lib/personal-theme.ts
// آلية التخزين/التطبيق لمحور التفضيل الشخصي للثيمات (اليوم 30، BAYAN-HOME-FEED-001).
// localStorage فقط — بلا قاعدة بيانات (قرار مسبق). يضبط data-personal-theme/data-personal-mode
// على <html> — مستقل تماماً عن data-world (src/config/theme-registry.ts).
//
// ✅ تصحيح عطل حقيقي (COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS، بند 6، 2026-09-09):
// readStoredPersonalTheme() كانت تُعيد 'masculine' دائماً (DEFAULT_PERSONAL_THEME) حتى لزائر لم
// يفتح شيت الاختيار إطلاقاً — كان هذا بلا أثر بصري قبل إصلاح globals.css (--sb-pt-* غير مستهلَكة)،
// فمرّ بلا اكتشاف. بعد ربط --sb-pt-* بـ--sb-* فعلياً، كانت ستعني أن كل زائر جديد يرى تلقائياً هوية
// "رجالي" بدل هوية عالمه (أخضر ريف مثلاً) بلا أي اختيار منه — انحدار بصري حقيقي صامت. الإصلاح:
// "لم يُختَر ثيم بعد" حالة صريحة (`null`) لا تطبَّق كـ'masculine' — بلا اختيار فعلي = هوية العالم
// الافتراضية كما هي، تماماً كما كانت تظهر (نظرياً) قبل بناء هذا المحور أصلاً.
import { PERSONAL_THEMES, type PersonalColorMode, type PersonalThemeSlug } from '@/config/personal-theme-registry';

export const PERSONAL_THEME_STORAGE_KEY = 'sb_personal_theme';
export const PERSONAL_MODE_STORAGE_KEY = 'sb_personal_mode';

export const DEFAULT_PERSONAL_MODE: PersonalColorMode = 'light';

function isPersonalThemeSlug(value: string | null): value is PersonalThemeSlug {
  return !!value && value in PERSONAL_THEMES;
}

function isPersonalColorMode(value: string | null): value is PersonalColorMode {
  return value === 'light' || value === 'dark';
}

// null = لا تفضيل شخصي مخزَّن بعد (لم يفتح المستخدم الشيت أو لم يختر شيئاً) — الفارق الآن حقيقي
// بصرياً (راجع تعليق أعلى الملف)، لا مجرد تفصيل نوع (Type) نظري.
export function readStoredPersonalTheme(): PersonalThemeSlug | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(PERSONAL_THEME_STORAGE_KEY);
  return isPersonalThemeSlug(stored) ? stored : null;
}

export function readStoredPersonalMode(): PersonalColorMode {
  if (typeof window === 'undefined') return DEFAULT_PERSONAL_MODE;
  const stored = window.localStorage.getItem(PERSONAL_MODE_STORAGE_KEY);
  return isPersonalColorMode(stored) ? stored : DEFAULT_PERSONAL_MODE;
}

// theme = null بوضع 'light' → إزالة السمتين كلياً من <html> (لا "تطبيق ثيم افتراضي") — يسمح لتوكنز
// [data-world] العادية بالظهور بلا أي تدخل، بدل فرض 'masculine' على من لم يختر شيئاً بعد. لكن
// [data-world] الافتراضية فاتحة دائماً (globals.css) — theme = null بوضع 'dark' كان يعني عملياً
// "الغِ اختيار داكن صامتاً" (حذف كلا السمتين يُسقط قاعدة CSS المركَّبة التي تتطلبهما معاً)، لا تطبيقه
// فعلياً. الإصلاح: ثيم افتراضي معقول (DEFAULT_PERSONAL_THEME_FOR_DARK) يُطبَّق مع 'dark' في هذه الحالة
// تحديداً — المستخدم لم يفقد شيئاً (لم يكن قد اختار ثيماً أصلاً)، والوضع الداكن الذي طلبه صراحة يعمل.
export const DEFAULT_PERSONAL_THEME_FOR_DARK: PersonalThemeSlug = 'sage';

export function applyPersonalThemeToDocument(theme: PersonalThemeSlug | null, mode: PersonalColorMode): void {
  if (typeof document === 'undefined') return;
  const effectiveTheme = theme ?? (mode === 'dark' ? DEFAULT_PERSONAL_THEME_FOR_DARK : null);
  if (effectiveTheme) {
    document.documentElement.dataset.personalTheme = effectiveTheme;
    document.documentElement.dataset.personalMode = mode;
  } else {
    delete document.documentElement.dataset.personalTheme;
    delete document.documentElement.dataset.personalMode;
  }
}

export function persistPersonalTheme(theme: PersonalThemeSlug): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(PERSONAL_THEME_STORAGE_KEY, theme);
  applyPersonalThemeToDocument(theme, readStoredPersonalMode());
}

export function persistPersonalMode(mode: PersonalColorMode): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(PERSONAL_MODE_STORAGE_KEY, mode);
  applyPersonalThemeToDocument(readStoredPersonalTheme(), mode);
}
