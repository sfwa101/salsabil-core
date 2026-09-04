import { redirect } from 'next/navigation';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { PostForm } from '@/components/PostForm';

export default async function NewPostPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const [categories, products] = await Promise.all([catalogService.listCategories(), catalogService.listAllProducts()]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-foreground">إنشاء منشور جديد</h1>
      <PostForm
        mode="create"
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
      />
    </main>
  );
}
