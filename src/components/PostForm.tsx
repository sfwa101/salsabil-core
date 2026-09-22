'use client';
// أول نموذج إنشاء متعدد الحقول في التطبيق (اليوم 24) — منشور بيان: حقول أساسية + صفوف صور
// ديناميكية، كل صف يحمل منتقي نوع رابط (none/product/recipe)، والوصفة نفسها قائمة مكوّنات
// ديناميكية متداخلة. لا رفع صور فعلي — رابط نصي فقط (قرار نطاق اليوم 23، راجع docs/CHANGELOG.md).

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PostType, PostMediaLink, VideoSource } from '@/core/modules/bayan/types';
import { POST_TYPES, POST_TYPE_LABELS_AR, VIDEO_SOURCES, VIDEO_SOURCE_LABELS_AR } from '@/core/modules/bayan/types';
import { createPostAction, updatePostAction, type PostFormInput } from '@/app/admin/posts/actions';

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
}

interface MediaFormRow {
  key: string; // معرّف محلي فقط (React key) — لا يُرسَل للخادم
  imageUrl: string;
  linkType: PostMediaLink['type'];
  productId: string;
  recipeTitle: string;
  recipeBaseFamilySize: string;
  ingredients: { key: string; productId: string; baseQuantity: string }[];
}

interface PostFormInitial {
  categoryId: string;
  postType: PostType;
  caption: string;
  priority: number;
  isPublished: boolean;
  media: { imageUrl: string; link: PostMediaLink }[];
  productIds: string[]; // الرف الأفقي (post_products) — مستقل عن روابط الصور الفردية أعلاه
  // DD-024 — تُستخدَم فقط لـpostType==='reel'
  videoUrl?: string;
  videoSource?: VideoSource;
}

interface PostFormProps {
  mode: 'create' | 'edit';
  postId?: string;
  categories: CategoryOption[];
  products: ProductOption[];
  initial?: PostFormInitial;
}

function newKey(): string {
  return Math.random().toString(36).slice(2);
}

function mediaLinkToRow(link: PostMediaLink): Pick<MediaFormRow, 'linkType' | 'productId' | 'recipeTitle' | 'recipeBaseFamilySize' | 'ingredients'> {
  if (link.type === 'product') {
    return { linkType: 'product', productId: link.productId, recipeTitle: '', recipeBaseFamilySize: '', ingredients: [] };
  }
  if (link.type === 'recipe') {
    return {
      linkType: 'recipe',
      productId: '',
      recipeTitle: link.title,
      recipeBaseFamilySize: String(link.baseFamilySize),
      ingredients: link.ingredients.map((i) => ({ key: newKey(), productId: i.productId, baseQuantity: String(i.baseQuantity) })),
    };
  }
  return { linkType: 'none', productId: '', recipeTitle: '', recipeBaseFamilySize: '', ingredients: [] };
}

function emptyMediaRow(): MediaFormRow {
  return { key: newKey(), imageUrl: '', linkType: 'none', productId: '', recipeTitle: '', recipeBaseFamilySize: '', ingredients: [] };
}

export function PostForm({ mode, postId, categories, products, initial }: PostFormProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? '');
  const [postType, setPostType] = useState<PostType>(initial?.postType ?? 'post');
  const [caption, setCaption] = useState(initial?.caption ?? '');
  const [priority, setPriority] = useState(String(initial?.priority ?? 0));
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [media, setMedia] = useState<MediaFormRow[]>(
    initial?.media.map((m) => ({ key: newKey(), imageUrl: m.imageUrl, ...mediaLinkToRow(m.link) })) ?? []
  );
  const [productIds, setProductIds] = useState<string[]>(initial?.productIds ?? []);
  const [productToAdd, setProductToAdd] = useState('');
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? '');
  const [videoSource, setVideoSource] = useState<VideoSource | ''>(initial?.videoSource ?? '');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  function addShelfProduct() {
    if (!productToAdd || productIds.includes(productToAdd)) return;
    setProductIds((ids) => [...ids, productToAdd]);
    setProductToAdd('');
  }

  function removeShelfProduct(productId: string) {
    setProductIds((ids) => ids.filter((id) => id !== productId));
  }

  function updateRow(key: string, patch: Partial<MediaFormRow>) {
    setMedia((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setMedia((rows) => [...rows, emptyMediaRow()]);
  }

  function removeRow(key: string) {
    setMedia((rows) => rows.filter((r) => r.key !== key));
  }

  function addIngredient(rowKey: string) {
    setMedia((rows) =>
      rows.map((r) =>
        r.key === rowKey ? { ...r, ingredients: [...r.ingredients, { key: newKey(), productId: '', baseQuantity: '1' }] } : r
      )
    );
  }

  function removeIngredient(rowKey: string, ingredientKey: string) {
    setMedia((rows) =>
      rows.map((r) => (r.key === rowKey ? { ...r, ingredients: r.ingredients.filter((i) => i.key !== ingredientKey) } : r))
    );
  }

  function updateIngredient(rowKey: string, ingredientKey: string, patch: Partial<{ productId: string; baseQuantity: string }>) {
    setMedia((rows) =>
      rows.map((r) =>
        r.key === rowKey
          ? { ...r, ingredients: r.ingredients.map((i) => (i.key === ingredientKey ? { ...i, ...patch } : i)) }
          : r
      )
    );
  }

  function buildLink(row: MediaFormRow): PostMediaLink {
    if (row.linkType === 'product') {
      return { type: 'product', productId: row.productId };
    }
    if (row.linkType === 'recipe') {
      return {
        type: 'recipe',
        title: row.recipeTitle,
        baseFamilySize: Number(row.recipeBaseFamilySize) || 1,
        ingredients: row.ingredients.map((i) => ({ productId: i.productId, baseQuantity: Number(i.baseQuantity) || 0 })),
      };
    }
    return { type: 'none' };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);

    const input: PostFormInput = {
      categoryId,
      postType,
      caption: caption.trim() || undefined,
      priority: Number(priority) || 0,
      isPublished,
      media: media.map((row) => ({ imageUrl: row.imageUrl, link: buildLink(row) })),
      productIds,
      videoUrl: postType === 'reel' ? videoUrl.trim() || undefined : undefined,
      videoSource: postType === 'reel' ? videoSource || undefined : undefined,
    };

    const result = mode === 'create' ? await createPostAction(input) : await updatePostAction(postId!, input);

    if ('error' in result) {
      setStatus('error');
      setError(result.error);
      return;
    }
    router.push('/admin/posts');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">الحي (القسم)</label>
        <select
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">نوع المنشور</label>
        <select
          value={postType}
          onChange={(e) => setPostType(e.target.value as PostType)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        >
          {POST_TYPES.map((t) => (
            <option key={t} value={t}>
              {POST_TYPE_LABELS_AR[t]}
            </option>
          ))}
        </select>
      </div>

      {/* DD-024 — تظهر فقط لنوع "ريل": رابط فيديو خارجي (يستورد، لا يُرفَع) + المنصة. راجع
          reel-embed.ts لكيفية تحويلهما لرابط تضمين فعلي عند عرض الريل في الخلاصة. */}
      {postType === 'reel' && (
        <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
          <h3 className="font-medium text-foreground">بيانات الريل (فيديو مستورَد برابط خارجي)</h3>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">رابط الفيديو</label>
            <input
              required
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="rounded-xl border border-border bg-card p-3 text-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">المنصة</label>
            <select
              required
              value={videoSource}
              onChange={(e) => setVideoSource(e.target.value as VideoSource)}
              className="rounded-xl border border-border bg-card p-3 text-foreground"
            >
              <option value="" disabled>
                اختر منصة
              </option>
              {VIDEO_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {VIDEO_SOURCE_LABELS_AR[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">الوصف (اختياري)</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-muted-foreground">الأولوية (ترتيب الظهور — الأعلى أولاً)</label>
        <input
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="rounded-xl border border-border bg-card p-3 text-foreground"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
        نشر فوراً (بدلاً من حفظه كمسودة)
      </label>

      <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">صور المنشور ({media.length})</h3>
          <button
            type="button"
            onClick={addRow}
            className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            + إضافة صورة
          </button>
        </div>

        {media.length === 0 && <p className="text-sm text-muted-foreground">لا توجد صور بعد</p>}

        {media.map((row, index) => (
          <div key={row.key} className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>صورة #{index + 1}</span>
              <button type="button" onClick={() => removeRow(row.key)} className="text-destructive underline">
                حذف الصورة
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">رابط الصورة</label>
              <input
                required
                type="url"
                value={row.imageUrl}
                onChange={(e) => updateRow(row.key, { imageUrl: e.target.value })}
                placeholder="https://..."
                className="rounded-xl border border-border bg-card p-3 text-foreground"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted-foreground">نوع الرابط</label>
              <select
                value={row.linkType}
                onChange={(e) => updateRow(row.key, { linkType: e.target.value as PostMediaLink['type'] })}
                className="rounded-xl border border-border bg-card p-3 text-foreground"
              >
                <option value="none">بلا رابط</option>
                <option value="product">منتج</option>
                <option value="recipe">وصفة</option>
              </select>
            </div>

            {row.linkType === 'product' && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-muted-foreground">المنتج</label>
                <select
                  required
                  value={row.productId}
                  onChange={(e) => updateRow(row.key, { productId: e.target.value })}
                  className="rounded-xl border border-border bg-card p-3 text-foreground"
                >
                  <option value="" disabled>
                    اختر منتجاً
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {row.linkType === 'recipe' && (
              <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">اسم الوصفة</label>
                  <input
                    required
                    value={row.recipeTitle}
                    onChange={(e) => updateRow(row.key, { recipeTitle: e.target.value })}
                    className="rounded-xl border border-border bg-background p-3 text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-muted-foreground">أساس القياس (عدد أفراد العائلة)</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={row.recipeBaseFamilySize}
                    onChange={(e) => updateRow(row.key, { recipeBaseFamilySize: e.target.value })}
                    className="rounded-xl border border-border bg-background p-3 text-foreground"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">المكوّنات ({row.ingredients.length})</span>
                  <button
                    type="button"
                    onClick={() => addIngredient(row.key)}
                    className="text-sm text-primary underline"
                  >
                    + إضافة مكوّن
                  </button>
                </div>

                {row.ingredients.map((ingredient) => (
                  <div key={ingredient.key} className="flex items-end gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <label className="text-xs text-muted-foreground">المنتج</label>
                      <select
                        required
                        value={ingredient.productId}
                        onChange={(e) => updateIngredient(row.key, ingredient.key, { productId: e.target.value })}
                        className="rounded-xl border border-border bg-background p-2 text-foreground"
                      >
                        <option value="" disabled>
                          اختر منتجاً
                        </option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex w-24 flex-col gap-1">
                      <label className="text-xs text-muted-foreground">الكمية الأساسية</label>
                      <input
                        required
                        type="number"
                        min={0}
                        step="any"
                        value={ingredient.baseQuantity}
                        onChange={(e) => updateIngredient(row.key, ingredient.key, { baseQuantity: e.target.value })}
                        className="rounded-xl border border-border bg-background p-2 text-foreground"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeIngredient(row.key, ingredient.key)}
                      className="rounded-xl border border-destructive/30 px-2 py-2 text-sm text-destructive"
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
        <h3 className="font-medium text-foreground">المنتجات المرتبطة (الرف الأفقي أسفل المنشور)</h3>
        <p className="text-sm text-muted-foreground">
          مستقل عن روابط الصور أعلاه — منتجات تُعرَض في رف تمرير أفقي أسفل المنشور في الخلاصة.
        </p>

        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-sm font-medium text-muted-foreground">إضافة منتج للرف</label>
            <select
              value={productToAdd}
              onChange={(e) => setProductToAdd(e.target.value)}
              className="rounded-xl border border-border bg-card p-3 text-foreground"
            >
              <option value="">اختر منتجاً</option>
              {products
                .filter((p) => !productIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
          <button
            type="button"
            onClick={addShelfProduct}
            disabled={!productToAdd}
            className="rounded-xl border border-border px-3 py-3 text-sm font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
          >
            + إضافة
          </button>
        </div>

        {productIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد منتجات في الرف بعد</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {productIds.map((id, index) => {
              const product = products.find((p) => p.id === id);
              return (
                <li
                  key={id}
                  className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-2 text-sm"
                >
                  <span className="text-foreground">
                    {index + 1}. {product?.name ?? id}
                  </span>
                  <button type="button" onClick={() => removeShelfProduct(id)} className="text-destructive underline">
                    إزالة
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-xl bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {status === 'submitting' ? 'جارٍ الحفظ...' : mode === 'create' ? 'إنشاء المنشور' : 'حفظ التعديلات'}
      </button>
      {status === 'error' && error && <span className="text-center text-sm text-destructive">{error}</span>}
    </form>
  );
}
