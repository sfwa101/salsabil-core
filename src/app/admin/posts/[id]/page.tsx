import { redirect, notFound } from 'next/navigation';
import { getAdminSession } from '@/core/modules/admin/admin-session';
import { bayanService } from '@/core/modules/bayan/bayan.service';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { uuidSchema } from '@/core/kernel/validation/schemas';
import { PostForm } from '@/components/PostForm';

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    notFound();
  }

  const [post, media, categories, products] = await Promise.all([
    bayanService.getPostById(parsedId.data),
    bayanService.getPostMedia(parsedId.data),
    catalogService.listCategories(),
    catalogService.listAllProducts(),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold text-foreground">تعديل منشور</h1>
      <PostForm
        mode="edit"
        postId={post.id}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name }))}
        initial={{
          categoryId: post.categoryId,
          postType: post.postType,
          caption: post.caption ?? '',
          priority: post.priority,
          isPublished: post.isPublished,
          media: media
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((m) => ({ imageUrl: m.imageUrl, link: m.link })),
        }}
      />
    </main>
  );
}
