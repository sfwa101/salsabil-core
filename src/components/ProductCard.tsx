import Link from 'next/link';
import type { Product } from '@/core/modules/catalog/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/product/${product.id}`}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 transition hover:border-primary hover:shadow-sm"
    >
      <span className="text-base font-medium text-card-foreground">{product.name}</span>
      <span className="text-sm text-muted-foreground">
        يبدأ من <span className="font-semibold text-primary">{product.basePrice} جنيه</span>
      </span>
    </Link>
  );
}
