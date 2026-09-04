import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { bayanService } from '@/core/modules/bayan/bayan.service';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { POST_TYPE_LABELS_AR } from '@/core/modules/bayan/types';
import { AdminPostRow } from '@/components/AdminPostRow';

export default async function AdminPostsPage() {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const [posts, categories] = await Promise.all([bayanService.listAllPosts(), catalogService.listCategories()]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">لوحة إدارة بيان — المنشورات</h1>
        <Link
          href="/admin/dashboard"
          className="text-sm text-muted-foreground underline"
        >
          العودة للوحة الإدارة
        </Link>
      </div>

      <Link
        href="/admin/posts/new"
        className="self-start rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
      >
        + إنشاء منشور جديد
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium text-foreground">كل المنشورات ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="text-center text-muted-foreground">لا توجد منشورات بعد</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {posts.map((post) => (
              <AdminPostRow
                key={post.id}
                postId={post.id}
                caption={post.caption}
                postTypeLabel={POST_TYPE_LABELS_AR[post.postType]}
                categoryName={categoryNameById.get(post.categoryId) ?? 'قسم غير معروف'}
                priority={post.priority}
                isPublished={post.isPublished}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
