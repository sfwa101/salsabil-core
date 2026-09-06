// src/lib/personal-theme.ts
// آلية التخزين/التطبيق لمحور التفضيل الشخصي للثيمات (اليوم 30، BAYAN-HOME-FEED-001).
// localStorage فقط — بلا قاعدة بيانات (قرار مسبق). يضبط data-personal-theme/data-personal-mode
// على <html> — مستقل تماماً عن data-world (src/config/theme-registry.ts).

import { PERSONAL_THEMES, type PersonalColorMode, type PersonalThemeSlug } from '@/config/personal-theme-registry';

export const PERSONAL_THEME_STORAGE_KEY = 'sb_personal_theme';
export const PERSONAL_MODE_STORAGE_KEY = 'sb_personal_mode';

export const DEFAULT_PERSONAL_THEME: PersonalThemeSlug = 'masculine';
export const DEFAULT_PERSONAL_MODE: PersonalColorMode = 'light';

function isPersonalThemeSlug(value: string | null): value is PersonalThemeSlug {
  return !!value && value in PERSONAL_THEMES;
}

function isPersonalColorMode(value: string | null): value is PersonalColorMode {
  return value === 'light' || value === 'dark';
}

export function readStoredPersonalTheme(): PersonalThemeSlug {
  if (typeof window === 'undefined') return DEFAULT_PERSONAL_THEME;
  const stored = window.localStorage.getItem(PERSONAL_THEME_STORAGE_KEY);
  return isPersonalThemeSlug(stored) ? stored : DEFAULT_PERSONAL_THEME;
}

export function readStoredPersonalMode(): PersonalColorMode {
  if (typeof window === 'undefined') return DEFAULT_PERSONAL_MODE;
  const stored = window.localStorage.getItem(PERSONAL_MODE_STORAGE_KEY);
  return isPersonalColorMode(stored) ? stored : DEFAULT_PERSONAL_MODE;
}

export function applyPersonalThemeToDocument(theme: PersonalThemeSlug, mode: PersonalColorMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.personalTheme = theme;
  document.documentElement.dataset.personalMode = mode;
}

export function persistPersonalTheme(theme: PersonalThemeSlug): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(PERSONAL_THEME_STORAGE_KEY, theme);
  applyPersonalThemeToDocument(theme, readStoredPersonalMode());
}

export function persistPersonalMode(mode: PersonalColorMode): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(PERSONAL_MODE_STORAGE_KEY, mode);
  applyPersonalThemeToDocument(readStoredPersonalTheme(), mode);
}
