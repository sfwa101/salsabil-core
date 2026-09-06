'use client';
// src/components/RecipeSheetContent.tsx
// وضع "وصفة" في Product/Recipe Bottom Sheet (اليوم 28، BAYAN-HOME-FEED-001) — عدّاد عدد أفراد
// العائلة يُعيد حساب كميات المكوّنات عبر scaleRecipeIngredientsAction (تمريرة رقيقة لـ
// bayanService.scaleRecipeQuantities القائمة من اليوم 23، لا تكرار للمنطق هنا)، ثم إضافة فردية لكل
// مكوّن أو "أضف الكل" (حلقة تسلسلية على addToCartAction القائمة — لا endpoint دفعة واحدة في السلة،
// نفس ما يحدث فعلياً لو أضاف المستخدم كل عنصر يدوياً بنفس الترتيب).

import { useEffect, useMemo, useState } from 'react';
import { getProductsByIdsAction, scaleRecipeIngredientsAction } from '@/app/(reef)/feed-actions';
import { addToCartAction } from '@/app/(reef)/cart/actions';
import type { RecipeLink } from '@/core/modules/bayan/types';
import type { AddItemInput } from '@/core/modules/cart/types';
import type { Product } from '@/core/modules/catalog/types';

type LineState = 'idle' | 'adding' | 'added' | 'error';

// منتجات المكوّنات قد تحمل خيار حجم إلزامياً (نفس قيد catalogService.validateSelection) — الوصفة لا
// تعرض واجهة اختيار حجم لكل مكوّن، فتختار الحجم الأول تلقائياً (نفس تهيئة ProductOptions.tsx
// الافتراضية: sizeOptions[0]) بدل ترك الإضافة تفشل بصمت لمنتج بخيارات.
function buildAddItemInput(product: Product, quantity: number): AddItemInput {
  const firstSize = product.options.find((o) => o.type === 'size');
  return { productId: product.id, quantity, selection: firstSize ? { sizeId: firstSize.id } : {} };
}

export function RecipeSheetContent({ recipe }: { recipe: RecipeLink }) {
  const [familySize, setFamilySize] = useState(recipe.baseFamilySize);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [lineStates, setLineStates] = useState<Record<string, LineState>>({});
  const [addAllState, setAddAllState] = useState<'idle' | 'adding' | 'done' | 'error'>('idle');

  const ingredientIds = useMemo(() => recipe.ingredients.map((i) => i.productId), [recipe]);

  useEffect(() => {
    let cancelled = false;
    getProductsByIdsAction(ingredientIds).then((result) => {
      if (!cancelled) setProducts(result);
    });
    return () => {
      cancelled = true;
    };
  }, [ingredientIds]);

  useEffect(() => {
    let cancelled = false;
    scaleRecipeIngredientsAction(recipe, familySize).then((scaled) => {
      if (cancelled) return;
      const next: Record<string, number> = {};
      scaled.forEach((s) => {
        next[s.productId] = s.quantity;
      });
      setQuantities(next);
    });
    return () => {
      cancelled = true;
    };
  }, [recipe, familySize]);

  async function addIngredient(product: Product): Promise<boolean> {
    setLineStates((prev) => ({ ...prev, [product.id]: 'adding' }));
    const quantity = quantities[product.id] ?? 1;
    const result = await addToCartAction(buildAddItemInput(product, quantity));
    const success = !('error' in result);
    setLineStates((prev) => ({ ...prev, [product.id]: success ? 'added' : 'error' }));
    return success;
  }

  // "أُضيف الكل ✓" لا يظهر إلا لو نجحت الإضافة فعلياً للكل — عرضها بلا شرط كان يُظهر نجاحاً وهمياً
  // حتى لو فشل مكوّن (مثلاً نفاد مخزونه)، بينما lineStates لكل صف يعرض الحالة الحقيقية أصلاً.
  async function addAll() {
    if (!products || products.length === 0) return;
    setAddAllState('adding');
    let allSucceeded = true;
    for (const product of products) {
      const success = await addIngredient(product);
      if (!success) allSucceeded = false;
    }
    setAddAllState(allSucceeded ? 'done' : 'error');
  }

  if (!products) {
    return <p className="py-6 text-center text-muted-foreground">جارٍ التحميل...</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between rounded-xl bg-muted p-3">
        <span className="text-sm font-medium text-foreground">عدد أفراد العائلة</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFamilySize((n) => Math.max(1, n - 1))}
            aria-label="إنقاص عدد الأفراد"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg text-foreground transition hover:bg-card"
          >
            −
          </button>
          <span className="w-6 text-center font-semibold text-foreground">{familySize}</span>
          <button
            type="button"
            onClick={() => setFamilySize((n) => n + 1)}
            aria-label="زيادة عدد الأفراد"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-lg text-foreground transition hover:bg-card"
          >
            +
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-center text-muted-foreground">لا توجد مكوّنات متاحة لهذه الوصفة حالياً</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{product.name}</span>
                <span className="text-sm text-muted-foreground">
                  {quantities[product.id] ?? '...'} {product.unit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => addIngredient(product)}
                disabled={lineStates[product.id] === 'adding'}
                className="shrink-0 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary/5 disabled:opacity-50"
              >
                {lineStates[product.id] === 'added'
                  ? 'أُضيف ✓'
                  : lineStates[product.id] === 'adding'
                    ? '...'
                    : lineStates[product.id] === 'error'
                      ? 'إعادة المحاولة'
                      : 'أضف'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {products.length > 0 && (
        <>
          <button
            type="button"
            onClick={addAll}
            disabled={addAllState === 'adding'}
            className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {addAllState === 'adding'
              ? 'جارٍ إضافة الكل...'
              : addAllState === 'done'
                ? 'أُضيف الكل ✓'
                : addAllState === 'error'
                  ? 'إعادة محاولة إضافة الكل'
                  : 'أضف الكل'}
          </button>
          {addAllState === 'error' && (
            <p className="text-center text-sm text-destructive">
              تعذّرت إضافة بعض المكوّنات — راجع الأزرار الفردية أعلاه لمعرفة أيّها فشل
            </p>
          )}
        </>
      )}
    </div>
  );
}
