import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { ProductCard } from '@/components/ProductCard';

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: slug } = await params;
  const category = await catalogService.getCategoryBySlug(slug);

  if (!category || !category.isActive) {
    notFound();
  }

  const products = await catalogService.listProductsByCategory(category.id);
  const activeProducts = products.filter((p) => p.isActive);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/" className="mb-6 inline-block text-sm text-stone-500 hover:text-brand-green">
        → كل الأحياء
      </Link>
      <h1 className="mb-8 text-2xl font-semibold text-stone-900">{category.name}</h1>
      {activeProducts.length === 0 ? (
        <p className="text-stone-500">لا توجد منتجات في هذا القسم حالياً.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {activeProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
