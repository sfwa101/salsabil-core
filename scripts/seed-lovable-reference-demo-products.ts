// scripts/seed-lovable-reference-demo-products.ts
//
// ⚠️ بيانات عرض توضيحي (DEMO DATA) — مستوردة من مرجع تصميمي خارجي، لا بيانات تاجر حقيقي ⚠️
// الأسماء/الأوصاف/الأسعار/الصور هنا مُستخرَجة من مستودع Lovable المرجعي
// (D:\temp\reefam-lovable-reference، scripts/seed-products.mjs + src/lib/productEnrichment.ts —
// خارج هذا المستودع، لا يُستنسَخ داخله) لإثراء واجهة "حي الطعام اليومي" بصرياً بمنتجات احترافية —
// **ليست** منتجات باعها تاجر حقيقي فعلياً. أي قارئ مستقبلي لهذا الكود يجب أن يفهم هذا التمييز فوراً.
//
// HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT دفعة 2 — سكربت seed **جديد ودائم** (idempotent
// عبر مفتاح طبيعي category_id+name، آمن لإعادة التشغيل)، لا تعديل على
// scripts/seed-daily-food-demo-content.ts القائم (يبقى كما هو، منتجاته الثمانية + "دجاجة كاملة
// طازجة" لا تُمَس هنا إطلاقاً — تعطيلها المحتمل قرار منفصل، دفعة 3، بموافقة صريحة لاحقة).
//
// اختيار المنتجات (19 من أصل +80 في المرجع): استُبعِدت عمداً كل الأصناف التي لا تنتمي فعلياً لـ"حي
// الطعام اليومي" حسب تصنيف SALSABIL_CONSTITUTION.md §7.1 (صيدلية/مكتبة وقرطاسية/أدوات منزلية/
// مطاعم/حلويات فاخرة/سلال مُجمَّعة — كل هذه أحياء مستقبلية منفصلة لم تُبنَ بعد، لا امتداد لهذا الحي)،
// وكل صنف تُعيد صورته في المرجع نفسه استخدام صورة منتج آخر (عسل/سمن/زيتون تستخدم صور زبدة/جبنة/زيت
// — لا صورة حقيقية مطابقة)، وكل صنف يكرر مفهوم منتج نشط موجود فعلياً اليوم (أرز/سكر/زيت/بيض/طماطم/
// بصل/خبز/دجاجة كاملة — من scripts/seed-daily-food-demo-content.ts والمنتج الأصلي الأول).
//
// الصور: 19 ملف JPG حقيقي نُسخ من src/assets في المرجع إلى public/demo-products/ (هذا المستودع) —
// لا رفع لـSupabase Storage (لا bucket قائم اليوم لهذا الغرض، إنشاء واحد نطاق أكبر من "استيراد
// بيانات منتجات" — راجع Task Report). image_url يشير لمسار Next.js public/ ثابت.
//
// التشغيل: npx tsx scripts/seed-lovable-reference-demo-products.ts

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
  imagePath: string; // نسبي إلى public/demo-products/
  stock: number;
};

// كل الأسماء/الأسعار/الوحدات مأخوذة حرفياً من scripts/seed-products.mjs في المرجع (قيم واقعية
// اختارها مصمّم المرجع، لا اختراعاً). الأوصاف: نص أصلي من src/lib/productEnrichment.ts
// (CHEF_BLOCKS) حيث توفّر، وإلا وصف تسويقي قصير بنفس أسلوب scripts/seed-daily-food-demo-content.ts
// القائم (لا CHEF_BLOCKS مطابق لهذه الأصناف في المرجع).
const PRODUCTS: ProductSeed[] = [
  {
    name: 'خيار طازج',
    description: 'خيار طازج مقرمش يُقطف يومياً — مثالي للسلطات والعصائر الصحية.',
    basePrice: 14,
    unit: 'كيلو',
    imagePath: 'p-cucumber.jpg',
    stock: 70,
  },
  {
    name: 'خس وخضروات ورقية',
    description: 'خس وخضروات ورقية طازجة منتقاة يومياً — أساس أي سلطة صحية.',
    basePrice: 12,
    unit: 'حزمة',
    imagePath: 'p-lettuce.jpg',
    stock: 60,
  },
  {
    name: 'موز إكوادوري',
    description: 'موز إكوادوري — مصدر طبيعي للبوتاسيوم والطاقة السريعة، مثالي قبل التمرين أو كوجبة خفيفة بين الوجبات.',
    basePrice: 32,
    unit: 'كيلو',
    imagePath: 'p-banana.jpg',
    stock: 60,
  },
  {
    name: 'تفاح أحمر مستورد',
    description: 'تفاح أحمر مستورد — مصدر ممتاز للألياف القابلة للذوبان ومضادات الأكسدة، مثالي للسناك ولأصحاب حميات إنقاص الوزن.',
    basePrice: 45,
    unit: 'كيلو',
    imagePath: 'p-apple.jpg',
    stock: 50,
  },
  {
    name: 'برتقال أبو سرّة',
    description: 'برتقال أبو سرّة حلو المذاق وغني بفيتامين ج — مثالي للعصير الطازج.',
    basePrice: 28,
    unit: 'كيلو',
    imagePath: 'p-orange.jpg',
    stock: 60,
  },
  {
    name: 'فراولة طازجة',
    description: 'فراولة طازجة موسمية حلوة ومنعشة — تُقطف باليد لضمان أفضل جودة.',
    basePrice: 38,
    unit: 'علبة 500غ',
    imagePath: 'p-strawberry.jpg',
    stock: 35,
  },
  {
    name: 'حليب طازج كامل الدسم',
    description: 'حليب طازج كامل الدسم من مزارع محلية، يُعبأ يومياً.',
    basePrice: 45,
    unit: '1 لتر',
    imagePath: 'p-milk.jpg',
    stock: 50,
  },
  {
    name: 'زبادي يوناني طبيعي',
    description: 'زبادي يوناني مصفى، مضاعف البروتين ومنخفض السكر — ممتاز كوجبة بعد التمرين أو ضمن حميات إنقاص الوزن.',
    basePrice: 22,
    unit: 'كوب 200غ',
    imagePath: 'p-yogurt.jpg',
    stock: 60,
  },
  {
    name: 'زبدة بلدي طبيعية',
    description: 'زبدة بلدي طبيعية بطعم أصيل — مثالية للخبيز والطهي اليومي.',
    basePrice: 65,
    unit: '200غ',
    imagePath: 'p-butter.jpg',
    stock: 40,
  },
  {
    name: 'جبنة بيضاء طرية',
    description: 'جبنة بيضاء طرية، مصدر جيد للكالسيوم — مثالية للفطار اليومي.',
    basePrice: 95,
    unit: '500غ',
    imagePath: 'p-cheese.jpg',
    stock: 35,
  },
  {
    name: 'كوكيز شوكولاتة بالشوفان',
    description: 'كوكيز شوكولاتة بالشوفان تُخبز طازجة — قطعة حلوة بمذاق منزلي.',
    basePrice: 48,
    unit: 'علبة 12 قطعة',
    imagePath: 'p-cookies.jpg',
    stock: 40,
  },
  {
    name: 'لحم بقري طازج',
    description: 'لحم بقري طازج مثالي للستيك والشواء على الفحم — اتركه يرتاح 5 دقائق بعد الطهي ليحتفظ بعصارته.',
    basePrice: 380,
    unit: 'كيلو',
    imagePath: 'p-beef.jpg',
    stock: 25,
  },
  {
    name: 'صدور دجاج بلدي',
    description: 'صدور دجاج بلدي طازجة منزوعة الجلد — جاهزة للشوي أو القلي الصحي.',
    basePrice: 145,
    unit: 'كيلو',
    imagePath: 'p-chicken-raw.jpg',
    stock: 40,
  },
  {
    name: 'مكرونة سباجيتي إيطالية',
    description: 'مكرونة سباجيتي إيطالية أصلية، من قمح صلب فاخر.',
    basePrice: 32,
    unit: '500غ',
    imagePath: 'p-pasta.jpg',
    stock: 60,
  },
  {
    name: 'قهوة عربية محمصة',
    description: 'بن عربي محمّص وسط يُطحن قبل التحضير مباشرة لأفضل نكهة — مثالي للإسبريسو وقهوة الفلتر.',
    basePrice: 145,
    unit: '250غ بن',
    imagePath: 'p-coffee.jpg',
    stock: 30,
  },
  {
    name: 'جرانولا بالتوت والمكسرات',
    description: 'جرانولا بالتوت والمكسرات — إفطار متوازن غني بالألياف.',
    basePrice: 95,
    unit: 'علبة 400غ',
    imagePath: 'p-cereal.jpg',
    stock: 30,
  },
  {
    name: 'عصير برتقال طازج',
    description: 'عصير برتقال طازج معصور يومياً، بلا سكر مضاف.',
    basePrice: 38,
    unit: 'زجاجة 1 لتر',
    imagePath: 'p-juice.jpg',
    stock: 45,
  },
  {
    name: 'مياه معدنية فاخرة',
    description: 'مياه معدنية فاخرة معبأة من منبع طبيعي.',
    basePrice: 12,
    unit: '1.5 لتر',
    imagePath: 'p-water.jpg',
    stock: 100,
  },
  {
    name: 'آيس كريم فانيلا طبيعي',
    description: 'آيس كريم فانيلا طبيعي بمكونات كريمية أصيلة.',
    basePrice: 75,
    unit: 'علبة 500مل',
    imagePath: 'p-icecream.jpg',
    stock: 30,
  },
];

async function upsertProduct(categoryId: string, tenantId: string, seed: ProductSeed) {
  const imageUrl = `/demo-products/${seed.imagePath}`;

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
        image_url: imageUrl,
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
        image_url: imageUrl,
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

async function main() {
  console.log('\n=== seed-lovable-reference-demo-products — 19 منتج Demo احترافي (حي الطعام اليومي) ===\n');

  const { data: category, error: categoryErr } = await admin.from('categories').select('id').eq('slug', 'daily-food').single();
  if (categoryErr) throw categoryErr;

  const { data: merchant, error: merchantErr } = await admin.from('merchants').select('id').eq('slug', 'poultry-test').single();
  if (merchantErr) throw merchantErr;

  for (const seed of PRODUCTS) {
    const id = await upsertProduct(category.id, merchant.id, seed);
    console.log(`✓ منتج: ${seed.name} (${id})`);
  }

  console.log(`\n=== تم الزرع بنجاح — ${PRODUCTS.length} منتج، is_active=true ===\n`);
}

main().catch((err) => {
  console.error('✗ فشل السكربت:', err);
  process.exit(1);
});
