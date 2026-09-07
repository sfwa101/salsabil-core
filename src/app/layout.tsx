import type { Metadata } from 'next';
import './globals.css';
import { PersonalThemeInitializer } from '@/components/PersonalThemeInitializer';

export const metadata: Metadata = {
  title: 'سلسبيل — ديوان',
  description: 'ديوان سلسبيل — نظام تشغيل حضاري عربي-إسلامي',
};

// data-world="diwan" هو الافتراضي على غلاف التطبيق — كل عالم فرعي (ريف، ...)
// يعيد تعريفه على تخطيطه الخاص (docs/UI_UX_SYSTEM.md §8.3)
//
// ملاحظة (ADR-025، shadcn init): أداة shadcn init كانت أضافت هنا تلقائياً خط Geist (لاتيني بحت،
// next/font/google) كـ--font-sans عام على <html> — أُزيل عمداً: الخط لا يخدم محتوى عربياً (لا تغطية
// حروف عربية)، ويحسم ضمنياً سؤالاً مفتوحاً موثَّقاً صراحة كـPROPOSED (docs/UI_UX_SYSTEM.md §3 —
// Tajawal/Cairo مقترحان، لا قرار نهائي بعد) بلا نقاش. shadcn/ui نفسها لا تعتمد على وجوده — طبقتها
// @layer base في globals.css تطبّق font-sans على <html> بالفعل، فتسقط تلقائياً لمكدّس Tailwind
// الافتراضي (system-ui...) حتى يُحسَم اختيار خط عربي فعلي.
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
