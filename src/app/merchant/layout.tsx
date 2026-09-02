// data-world="reef" — بوابة التاجر تخدم تجار ريف المدينة حالياً (نفس نمط (reef)/layout.tsx)
export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-world="reef" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
