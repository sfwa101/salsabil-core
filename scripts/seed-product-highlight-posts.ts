// scripts/seed-product-highlight-posts.ts
//
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 4) — بعد remap-stale-product-refs.ts
// (الجزء 1)، ثمانية فقط من الـ19 منتجاً الجديدة (scripts/seed-lovable-reference-demo-products.ts)
// أصبحت مرتبطة بمنشور فعلي في الخلاصة (عبر إعادة توجيه منشورات موجودة أصلاً) — الأحد عشر الباقية لا
// تظهر في تبويب "الكل" إطلاقاً (تظهر فقط عبر تصفّح /daily-food المباشر). هذا السكربت يزرع منشور
// product_highlight واحداً لكل منتج من هذه الأحد عشر — الخلاصة الرئيسية تعرض الآن بطاقات منتج حقيقية
// (لا منشورات نصية فقط) عبر رف "منتجات هذا المنشور" (post_products) الموجود أصلاً في PostCard.tsx —
// لا تعديل عرض جديد، بيانات فقط.
//
// الصورة: image_url المنتج نفسه (/demo-products/*.jpg، محلي حقيقي — لا placehold.co، بلا نسخ نمط
// المنشورات القديمة). caption: description المنتج نفسه حرفياً (مكتوب أصلاً بأسلوب تسويقي جذاب في
// seed-lovable-reference-demo-products.ts) — لا نص جديد مُخترَع.
//
// idempotent: يتجاهل أي منتج من الـ19 له بالفعل صف post_products واحد على الأقل (سواء من هذا
// السكربت في تشغيل سابق، أو من remap-stale-product-refs.ts) — إعادة التشغيل آمنة، لا تكرار.
//
// التشغيل: npx tsx scripts/seed-product-highlight-posts.ts

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

// نفس الأسماء الحرفية الـ19 من seed-lovable-reference-demo-products.ts — ثمانية منها مُغطَّاة فعلاً
// (remap-stale-product-refs.ts، الجزء 1) فتُستبعَد آلياً هنا عبر فحص post_products الحي، لا قائمة
// يدوية قد تنحرف عن الواقع.
const NEW_PRODUCT_NAMES = [
  'خيار طازج',
  'خس وخضروات ورقية',
  'موز إكوادوري',
  'تفاح أحمر مستورد',
  'برتقال أبو سرّة',
  'فراولة طازجة',
  'حليب طازج كامل الدسم',
  'زبادي يوناني طبيعي',
  'زبدة بلدي طبيعية',
  'جبنة بيضاء طرية',
  'كوكيز شوكولاتة بالشوفان',
  'لحم بقري طازج',
  'صدور دجاج بلدي',
  'مكرونة سباجيتي إيطالية',
  'قهوة عربية محمصة',
  'جرانولا بالتوت والمكسرات',
  'عصير برتقال طازج',
  'مياه معدنية فاخرة',
  'آيس كريم فانيلا طبيعي',
];

async function main() {
  console.log('\n=== seed-product-highlight-posts — تغطية كاملة للـ19 منتجاً في الخلاصة ===\n');

  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  const { data: category, error: categoryErr } = await admin.from('categories').select('id').eq('slug', 'daily-food').single();
  if (categoryErr) throw categoryErr;

  const { data: products, error: productsErr } = await admin
    .from('products')
    .select('id, name, description, image_url')
    .in('name', NEW_PRODUCT_NAMES);
  if (productsErr) throw productsErr;
  if (!products || products.length !== NEW_PRODUCT_NAMES.length) {
    console.error(`✗ توقُّع ${NEW_PRODUCT_NAMES.length} منتجاً، وُجد ${products?.length ?? 0} — توقف بلا تعديل.`);
    process.exit(1);
  }

  const { data: existingLinks, error: linksErr } = await admin
    .from('post_products')
    .select('product_id')
    .in(
      'product_id',
      products.map((p) => p.id)
    );
  if (linksErr) throw linksErr;
  const alreadyCovered = new Set((existingLinks ?? []).map((l) => l.product_id as string));

  let created = 0;
  let skipped = 0;

  for (const product of products) {
    if (alreadyCovered.has(product.id)) {
      console.log(`↷ تخطّي (مُغطَّى فعلاً): ${product.name}`);
      skipped++;
      continue;
    }

    const { data: post, error: postErr } = await admin
      .from('posts')
      .insert({
        world_scope: world.id,
        category_id: category.id,
        post_type: 'product_highlight',
        caption: product.description,
        is_published: true,
        priority: 0,
      })
      .select('id')
      .single();
    if (postErr) throw postErr;

    const { error: mediaErr } = await admin.from('post_media').insert({
      post_id: post.id,
      image_url: product.image_url,
      display_order: 0,
      link: { type: 'product', productId: product.id },
    });
    if (mediaErr) throw mediaErr;

    const { error: ppErr } = await admin.from('post_products').insert({
      post_id: post.id,
      product_id: product.id,
      display_order: 0,
    });
    if (ppErr) throw ppErr;

    console.log(`✓ منشور جديد لـ${product.name} (post ${post.id})`);
    created++;
  }

  console.log(`\n=== تم — ${created} منشور جديد، ${skipped} مُغطَّى مسبقاً (من أصل ${products.length}) ===\n`);
}

main().catch((err) => {
  console.error('✗ فشل السكربت:', err);
  process.exit(1);
});
