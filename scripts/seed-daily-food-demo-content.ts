// scripts/seed-daily-food-demo-content.ts
// SEED-REAL-DEMO-CONTENT — يزرع محتوى بيان حقيقياً ودائماً (لا اختبار ذاتي التنظيف) على قاعدة
// التطوير المحلية: 8 منتجات إضافية في "حي الطعام اليومي" (daily-food) + 5 منشورات منشورة فوراً
// (4 product_highlight + منشور وصفة واحد يختبر RecipeSheet). Idempotent عبر مفاتيح طبيعية (اسم
// المنتج / caption المنشور) — آمن لإعادة التشغيل بلا تكرار صفوف.
//
// التشغيل: npx tsx scripts/seed-daily-food-demo-content.ts
//
// DD-015 (2026-09-10) — روابط placehold.co كانت بلا لاحقة صيغة صريحة (`?text=...` فقط)، فتُخدَّم
// `image/svg+xml` افتراضياً من المصدر؛ Next.js Image Optimizer يرفض SVG افتراضياً (`400`،
// `dangerouslyAllowSVG` غير مفعَّل — إعداد أمان قياسي، **لم يُغيَّر هنا** بقرار مؤسس صريح: تعديل
// الروابط أنظف وأأمن من فتح الباب لأي SVG مستقبلي). أُضيفت `.png` صريحة لكل رابط — نفس الحل المطبَّق
// أصلاً في scripts/seed-real-neighborhoods-demo-content.ts. تحقَّقتُ حياً أن 8 منتجات هذا السكربت
// بالضبط هي كل ما تأثَّر فعلياً في القاعدة الحية (لا صفوف post_media بـplacehold.co حالياً).

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(dirname, '..', '.env.local');
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const { createClient } = await import('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error('✗ متغيرات بيئة Supabase ناقصة في .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

type ProductSeed = {
  name: string;
  description: string;
  basePrice: number;
  unit: string;
  imageUrl: string;
  stock: number;
};

const PRODUCTS: ProductSeed[] = [
  {
    name: 'أرز مصري أبيض (كيس 1 كجم)',
    description: 'أرز مصري أبيض فاخر، حبة كاملة، مناسب للطبخ اليومي والمناسبات.',
    basePrice: 35,
    unit: 'kg',
    imageUrl: 'https://placehold.co/800x800/f5deb3/5a3d1f.png?text=Rice',
    stock: 60,
  },
  {
    name: 'سكر أبيض مكرر (كيس 1 كجم)',
    description: 'سكر أبيض مكرر ناعم، معبأ بإحكام للحفاظ على النقاء.',
    basePrice: 32,
    unit: 'kg',
    imageUrl: 'https://placehold.co/800x800/ffffff/333333.png?text=Sugar',
    stock: 60,
  },
  {
    name: 'زيت عباد شمس (زجاجة 1 لتر)',
    description: 'زيت عباد شمس نقي 100%، مناسب للقلي والطبخ اليومي.',
    basePrice: 65,
    unit: 'liter',
    imageUrl: 'https://placehold.co/800x800/f4c430/6b4e00.png?text=Oil',
    stock: 40,
  },
  {
    name: 'بيض بلدي طازج (طبق 30 بيضة)',
    description: 'بيض بلدي طازج يومياً من مزارع محلية، طبق كامل 30 بيضة.',
    basePrice: 130,
    unit: 'tray',
    imageUrl: 'https://placehold.co/800x800/fff3d6/8a6d00.png?text=Eggs',
    stock: 25,
  },
  {
    name: 'طماطم بلدي طازجة (كجم)',
    description: 'طماطم بلدي حمراء طازجة، تُقطف يومياً.',
    basePrice: 18,
    unit: 'kg',
    imageUrl: 'https://placehold.co/800x800/c0392b/ffffff.png?text=Tomatoes',
    stock: 80,
  },
  {
    name: 'بصل أصفر طازج (كجم)',
    description: 'بصل أصفر طازج، حبات متوسطة الحجم منتقاة.',
    basePrice: 15,
    unit: 'kg',
    imageUrl: 'https://placehold.co/800x800/e8c39e/5a3d1f.png?text=Onions',
    stock: 80,
  },
  {
    name: 'خبز بلدي طازج (5 أرغفة)',
    description: 'خبز بلدي طازج يومياً، يُخبز صباحاً.',
    basePrice: 10,
    unit: 'pack',
    imageUrl: 'https://placehold.co/800x800/d9a45f/4a2f11.png?text=Bread',
    stock: 100,
  },
  {
    name: 'جبنة بيضاء قريش (نصف كيلو)',
    description: 'جبنة بيضاء طرية، مناسبة للفطار والطبخ.',
    basePrice: 55,
    unit: '500g',
    imageUrl: 'https://placehold.co/800x800/fdfdfd/444444.png?text=Cheese',
    stock: 30,
  },
];

async function upsertProduct(categoryId: string, tenantId: string, seed: ProductSeed) {
  const { data: existing, error: findErr } = await admin
    .from('products')
    .select('id')
    .eq('category_id', categoryId)
    .eq('name', seed.name)
    .maybeSingle();
  if (findErr) throw findErr;

  let productId: string;
  if (existing) {
    productId = existing.id as string;
    const { error: updateErr } = await admin
      .from('products')
      .update({
        description: seed.description,
        base_price: seed.basePrice,
        unit: seed.unit,
        image_url: seed.imageUrl,
        is_active: true,
      })
      .eq('id', productId);
    if (updateErr) throw updateErr;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from('products')
      .insert({
        category_id: categoryId,
        tenant_id: tenantId,
        name: seed.name,
        description: seed.description,
        base_price: seed.basePrice,
        unit: seed.unit,
        image_url: seed.imageUrl,
        is_active: true,
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;
    productId = inserted.id as string;
  }

  const { error: invErr } = await admin
    .from('inventory')
    .upsert({ product_id: productId, quantity_available: seed.stock, updated_at: new Date().toISOString() }, { onConflict: 'product_id' });
  if (invErr) throw invErr;

  return productId;
}

async function upsertPost(input: {
  worldScope: string;
  categoryId: string;
  postType: 'post' | 'reel' | 'product_highlight' | 'offer';
  caption: string;
  priority: number;
  media: Array<{ imageUrl: string; displayOrder: number; link: Record<string, unknown> }>;
  productIds: string[];
}) {
  const { data: existing, error: findErr } = await admin.from('posts').select('id').eq('caption', input.caption).maybeSingle();
  if (findErr) throw findErr;

  let postId: string;
  if (existing) {
    postId = existing.id as string;
    await admin.from('post_media').delete().eq('post_id', postId);
    await admin.from('post_products').delete().eq('post_id', postId);
    const { error: updateErr } = await admin
      .from('posts')
      .update({ is_published: true, priority: input.priority })
      .eq('id', postId);
    if (updateErr) throw updateErr;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from('posts')
      .insert({
        world_scope: input.worldScope,
        category_id: input.categoryId,
        post_type: input.postType,
        caption: input.caption,
        is_published: true,
        priority: input.priority,
      })
      .select('id')
      .single();
    if (insertErr) throw insertErr;
    postId = inserted.id as string;
  }

  const { error: mediaErr } = await admin.from('post_media').insert(
    input.media.map((m) => ({ post_id: postId, image_url: m.imageUrl, display_order: m.displayOrder, link: m.link }))
  );
  if (mediaErr) throw mediaErr;

  if (input.productIds.length > 0) {
    const { error: shelfErr } = await admin.from('post_products').insert(
      input.productIds.map((productId, i) => ({ post_id: postId, product_id: productId, display_order: i }))
    );
    if (shelfErr) throw shelfErr;
  }

  return postId;
}

async function main() {
  console.log('\n=== SEED-REAL-DEMO-CONTENT — بيان: منتجات + منشورات حقيقية دائمة ===\n');

  const { data: category, error: categoryErr } = await admin.from('categories').select('id').eq('slug', 'daily-food').single();
  if (categoryErr) throw categoryErr;

  const { data: merchant, error: merchantErr } = await admin.from('merchants').select('id').eq('slug', 'poultry-test').single();
  if (merchantErr) throw merchantErr;

  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  const productIds: Record<string, string> = {};
  for (const seed of PRODUCTS) {
    const id = await upsertProduct(category.id, merchant.id, seed);
    productIds[seed.name] = id;
    console.log(`✓ منتج: ${seed.name} (${id})`);
  }

  const rice = productIds['أرز مصري أبيض (كيس 1 كجم)'];
  const sugar = productIds['سكر أبيض مكرر (كيس 1 كجم)'];
  const oil = productIds['زيت عباد شمس (زجاجة 1 لتر)'];
  const eggs = productIds['بيض بلدي طازج (طبق 30 بيضة)'];
  const tomato = productIds['طماطم بلدي طازجة (كجم)'];
  const onion = productIds['بصل أصفر طازج (كجم)'];
  const bread = productIds['خبز بلدي طازج (5 أرغفة)'];
  const cheese = productIds['جبنة بيضاء قريش (نصف كيلو)'];

  const posts = [
    {
      worldScope: world.id,
      categoryId: category.id,
      postType: 'product_highlight' as const,
      caption: 'طماطم وبصل بلدي طازج يومياً 🍅 أساسيات الطبخ من حي الطعام اليومي بأفضل الأسعار.',
      priority: 50,
      media: [{ imageUrl: PRODUCTS.find((p) => p.name.includes('طماطم'))!.imageUrl, displayOrder: 0, link: { type: 'product', productId: tomato } }],
      productIds: [tomato, onion],
    },
    {
      worldScope: world.id,
      categoryId: category.id,
      postType: 'product_highlight' as const,
      caption: 'بيض بلدي طازج من المزرعة كل صباح 🥚 طبق 30 بيضة يكفي أسبوعاً كاملاً.',
      priority: 40,
      media: [{ imageUrl: PRODUCTS.find((p) => p.name.includes('بيض'))!.imageUrl, displayOrder: 0, link: { type: 'product', productId: eggs } }],
      productIds: [eggs],
    },
    {
      worldScope: world.id,
      categoryId: category.id,
      postType: 'product_highlight' as const,
      caption: 'خبز بلدي سخن وجبنة بيضاء طرية 🍞🧀 فطار المصريين المفضّل جاهز الآن.',
      priority: 30,
      media: [{ imageUrl: PRODUCTS.find((p) => p.name.includes('خبز'))!.imageUrl, displayOrder: 0, link: { type: 'product', productId: bread } }],
      productIds: [bread, cheese],
    },
    {
      worldScope: world.id,
      categoryId: category.id,
      postType: 'product_highlight' as const,
      caption: 'أساسيات المطبخ متوفرة الآن: أرز، سكر، وزيت عباد شمس بجودة عالية وسعر مناسب 🛒.',
      priority: 20,
      media: [{ imageUrl: PRODUCTS.find((p) => p.name.includes('أرز'))!.imageUrl, displayOrder: 0, link: { type: 'product', productId: rice } }],
      productIds: [rice, sugar, oil],
    },
    {
      worldScope: world.id,
      categoryId: category.id,
      postType: 'post' as const,
      caption: 'وصفة اليوم: رز باللبن بالمنزل 🍮 حلو مصري بسيط بمكونات من حي الطعام اليومي.',
      priority: 10,
      media: [
        {
          imageUrl: 'https://placehold.co/800x800/fceec2/6b4e00.png?text=Rice+Pudding',
          displayOrder: 0,
          link: {
            type: 'recipe',
            title: 'رز باللبن بالمنزل',
            baseFamilySize: 4,
            ingredients: [
              { productId: rice, baseQuantity: 1 },
              { productId: sugar, baseQuantity: 0.5 },
            ],
          },
        },
      ],
      productIds: [rice, sugar],
    },
  ];

  for (const post of posts) {
    const id = await upsertPost(post);
    console.log(`✓ منشور: ${post.caption.slice(0, 40)}... (${id})`);
  }

  console.log('\n=== تم الزرع بنجاح — 8 منتجات، 5 منشورات، الكل is_published=true ===\n');
}

main().catch((err) => {
  console.error('✗ فشل السكربت:', err);
  process.exit(1);
});
