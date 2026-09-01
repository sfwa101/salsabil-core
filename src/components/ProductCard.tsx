import Link from 'next/link';
import type { Product } from '@/core/modules/catalog/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-brand-green hover:shadow-sm"
    >
      <span className="text-base font-medium text-stone-800">{product.name}</span>
      <span className="text-sm text-stone-500">
        يبدأ من <span className="font-semibold text-brand-green">{product.basePrice} جنيه</span>
      </span>
    </Link>
  );
}
