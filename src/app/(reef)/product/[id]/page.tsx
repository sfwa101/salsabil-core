import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { ProductOptions } from '@/components/ProductOptions';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await catalogService.getProductById(id);

  if (!product || !product.isActive) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-6 inline-block text-sm text-muted-foreground hover:text-primary">
        → كل الأحياء
      </Link>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">{product.name}</h1>
      {product.description && <p className="mb-6 text-muted-foreground">{product.description}</p>}
      <ProductOptions product={product} />
    </main>
  );
}
