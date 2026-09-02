// data-world="diwan" — لوحة الإدارة تشرف على المنظومة كلها، لا عالماً واحداً (عكس merchant/reef)
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-world="diwan" className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  );
}
