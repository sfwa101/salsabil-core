// scripts/remap-stale-product-refs.ts
//
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 1) — منشورات موجودة فعلاً
// (post_media/post_products، مزروعة عبر scripts/seed-daily-food-demo-content.ts قبل استيراد الـ19
// منتجاً الجديدة) لا تزال تشير بمعرّفاتها الحرفية إلى الثمانية منتجات المُعطَّلة
// (scripts/deactivate-old-demo-products.ts، is_active=false) — فتح بطاقتها في الخلاصة يعرض
// "هذا المنتج لم يعد متاحاً" (ProductSheetContent.tsx). هذا سكربت **إعادة توجيه** (Remap) لا حذف ولا
// إعادة تفعيل: كل مرجع قديم يُستبدَل بمعرّف منتج جديد نشط، بأقرب تطابق منطقي (نوع/فئة الطعام) —
// لا تطابق حرفي متاح لسبعة من الثمانية (الكتالوج الجديد لا يحمل أرزاً/سكراً/زيتاً/بيضاً/طماطم/بصلاً/
// خبزاً بالاسم نفسه)، فقط "جبنة بيضاء قريش" لها بديل شبه مطابق ("جبنة بيضاء طرية").
//
// المطابقة المُعتمَدة (بالاسم، لا معرّف صلب — يعمل بلا تعديل على أي مشروع Supabase طالما الأسماء
// حرفية كما زرعتها scripts/seed-*.ts):
//   أرز مصري أبيض (كيس 1 كجم)      → مكرونة سباجيتي إيطالية   [نشا/طبق أساسي]
//   سكر أبيض مكرر (كيس 1 كجم)      → جرانولا بالتوت والمكسرات  [بند مؤن/فطار]
//   زيت عباد شمس (زجاجة 1 لتر)      → زبدة بلدي طبيعية          [دهن طبخ]
//   بيض بلدي طازج (طبق 30 بيضة)    → صدور دجاج بلدي            [بروتين]
//   طماطم بلدي طازجة (كجم)         → خيار طازج                 [خضار طازج]
//   بصل أصفر طازج (كجم)            → خس وخضروات ورقية          [خضار طازج]
//   خبز بلدي طازج (5 أرغفة)        → كوكيز شوكولاتة بالشوفان    [مخبوزات]
//   جبنة بيضاء قريش (نصف كيلو)     → جبنة بيضاء طرية           [تطابق شبه حرفي]
//
// يعالج ثلاثة مواضع مرجع فعلية (كل ما يحمل معرّف منتج في نموذج بيان):
//   (أ) post_products.product_id — عمود مباشر، تحديث SQL مباشر لكل تعيين.
//   (ب) post_media.link حين type='product' — JSONB، يُقرأ ويُعاد كتابته بعد استبدال productId.
//   (ج) post_media.link حين type='recipe' — كل عنصر في ingredients[] قد يحمل productId قديماً أيضاً.
//
// idempotent: بعد أول تشغيل ناجح، لا صف يطابق أي معرّف قديم (كلها استُبدلت) — إعادة التشغيل تجد صفراً
// وتخرج بأمان بلا أي تعديل إضافي.
//
// التشغيل: npx tsx scripts/remap-stale-product-refs.ts

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

const NAME_MAPPING: Array<{ from: string; to: string }> = [
  { from: 'أرز مصري أبيض (كيس 1 كجم)', to: 'مكرونة سباجيتي إيطالية' },
  { from: 'سكر أبيض مكرر (كيس 1 كجم)', to: 'جرانولا بالتوت والمكسرات' },
  { from: 'زيت عباد شمس (زجاجة 1 لتر)', to: 'زبدة بلدي طبيعية' },
  { from: 'بيض بلدي طازج (طبق 30 بيضة)', to: 'صدور دجاج بلدي' },
  { from: 'طماطم بلدي طازجة (كجم)', to: 'خيار طازج' },
  { from: 'بصل أصفر طازج (كجم)', to: 'خس وخضروات ورقية' },
  { from: 'خبز بلدي طازج (5 أرغفة)', to: 'كوكيز شوكولاتة بالشوفان' },
  { from: 'جبنة بيضاء قريش (نصف كيلو)', to: 'جبنة بيضاء طرية' },
];

interface PostMediaRow {
  id: string;
  link: { type: 'none' } | { type: 'product'; productId: string } | {
    type: 'recipe';
    title: string;
    baseFamilySize: number;
    ingredients: Array<{ productId: string; baseQuantity: number }>;
  };
}

async function main() {
  console.log('\n=== remap-stale-product-refs — إعادة توجيه مراجع المنتجات المُعطَّلة الثمانية ===\n');

  const { data: allProducts, error: productsErr } = await admin.from('products').select('id, name');
  if (productsErr) throw productsErr;
  const idByName = new Map(allProducts.map((p) => [p.name, p.id as string]));

  const idMap = new Map<string, string>(); // oldId -> newId
  for (const { from, to } of NAME_MAPPING) {
    const oldId = idByName.get(from);
    const newId = idByName.get(to);
    if (!oldId) {
      console.error(`✗ لم يُعثَر على المنتج القديم "${from}" — توقف بلا تعديل.`);
      process.exit(1);
    }
    if (!newId) {
      console.error(`✗ لم يُعثَر على المنتج البديل "${to}" — توقف بلا تعديل.`);
      process.exit(1);
    }
    idMap.set(oldId, newId);
    console.log(`↦ ${from} → ${to}`);
  }

  // (أ) post_products.product_id — تحديث مباشر لكل تعيين قديم→جديد
  console.log('\n--- post_products ---');
  let totalPostProductsUpdated = 0;
  for (const [oldId, newId] of idMap) {
    const { data: updated, error } = await admin
      .from('post_products')
      .update({ product_id: newId })
      .eq('product_id', oldId)
      .select('id');
    if (error) throw error;
    if (updated.length > 0) {
      console.log(`✓ ${updated.length} صف: ${oldId} → ${newId}`);
      totalPostProductsUpdated += updated.length;
    }
  }

  // (ب/ج) post_media.link — JSONB، يُقرأ كاملاً ثم يُعاد كتابته للصفوف المتأثرة فقط
  console.log('\n--- post_media ---');
  const { data: mediaRows, error: mediaErr } = await admin.from('post_media').select('id, link');
  if (mediaErr) throw mediaErr;

  let totalMediaUpdated = 0;
  for (const row of mediaRows as PostMediaRow[]) {
    let changed = false;
    const link = row.link;

    if (link.type === 'product' && idMap.has(link.productId)) {
      link.productId = idMap.get(link.productId)!;
      changed = true;
    } else if (link.type === 'recipe') {
      for (const ingredient of link.ingredients) {
        if (idMap.has(ingredient.productId)) {
          ingredient.productId = idMap.get(ingredient.productId)!;
          changed = true;
        }
      }
    }

    if (changed) {
      const { error } = await admin.from('post_media').update({ link }).eq('id', row.id);
      if (error) throw error;
      console.log(`✓ post_media ${row.id}: link مُحدَّث`);
      totalMediaUpdated++;
    }
  }

  console.log(`\n=== تم — ${totalPostProductsUpdated} صف post_products، ${totalMediaUpdated} صف post_media ===\n`);

  // تحقق ختامي: صفر مرجع متبقٍّ لأي معرّف قديم
  const oldIds = Array.from(idMap.keys());
  const { data: remainingPP } = await admin.from('post_products').select('id').in('product_id', oldIds);
  const { data: allMediaAfter } = await admin.from('post_media').select('link');
  const remainingMediaCount = (allMediaAfter as PostMediaRow[]).filter((m) => {
    if (m.link.type === 'product') return oldIds.includes(m.link.productId);
    if (m.link.type === 'recipe') return m.link.ingredients.some((i) => oldIds.includes(i.productId));
    return false;
  }).length;

  if ((remainingPP?.length ?? 0) > 0 || remainingMediaCount > 0) {
    console.error(`✗ تحقق فاشل: ${remainingPP?.length ?? 0} post_products و${remainingMediaCount} post_media لا يزالان يشيران لمعرّفات قديمة!`);
    process.exit(1);
  }
  console.log('✓ تحقق ختامي: صفر مرجع متبقٍّ لأي منتج مُعطَّل في post_products/post_media.');
}

main().catch((err) => {
  console.error('✗ فشل السكربت:', err);
  process.exit(1);
});
