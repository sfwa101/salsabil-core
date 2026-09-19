// scripts/seed-real-merchant-highlight-posts.ts
//
// FIX-STAGING-HOMEPAGE-FAKE-PRODUCTS-DARKMODE (القسم 1) — راجع
// docs/audits/2026-09-19-staging-homepage-fake-products-darkmode-report.md §1 للتشخيص الكامل: الخلاصة
// الرئيسية تعرض فقط منتجات لها منشور (post/post_media/post_products) — اليوم كل الـ19 منشوراً على
// staging تشير حصراً لمنتجات Demo وهمية (seed-lovable-reference-demo-products.ts، تاجر poultry-test)،
// بينما المنتجات الحقيقية للتجار العشرة (pilot-merchant-01..10) — رغم كونها نشطة ومصنَّفة بحي/قسم
// صحيحين 100% — ليس لها أي منشور، فلا تظهر على الرئيسية إطلاقاً.
//
// هذا السكربت: يختار حتى منتجين لكل تاجر من التجار العشرة (الأرخص والأعلى سعراً — تنويع بسيط)، ينشئ
// لكل واحد منشور product_highlight + post_media + post_products (نفس نمط seed-product-highlight-posts.ts
// حرفياً)، ثم يُلغي نشر (is_published=false) كل المنشورات القديمة المرتبطة بمنتجات poultry-test —
// لا حذف لأي صف، فقط INSERT جديد وUPDATE is_published على القديم (قابل للتراجع بالكامل).
//
// caption: منتجات pilot-merchant بلا description (كلها NULL في DB) — نُستخدَم اسم المنتج نفسه كـcaption
// (لا نص تسويقي مُخترَع، نفس الحقل المعروض بالفعل كعنوان البطاقة).
//
// idempotent: يتجاهل أي منتج له بالفعل صف post_products (إعادة التشغيل آمنة).
//
// التشغيل: npx tsx scripts/seed-real-merchant-highlight-posts.ts [--env=staging]

import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const envFlag = process.argv.find((a) => a.startsWith('--env='))?.split('=')[1];
const envFile = envFlag === 'staging' ? '.env.staging.local' : '.env.local';
const envPath = path.resolve(dirname, '..', envFile);
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const { createClient } = await import('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  console.error(`✗ متغيرات بيئة Supabase ناقصة في ${envFile}`);
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const MAX_PRODUCTS_PER_MERCHANT = 2;

async function main() {
  console.log(`\n=== seed-real-merchant-highlight-posts (${envFile}) — منشورات حقيقية لمنتجات التجار العشرة ===\n`);

  const { data: world, error: worldErr } = await admin.from('worlds').select('id').eq('slug', 'individuals').single();
  if (worldErr) throw worldErr;

  const { data: category, error: categoryErr } = await admin.from('categories').select('id').eq('slug', 'daily-food').single();
  if (categoryErr) throw categoryErr;

  const { data: merchants, error: merchErr } = await admin
    .from('merchants')
    .select('id, slug, business_name')
    .like('slug', 'pilot-merchant-%')
    .order('slug');
  if (merchErr) throw merchErr;
  if (!merchants || merchants.length === 0) {
    console.error('✗ لا يوجد تجار pilot-merchant-* على هذه البيئة — توقف بلا تعديل.');
    process.exit(1);
  }

  const { data: products, error: prodErr } = await admin
    .from('products')
    .select('id, name, base_price, unit, image_url, is_active, tenant_id')
    .in(
      'tenant_id',
      merchants.map((m) => m.id)
    )
    .order('base_price', { ascending: false });
  if (prodErr) throw prodErr;
  if (!products || products.length === 0) {
    console.error('✗ لا يوجد منتجات لهؤلاء التجار — توقف بلا تعديل.');
    process.exit(1);
  }

  // STOP CONDITION صريح: منتج بلا سعر صالح أو بلا صورة صالحة
  const invalid = products.filter((p) => !p.is_active || p.base_price == null || p.base_price <= 0 || !p.image_url);
  if (invalid.length > 0) {
    console.error(`✗ توقف — ${invalid.length} منتجاً بحالة غير صالحة (سعر/صورة/is_active):`);
    console.error(JSON.stringify(invalid, null, 2));
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

  const byTenant = new Map<string, typeof products>();
  for (const p of products) {
    const list = byTenant.get(p.tenant_id!) ?? [];
    list.push(p);
    byTenant.set(p.tenant_id!, list);
  }

  let created = 0;
  let skipped = 0;
  const createdByMerchant: Record<string, string[]> = {};

  for (const merchant of merchants) {
    const merchantProducts = byTenant.get(merchant.id) ?? [];
    if (merchantProducts.length === 0) {
      console.log(`⚠ ${merchant.slug}: لا منتجات إطلاقاً — تخطّي`);
      continue;
    }

    // تنويع بسيط: الأعلى سعراً (منتجات.order بالفعل تنازلي) + الأرخص، حتى MAX_PRODUCTS_PER_MERCHANT
    const highest = merchantProducts[0];
    const lowest = merchantProducts[merchantProducts.length - 1];
    const picks = highest.id === lowest.id ? [highest] : [highest, lowest];
    const selected = picks.slice(0, MAX_PRODUCTS_PER_MERCHANT);

    for (const product of selected) {
      if (alreadyCovered.has(product.id)) {
        console.log(`↷ تخطّي (مُغطَّى فعلاً): ${product.name} — ${merchant.slug}`);
        skipped++;
        continue;
      }

      const { data: post, error: postErr } = await admin
        .from('posts')
        .insert({
          world_scope: world.id,
          category_id: category.id,
          post_type: 'product_highlight',
          caption: product.name,
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

      console.log(`✓ منشور جديد: ${product.name} (${merchant.slug}, post ${post.id})`);
      created++;
      (createdByMerchant[merchant.slug] ??= []).push(product.name);
    }
  }

  console.log(`\n--- تعطيل منشورات poultry-test الوهمية ---`);
  const { data: fakeMerchant, error: fakeMerchErr } = await admin.from('merchants').select('id').eq('slug', 'poultry-test').maybeSingle();
  if (fakeMerchErr) throw fakeMerchErr;

  let disabledCount = 0;
  if (fakeMerchant) {
    const { data: fakeProducts, error: fakeProdErr } = await admin.from('products').select('id').eq('tenant_id', fakeMerchant.id);
    if (fakeProdErr) throw fakeProdErr;
    const fakeProductIds = (fakeProducts ?? []).map((p) => p.id);

    if (fakeProductIds.length > 0) {
      const { data: fakePostLinks, error: fakeLinksErr } = await admin
        .from('post_products')
        .select('post_id')
        .in('product_id', fakeProductIds);
      if (fakeLinksErr) throw fakeLinksErr;
      const fakePostIds = [...new Set((fakePostLinks ?? []).map((l) => l.post_id as string))];

      if (fakePostIds.length > 0) {
        const { data: updated, error: updateErr } = await admin
          .from('posts')
          .update({ is_published: false })
          .in('id', fakePostIds)
          .eq('is_published', true)
          .select('id');
        if (updateErr) throw updateErr;
        disabledCount = updated?.length ?? 0;
        console.log(`✓ عُطِّل نشر ${disabledCount} منشوراً وهمياً (poultry-test)`);
      } else {
        console.log('↷ لا منشورات مرتبطة بـpoultry-test — لا شيء لتعطيله');
      }
    }
  } else {
    console.log('↷ لا تاجر poultry-test على هذه البيئة — لا شيء لتعطيله');
  }

  console.log(`\n=== تم ===`);
  console.log(`منشورات جديدة: ${created} (${skipped} مُغطَّى مسبقاً)`);
  console.log('حسب التاجر:', JSON.stringify(createdByMerchant, null, 2));
  console.log(`منشورات وهمية عُطِّلت: ${disabledCount}\n`);
}

main().catch((err) => {
  console.error('✗ فشل السكربت:', err);
  process.exit(1);
});
