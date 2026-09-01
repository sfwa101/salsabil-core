import Link from 'next/link';
import type { Category } from '@/core/modules/catalog/types';

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/${category.slug}`}
      className="flex items-center justify-between rounded-2xl border border-border bg-card p-6 transition hover:border-primary hover:shadow-sm"
    >
      <span className="text-lg font-medium text-card-foreground">{category.name}</span>
      <span className="text-primary">←</span>
    </Link>
  );
}
