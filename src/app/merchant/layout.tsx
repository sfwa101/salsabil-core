// data-world="reef-lavender" — بوابة التاجر تخدم تجار ريف المدينة حالياً، بنفس الغلاف البصري
// المُفعَّل على (reef)/layout.tsx (RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS، ADR-023). OrderRow.tsx
// المشترك مع لوحة الإدارة (data-world="diwan") لا يتغيّر — محايد لونياً بالكامل أصلاً.
export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-world="reef-lavender" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
