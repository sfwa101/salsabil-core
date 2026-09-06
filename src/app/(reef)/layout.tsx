// data-world="reef" يعيد تعريف التوكنز الدلالية لهذا القسم فقط من الشجرة
// (docs/UI_UX_SYSTEM.md §8.3) — المكوّنات داخله لا تتغيّر، فقط القيم تحتها
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';

export default function ReefLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-world="reef" className="min-h-screen bg-background text-foreground">
      <Header />
      {/* pb-20: يمنع BottomNav (fixed bottom-0، BAYAN-CLOSEOUT-UI-GAPS) من تغطية آخر عنصر في أي
          صفحة (reef) */}
      <div className="pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
