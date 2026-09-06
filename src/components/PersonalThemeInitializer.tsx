'use client';
// src/components/PersonalThemeInitializer.tsx
// يُطبِّق تفضيل الثيم الشخصي المخزَّن في localStorage على <html> عند التركيب (اليوم 30،
// BAYAN-HOME-FEED-001) — بلا عرض مرئي. مُركَّب مرة واحدة في src/app/layout.tsx (الغلاف الجذري)،
// مستقل تماماً عن data-world الموجود على نفس العنصر (src/config/theme-registry.ts).
//
// ملاحظة معروفة (لا DECISION-DEBT، خطر بصري تافه بلا مستهلك واجهة حقيقي بعد): أول رسمة تصل بلا
// data-personal-theme (لا كوكي SSR — قرار localStorage-فقط)، فتُطبَّق السمتان فقط بعد هذا الأثر —
// فلاش قصير محتمل، مقبول لبنية تحتية اليوم بلا واجهة تستهلكها فعلياً بعد.

import { useEffect } from 'react';
import { applyPersonalThemeToDocument, readStoredPersonalMode, readStoredPersonalTheme } from '@/lib/personal-theme';

export function PersonalThemeInitializer() {
  useEffect(() => {
    applyPersonalThemeToDocument(readStoredPersonalTheme(), readStoredPersonalMode());
  }, []);

  return null;
}
