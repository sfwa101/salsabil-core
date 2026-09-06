'use client';
// src/components/PersonalThemeSheet.tsx
// نقطة الدخول الوحيدة لاختيار الثيم الشخصي (BAYAN-CLOSEOUT-UI-GAPS) — يُغلِق فجوة "لا مكوّن UI
// لاختيار الثيم" المكتشفة يوم 30 (docs/CHANGELOG.md اليوم 30/32). يستهلك BottomSheet.tsx القائم +
// persistPersonalTheme/persistPersonalMode/readStoredPersonalTheme/readStoredPersonalMode
// (src/lib/personal-theme.ts، موجودتان فعلياً منذ اليوم 30) — لا منطق تخزين/تطبيق جديد هنا، تركيب
// واجهة فقط. تطبيق فوري عند كل اختيار (لا زر "حفظ" منفصل)، نفس فلسفة عدم وجود حالة وسيطة.
//
// يُركَّب في src/app/(reef)/account/page.tsx.

import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { PERSONAL_THEMES, type PersonalColorMode, type PersonalThemeSlug } from '@/config/personal-theme-registry';
import { persistPersonalMode, persistPersonalTheme, readStoredPersonalMode, readStoredPersonalTheme } from '@/lib/personal-theme';

const MODES: { value: PersonalColorMode; label: string }[] = [
  { value: 'light', label: 'فاتح' },
  { value: 'dark', label: 'داكن' },
];

export function PersonalThemeSheet() {
  const [open, setOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<PersonalThemeSlug | null>(null);
  const [selectedMode, setSelectedMode] = useState<PersonalColorMode | null>(null);

  useEffect(() => {
    setSelectedTheme(readStoredPersonalTheme());
    setSelectedMode(readStoredPersonalMode());
  }, []);

  function chooseTheme(theme: PersonalThemeSlug) {
    setSelectedTheme(theme);
    persistPersonalTheme(theme);
  }

  function chooseMode(mode: PersonalColorMode) {
    setSelectedMode(mode);
    persistPersonalMode(mode);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-start text-foreground transition hover:bg-muted"
      >
        <Palette size={20} className="shrink-0 text-primary" />
        <span className="flex-1 font-medium">مظهر التطبيق</span>
        <span className="text-sm text-muted-foreground">
          {selectedTheme ? PERSONAL_THEMES[selectedTheme].name.ar : '...'}
        </span>
      </button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="اختر مظهرك الشخصي">
        <div className="flex flex-col gap-5">
          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">الوضع</h3>
            <div className="flex gap-2">
              {MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => chooseMode(mode.value)}
                  className={`flex-1 rounded-xl border p-3 text-sm font-medium transition ${
                    selectedMode === mode.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">الثيم</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PERSONAL_THEMES).map((theme) => (
                <button
                  key={theme.slug}
                  type="button"
                  onClick={() => chooseTheme(theme.slug)}
                  className={`rounded-xl border p-3 text-sm font-medium transition ${
                    selectedTheme === theme.slug ? 'border-primary bg-primary/5 text-primary' : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {theme.name.ar}
                </button>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
