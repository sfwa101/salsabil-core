import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { adminService } from '@/core/modules/admin/admin.service';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { ReviewQueueRow } from '@/components/ReviewQueueRow';

export default async function AdminCatalogReviewPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }
  if (session.mustChangePassword) {
    redirect('/admin/change-password');
  }

  const [reviewQueue, categories, masterItems, merchants] = await Promise.all([
    catalogService.listReviewQueue(),
    catalogService.listCategories(),
    catalogService.listMasterItems(),
    adminService.listMerchants(),
  ]);
  const merchantNameById = new Map(merchants.map((m) => [m.id, m.businessName]));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">قائمة مراجعة الاستيراد</h1>
        <Link href="/admin/catalog" className="text-sm text-muted-foreground underline">
          → الكتالوج الأساسي
        </Link>
      </div>

      {reviewQueue.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
          لا توجد صفوف بانتظار المراجعة
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reviewQueue.map((item) => (
            <ReviewQueueRow
              key={item.id}
              queueId={item.id}
              tenantBusinessName={merchantNameById.get(item.tenantId) ?? '—'}
              rawName={item.rawName}
              quantity={item.quantity}
              costPrice={item.costPrice}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              masterItems={masterItems.map((m) => ({ id: m.id, name: m.name }))}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
