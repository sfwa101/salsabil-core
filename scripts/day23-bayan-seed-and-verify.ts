// scripts/day23-bayan-seed-and-verify.ts
// اليوم 23 — يشغَّل بعد scripts/day23-bayan-schema.sql (DDL يدوي عبر SQL Editor). يزرع منشورين
// حقيقيين (منشور واحد منشور + مسودة واحدة) بصور وروابط منتجات حقيقية، ثم يتحقق حياً من: قفل
// RLS للمسودة عن anon، محاولات إدراج فاشلة متعمَّدة (FK×2 + CHECK)، وسلوك الحذف المتسلسل
// (on delete cascade) — نفس منهجية ADR-010/ADR-018. ذاتي التنظيف بالكامل.
//
// التشغيل: npx tsx scripts/day23-bayan-seed-and-verify.ts

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
const anon = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });

type StepResult = { step: string; ok: boolean; detail?: string };
const results: StepResult[] = [];
function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${step}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  console.log('\n=== اليوم 23 — بيان: Seed + تحقق حي ===\n');

  // 0) Preflight
  const preflight = await Promise.all([
    admin.from('posts').select('id').limit(1),
    admin.from('post_media').select('id').limit(1),
    admin.from('post_products').select('id').limit(1),
  ]);
  if (preflight.some((r) => r.error)) {
    console.error('\n⚠️ يبدو أن scripts/day23-bayan-schema.sql لم يُطبَّق بعد على Supabase.\n');
    process.exit(1);
  }
  record('0) Preflight — posts/post_media/post_products موجودة حياً', true);

  // تجهيز: عالم individuals، تصنيف حقيقي، منتج حقيقي (نفس بيانات الاختبار المشتركة منذ اليوم 3-8)
  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  const { data: product, error: productErr } = await admin.from('products').select('id, category_id').eq('name', 'دجاجة كاملة طازجة').single();
  if (productErr) throw productErr;
  const categoryId = product.category_id as string;
  const productId = product.id as string;

  // ---------------------------------------------------------------------
  // 1) Seed — منشور منشور واحد بصورتين (منتج + وصفة) ومنشور مسودة واحد
  // ---------------------------------------------------------------------
  const { data: publishedPost, error: publishedErr } = await admin
    .from('posts')
    .insert({ world_scope: world.id, category_id: categoryId, post_type: 'post', caption: 'منشور اختبار اليوم 23', is_published: true, priority: 10 })
    .select('id')
    .single();
  if (publishedErr) throw publishedErr;

  const { data: draftPost, error: draftErr } = await admin
    .from('posts')
    .insert({ world_scope: world.id, category_id: categoryId, post_type: 'post', caption: 'مسودة لا يجب أن تظهر', is_published: false, priority: 99 })
    .select('id')
    .single();
  if (draftErr) throw draftErr;

  const { error: mediaErr } = await admin.from('post_media').insert([
    { post_id: publishedPost.id, image_url: 'https://example.com/chicken.jpg', display_order: 0, link: { type: 'product', productId } },
    {
      post_id: publishedPost.id,
      image_url: 'https://example.com/recipe.jpg',
      display_order: 1,
      link: { type: 'recipe', title: 'وصفة اختبار', baseFamilySize: 4, ingredients: [{ productId, baseQuantity: 1 }] },
    },
  ]);
  if (mediaErr) throw mediaErr;

  const { error: postProductErr } = await admin.from('post_products').insert({ post_id: publishedPost.id, product_id: productId, display_order: 0 });
  if (postProductErr) throw postProductErr;

  record('1) Seed — منشور منشور (صورتان: منتج + وصفة) + منشور مسودة', true, `published=${publishedPost.id}, draft=${draftPost.id}`);

  // ---------------------------------------------------------------------
  // 2) تحقق حي — قفل RLS: anon يرى المنشور المنشور فقط، لا المسودة إطلاقاً
  // ---------------------------------------------------------------------
  const anonPublished = await anon.from('posts').select('id').eq('id', publishedPost.id).maybeSingle();
  const anonDraft = await anon.from('posts').select('id').eq('id', draftPost.id).maybeSingle();
  record('2.a) anon يقرأ المنشور المنشور', !anonPublished.error && anonPublished.data?.id === publishedPost.id, anonPublished.error?.message);
  record('2.b) anon لا يقرأ المسودة إطلاقاً (RLS is_published=true)', !anonDraft.error && anonDraft.data === null, anonDraft.error?.message ?? JSON.stringify(anonDraft.data));

  // ---------------------------------------------------------------------
  // 3) محاولات إدراج فاشلة متعمَّدة
  // ---------------------------------------------------------------------
  const fakeId = '00000000-0000-0000-0000-000000000000';

  const badWorld = await admin.from('posts').insert({ world_scope: fakeId, category_id: categoryId, post_type: 'post' });
  record('3.a) رفض world_scope غير موجود (FK)', badWorld.error?.code === '23503', badWorld.error?.code ?? 'نجح خطأً!');

  const badCategory = await admin.from('posts').insert({ world_scope: world.id, category_id: fakeId, post_type: 'post' });
  record('3.b) رفض category_id غير موجود (FK)', badCategory.error?.code === '23503', badCategory.error?.code ?? 'نجح خطأً!');

  const badType = await admin.from('posts').insert({ world_scope: world.id, category_id: categoryId, post_type: 'not_a_real_type' });
  record('3.c) رفض post_type غير صحيح (CHECK)', badType.error?.code === '23514', badType.error?.code ?? 'نجح خطأً!');

  // ---------------------------------------------------------------------
  // 4) سلوك الحذف المتسلسل — حذف المنشور المنشور يجب أن يحذف صوره وروابط منتجاته تلقائياً
  // ---------------------------------------------------------------------
  const deletePublished = await admin.from('posts').delete().eq('id', publishedPost.id);
  const mediaAfterDelete = await admin.from('post_media').select('id').eq('post_id', publishedPost.id);
  const productsAfterDelete = await admin.from('post_products').select('id').eq('post_id', publishedPost.id);
  record(
    '4) حذف المنشور يحذف صوره وروابط منتجاته تلقائياً (on delete cascade)',
    !deletePublished.error && (mediaAfterDelete.data?.length ?? -1) === 0 && (productsAfterDelete.data?.length ?? -1) === 0,
    `media متبقية: ${mediaAfterDelete.data?.length}, منتجات متبقية: ${productsAfterDelete.data?.length}`,
  );

  // ---------------------------------------------------------------------
  // تنظيف — حذف المسودة (لم تُحذَف بعد)
  // ---------------------------------------------------------------------
  await admin.from('posts').delete().eq('id', draftPost.id);

  // ---------------------------------------------------------------------
  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== النتيجة: ${results.length - failed.length}/${results.length} نجحت ===\n`);
  if (failed.length > 0) {
    console.error('خطوات فشلت:', failed.map((f) => f.step).join(', '));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('✗ خطأ غير متوقَّع:', err);
  process.exit(1);
});
