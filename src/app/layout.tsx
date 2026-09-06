import type { Metadata } from 'next';
import './globals.css';
import { PersonalThemeInitializer } from '@/components/PersonalThemeInitializer';

export const metadata: Metadata = {
  title: 'سلسبيل — ديوان',
  description: 'ديوان سلسبيل — نظام تشغيل حضاري عربي-إسلامي',
};

// data-world="diwan" هو الافتراضي على غلاف التطبيق — كل عالم فرعي (ريف، ...)
// يعيد تعريفه على تخطيطه الخاص (docs/UI_UX_SYSTEM.md §8.3)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-world="diwan">
      <body>
        <PersonalThemeInitializer />
        {children}
      </body>
    </html>
  );
}
