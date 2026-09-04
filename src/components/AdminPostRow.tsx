'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { togglePublishAction, deletePostAction } from '@/app/admin/posts/actions';

interface AdminPostRowProps {
  postId: string;
  caption?: string;
  postTypeLabel: string;
  categoryName: string;
  priority: number;
  isPublished: boolean;
}

export function AdminPostRow({ postId, caption, postTypeLabel, categoryName, priority, isPublished }: AdminPostRowProps) {
  const router = useRouter();
  const [pending, setPending] = useState<'toggle' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setPending('toggle');
    setError(null);
    const result = await togglePublishAction(postId, !isPublished);
    setPending(null);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm('حذف هذا المنشور نهائياً؟ سيُحذَف مع كل صوره تلقائياً.')) return;
    setPending('delete');
    setError(null);
    const result = await deletePostAction(postId);
    setPending(null);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">{postTypeLabel}</span>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${
            isPublished ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          }`}
        >
          {isPublished ? 'منشور' : 'مسودة'}
        </span>
      </div>
      <p className="text-foreground">{caption || <span className="text-muted-foreground">بلا وصف</span>}</p>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{categoryName}</span>
        <span>الأولوية: {priority}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/posts/${postId}`}
          className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          تعديل
        </Link>
        <button
          onClick={handleToggle}
          disabled={pending !== null}
          className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
        >
          {pending === 'toggle' ? 'جارٍ التنفيذ...' : isPublished ? 'إلغاء النشر' : 'نشر'}
        </button>
        <button
          onClick={handleDelete}
          disabled={pending !== null}
          className="rounded-xl border border-destructive/30 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
        >
          {pending === 'delete' ? 'جارٍ الحذف...' : 'حذف'}
        </button>
      </div>
      {error && <span className="text-sm text-destructive">{error}</span>}
    </li>
  );
}
