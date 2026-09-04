// src/components/HorizontalShelf.tsx
// مكوّن مشترك عام (اليوم 25) — رف تمرير أفقي بعنوان اختياري. لا يفرض شكل/عرض العناصر الداخلية؛
// كل عنصر (بطاقة منتج، بطاقة وصفة...) مسؤول عن `shrink-0` وعرضه الخاص حتى لا ينضغط داخل الرف.
// الاستخدام المقصود (حسب تأكيد المؤسس): مكوّن واحد عام يخدم كل الحالات — رف منتجات بيان
// (post_products، اليوم 24)، رف "اشتريت مؤخراً"، رف "الأكثر مبيعاً" (CONSTITUTION §7.1) على حدٍّ سواء.
// بلا ربط ببيانات حقيقية بعد — الربط الفعلي في الأيام 26-27.

interface HorizontalShelfProps {
  title?: string;
  children: React.ReactNode;
  emptyMessage?: string;
}

export function HorizontalShelf({ title, children, emptyMessage }: HorizontalShelfProps) {
  const isEmpty = !Array.isArray(children) ? !children : children.length === 0;

  return (
    <section className="flex flex-col gap-3">
      {title && <h2 className="px-1 text-lg font-medium text-foreground">{title}</h2>}
      {isEmpty && emptyMessage ? (
        <p className="px-1 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-1 pb-1">
          {children}
        </div>
      )}
    </section>
  );
}
