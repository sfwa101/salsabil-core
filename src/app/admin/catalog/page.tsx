import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { MasterItemForm } from '@/components/MasterItemForm';
import { MasterItemRow } from '@/components/MasterItemRow';

export default async function AdminCatalogPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }
  if (session.mustChangePassword) {
    redirect('/admin/change-password');
  }

  const [categories, masterItems, reviewQueue] = await Promise.all([
    catalogService.listCategories(),
    catalogService.listMasterItems(),
    catalogService.listReviewQueue(),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">الكتالوج الأساسي</h1>
        <Link href="/admin/dashboard" className="text-sm text-muted-foreground underline">
          → لوحة الإدارة
        </Link>
      </div>

      <Link
        href="/admin/catalog/review"
        className="self-start rounded-xl border border-border px-4 py-3 text-sm font-medium text-foreground transition hover:bg-muted"
      >
        قائمة مراجعة الاستيراد ({reviewQueue.length}) ←
      </Link>

      <MasterItemForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">المنتجات ({masterItems.length})</h2>
        {masterItems.length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد منتجات في الكتالوج الأساسي بعد</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {masterItems.map((item) => (
              <MasterItemRow
                key={item.id}
                id={item.id}
                name={item.name}
                categoryName={categoryNameById.get(item.categoryId) ?? '—'}
                unit={item.unit}
                basePrice={item.basePrice}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
