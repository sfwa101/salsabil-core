import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'سلسبيل — ريف المدينة',
  description: 'ديوان سلسبيل — تسوّق يومي من حيّك',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
