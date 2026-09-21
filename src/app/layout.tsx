import type { Metadata } from 'next';
import { Tajawal, Cairo } from 'next/font/google';
import './globals.css';
import { PersonalThemeInitializer } from '@/components/PersonalThemeInitializer';

export const metadata: Metadata = {
  title: 'سلسبيل — ديوان',
  description: 'ديوان سلسبيل — نظام تشغيل حضاري عربي-إسلامي',
};

// خط عربي حقيقي — Tajawal/Cairo (EXTRACT-DESIGN-DNA-AND-APPLY-ACROSS-ALL-SCREENS، المرحلة 2،
// 2026-09-08، قرار مؤسس مباشر). يحسم OPEN_QUESTION الموثَّق سابقاً في docs/UI_UX_SYSTEM.md §3
// (PROPOSED منذ اليوم 6) — الآن IMPLEMENTED فعلياً عبر next/font/google بمجموعتي أحرف
// arabic+latin، لا Google Fonts <link> يدوي (يتفادى Layout Shift، يُحمَّل كخط ذاتي الاستضافة).
//
// ملاحظة تاريخية (ADR-025، shadcn init): كانت أداة shadcn init أضافت هنا خط Geist (لاتيني بحت) —
// أُزيل حينها عمداً لعدم تغطيته العربية ولعدم حسم سؤال Tajawal/Cairo بلا نقاش. هذا القرار الحالي هو
// الحسم الصريح المؤجَّل حينها، لا نقضاً له.
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-tajawal',
  display: 'swap',
});
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  variable: '--font-cairo',
  display: 'swap',
});

// data-world="diwan" هو الافتراضي على غلاف التطبيق — كل عالم فرعي (ريف، ...)
// يعيد تعريفه على تخطيطه الخاص (docs/UI_UX_SYSTEM.md §8.3)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" data-world="diwan" className={`${tajawal.variable} ${cairo.variable}`}>
      <body className="bg-[var(--sb-muted)]">
        <PersonalThemeInitializer />
        {children}
      </body>
    </html>
  );
}
