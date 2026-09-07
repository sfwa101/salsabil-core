// data-world يعيد تعريف التوكنز الدلالية لهذا القسم فقط من الشجرة (docs/UI_UX_SYSTEM.md §8.3) —
// المكوّنات داخله لا تتغيّر، فقط القيم تحتها. "reef-lavender" (لا "reef" الأخضر) هو الغلاف البصري
// الفعلي المُفعَّل الآن (RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS، قرار مؤسس صريح) — القيم الخضراء
// تبقى معرَّفة بالكامل في theme-registry.ts/globals.css، لم تُحذَف، فقط لم تعد الافتراضي. راجع
// docs/DECISIONS.md → ADR-023.
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';

export default function ReefLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-world="reef-lavender" className="min-h-screen bg-background text-foreground">
      <Header />
      {/* pb-20: يمنع BottomNav (fixed bottom-0، BAYAN-CLOSEOUT-UI-GAPS) من تغطية آخر عنصر في أي
          صفحة (reef) */}
      <div className="pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
