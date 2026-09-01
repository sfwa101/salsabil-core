import Link from 'next/link';
import type { Category } from '@/core/modules/catalog/types';

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/${category.slug}`}
      className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-6 transition hover:border-brand-green hover:shadow-sm"
    >
      <span className="text-lg font-medium text-stone-800">{category.name}</span>
      <span className="text-brand-green">←</span>
    </Link>
  );
}
