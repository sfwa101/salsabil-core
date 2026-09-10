// scripts/seed-real-neighborhoods-demo-content.ts
// PRODUCT-BOTTOM-SHEET-AND-NEIGHBORHOODS-BATCH (بند 2، DD-013) — يزرع 5 أحياء حقيقية جديدة (صفوف
// categories فعلية، لا "ألوان جاهزة" فقط) + منتجات تجريبية دائمة لكل حي. Idempotent (نفس نمط
// scripts/seed-daily-food-demo-content.ts) — آمن لإعادة التشغيل بلا تكرار صفوف.
//
// اختيار الـslugs إلزامي المطابقة الحرفية لمفاتيح src/config/neighborhood-identity-registry.ts (لا
// أسماء مخترَعة) — هذا وحده ما يُفعِّل الهوية البصرية (لون + بلوكات) تلقائياً بلا أي كود إضافي، تماماً
// كما وثَّقت docs/DECISIONS.md → DD-013. "السوبرماركت" **لم يُنشَأ كحي منفصل هنا عمداً** — يطابق
// بالفعل daily-food الموجود أصلاً (راجع sourceNote الخاص بـ'reef:daily-food' في السجل نفسه: "لا حي
// سوبرماركت منفصل عندنا")؛ إنشاء صف مكرِّر بنفس اللون كان سيخالف ADR-024 صراحة بلا داعٍ فعلي.
//
// منتج واحد في "مطبخ ريف" بخيارات addon (لا يوجد أي منتج بخيارات addon في القاعدة قبل هذا السكربت —
// تحقَّقتُ منه حياً) — أول اختبار بيانات حقيقي لـ"بلوك الإضافات" (بند 3 من نفس المهمة). منتج واحد في
// "اللحوم والدواجن" بخيارات size — يثبت أن بلوك الوزن ليس خاصاً بـ"دجاجة كاملة طازجة" (daily-food)
// وحدها، بل يعمل تلقائياً لأي منتج بخيارات size في أي حي، عبر السجل المركزي
// product-page-blocks-registry.ts بلا أي كود إضافي لكل حي.
//
// التشغيل: npx tsx scripts/seed-real-neighborhoods-demo-content.ts

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

type SizeOptionSeed = { id: string; type: 'size'; label: string; priceModifier: number };
type AddonOptionSeed = { id: string; type: 'addon'; label: string; priceModifier: number };
type ProductOptionSeed = SizeOptionSeed | AddonOptionSeed;

type ProductSeed = {
  name: string;
  description: string;
  basePrice: number;
  unit: string;
  imageUrl: string;
  stock: number;
  options?: ProductOptionSeed[];
};

type CategorySeed = {
  slug: string; // يجب أن يطابق مفتاحاً في neighborhood-identity-registry.ts حرفياً
  name: string;
  displayOrder: number;
  products: ProductSeed[];
};

const CATEGORIES: CategorySeed[] = [
  {
    slug: 'produce',
    name: 'الخضار والفواكه',
    displayOrder: 2,
    products: [
      { name: 'خس طازج', description: 'خس طازج مقرمش، يُقطف يومياً.', basePrice: 8, unit: 'piece', imageUrl: 'https://placehold.co/800x800/6b8f3a/ffffff.png?text=Lettuce', stock: 60 },
      { name: 'جزر بلدي', description: 'جزر بلدي طازج، غني بالفيتامينات.', basePrice: 12, unit: 'kg', imageUrl: 'https://placehold.co/800x800/e07a1f/ffffff.png?text=Carrots', stock: 70 },
      { name: 'فلفل ألوان', description: 'فلفل رومي مشكّل الألوان، طازج ومقرمش.', basePrice: 22, unit: 'kg', imageUrl: 'https://placehold.co/800x800/c62828/ffffff.png?text=Peppers', stock: 45 },
      { name: 'ليمون بلدي', description: 'ليمون بلدي طازج، حامضي منعش.', basePrice: 16, unit: 'kg', imageUrl: 'https://placehold.co/800x800/c9d92e/333333.png?text=Lemon', stock: 65 },
      { name: 'بطاطس بلدي', description: 'بطاطس بلدي طازجة، مناسبة لكل الأطباق.', basePrice: 14, unit: 'kg', imageUrl: 'https://placehold.co/800x800/c9a06a/4a2f11.png?text=Potatoes', stock: 90 },
    ],
  },
  {
    slug: 'dairy',
    name: 'الألبان',
    displayOrder: 3,
    products: [
      { name: 'لبن جاموسي طازج', description: 'لبن جاموسي كامل الدسم، طازج يومياً.', basePrice: 28, unit: 'liter', imageUrl: 'https://placehold.co/800x800/f5f5f5/333333.png?text=Buffalo+Milk', stock: 40 },
      { name: 'جبنة رومي مستعملة', description: 'جبنة رومي حادة النكهة، مستعملة عالية الجودة.', basePrice: 90, unit: '500g', imageUrl: 'https://placehold.co/800x800/f4d35e/5a3d1f.png?text=Roumy+Cheese', stock: 25 },
      { name: 'زبادي بالفواكه', description: 'زبادي طازج بقطع فواكه حقيقية.', basePrice: 14, unit: 'piece', imageUrl: 'https://placehold.co/800x800/f28fb0/5a1f33.png?text=Fruit+Yogurt', stock: 55 },
      { name: 'قشطة طازجة', description: 'قشطة طازجة كاملة الدسم، مناسبة للحلويات والمقبلات.', basePrice: 35, unit: '250g', imageUrl: 'https://placehold.co/800x800/fffdf5/6b5a3d.png?text=Cream', stock: 30 },
    ],
  },
  {
    slug: 'kitchen',
    name: 'مطبخ ريف',
    displayOrder: 4,
    products: [
      {
        name: 'وجبة فراخ مشوية جاهزة',
        description: 'نصف فرخة مشوية على الفحم، تُقدَّم ساخنة فور الطلب.',
        basePrice: 85,
        unit: 'meal',
        imageUrl: 'https://placehold.co/800x800/df5920/ffffff.png?text=Grilled+Chicken',
        stock: 20,
        options: [
          { id: 'extra-rice', type: 'addon', label: 'أرز إضافي', priceModifier: 15 },
          { id: 'extra-salad', type: 'addon', label: 'سلطة إضافية', priceModifier: 10 },
          { id: 'soft-drink', type: 'addon', label: 'مشروب غازي', priceModifier: 8 },
        ],
      },
      {
        name: 'كشري مصري',
        description: 'كشري مصري أصلي بالصلصة والدقة، يُحضَّر طازجاً.',
        basePrice: 35,
        unit: 'meal',
        imageUrl: 'https://placehold.co/800x800/c9862f/ffffff.png?text=Koshari',
        stock: 30,
        options: [
          { id: 'small', type: 'size', label: 'صغير', priceModifier: -8 },
          { id: 'medium', type: 'size', label: 'وسط', priceModifier: 0 },
          { id: 'large', type: 'size', label: 'كبير', priceModifier: 12 },
        ],
      },
      { name: 'محشي ورق عنب جاهز', description: 'محشي ورق عنب باللحمة المفرومة، جاهز للتسخين.', basePrice: 60, unit: 'kg', imageUrl: 'https://placehold.co/800x800/6b8f3a/ffffff.png?text=Stuffed+Grape+Leaves', stock: 18 },
      { name: 'طاجن بامية بلحمة', description: 'طاجن بامية طازجة بقطع لحم ضأن، جاهز للتقديم.', basePrice: 70, unit: 'meal', imageUrl: 'https://placehold.co/800x800/2c6b2c/ffffff.png?text=Okra+Stew', stock: 15 },
    ],
  },
  {
    slug: 'meat',
    name: 'اللحوم والدواجن',
    displayOrder: 5,
    products: [
      {
        name: 'لحم بقري مفروم طازج',
        description: 'لحم بقري مفروم طازج، نسبة دهن منخفضة.',
        basePrice: 220,
        unit: 'kg',
        imageUrl: 'https://placehold.co/800x800/9b3027/ffffff.png?text=Ground+Beef',
        stock: 25,
        options: [
          { id: 'half-kg', type: 'size', label: 'نصف كيلو', priceModifier: -110 },
          { id: 'one-kg', type: 'size', label: 'كيلو واحد', priceModifier: 0 },
          { id: 'two-kg', type: 'size', label: 'كيلوين', priceModifier: 210 },
        ],
      },
      { name: 'صدور دجاج فيليه', description: 'صدور دجاج فيليه منزوعة العظم والجلد، طازجة.', basePrice: 130, unit: 'kg', imageUrl: 'https://placehold.co/800x800/e8c9a0/5a3d1f.png?text=Chicken+Fillet', stock: 35 },
      { name: 'كبدة بقري طازجة', description: 'كبدة بقري طازجة، مناسبة للشوي والقلي.', basePrice: 150, unit: 'kg', imageUrl: 'https://placehold.co/800x800/7a1f2b/ffffff.png?text=Beef+Liver', stock: 15 },
      { name: 'سجق بلدي', description: 'سجق بلدي حار، مُتبَّل بالتوابل الطازجة.', basePrice: 95, unit: 'kg', imageUrl: 'https://placehold.co/800x800/8a2e1f/ffffff.png?text=Sausage', stock: 22 },
    ],
  },
  {
    slug: 'sweets',
    name: 'حلويات اليوم',
    displayOrder: 6,
    products: [
      { name: 'بسبوسة بالقشطة', description: 'بسبوسة طازجة محشوة بالقشطة، مُحلاة بالقطر.', basePrice: 45, unit: 'kg', imageUrl: 'https://placehold.co/800x800/e8b84b/5a3d1f.png?text=Basbousa', stock: 20 },
      { name: 'كنافة بالمكسرات', description: 'كنافة ناعمة محشوة بالمكسرات المشكّلة.', basePrice: 65, unit: 'kg', imageUrl: 'https://placehold.co/800x800/d99a3d/5a3d1f.png?text=Kunafa', stock: 18 },
      { name: 'أم علي', description: 'أم علي ساخنة بالمكسرات والقشطة، تُقدَّم طازجة.', basePrice: 30, unit: 'piece', imageUrl: 'https://placehold.co/800x800/f2c94c/5a3d1f.png?text=Om+Ali', stock: 25 },
      { name: 'بقلاوة مشكّلة', description: 'بقلاوة مشكّلة بالفستق واللوز، مُحلاة بالقطر.', basePrice: 80, unit: 'kg', imageUrl: 'https://placehold.co/800x800/c98f1d/5a3d1f.png?text=Baklava', stock: 15 },
    ],
  },
];

async function upsertCategory(seed: CategorySeed): Promise<string> {
  const { data: existing, error: findErr } = await admin.from('categories').select('id').eq('slug', seed.slug).maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    const { error: updateErr } = await admin
      .from('categories')
      .update({ name: seed.name, display_order: seed.displayOrder, is_active: true })
      .eq('id', existing.id);
    if (updateErr) throw updateErr;
    return existing.id as string;
  }

  const { data: inserted, error: insertErr } = await admin
    .from('categories')
    .insert({ slug: seed.slug, name: seed.name, display_order: seed.displayOrder, is_active: true })
    .select('id')
    .single();
  if (insertErr) throw insertErr;
  return inserted.id as string;
}

async function upsertProduct(categoryId: string, tenantId: string, seed: ProductSeed): Promise<string> {
  const { data: existing, error: findErr } = await admin
    .from('products')
    .select('id')
    .eq('category_id', categoryId)
    .eq('name', seed.name)
    .maybeSingle();
  if (findErr) throw findErr;

  const row = {
    description: seed.description,
    base_price: seed.basePrice,
    unit: seed.unit,
    image_url: seed.imageUrl,
    options: seed.options ?? [],
    is_active: true,
  };

  let productId: string;
  if (existing) {
    productId = existing.id as string;
    const { error: updateErr } = await admin.from('products').update(row).eq('id', productId);
    if (updateErr) throw updateErr;
  } else {
    const { data: inserted, error: insertErr } = await admin
      .from('products')
      .insert({ category_id: categoryId, tenant_id: tenantId, name: seed.name, ...row })
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
  console.log('\n=== SEED-REAL-NEIGHBORHOODS — 5 أحياء حقيقية + منتجات تجريبية دائمة ===\n');

  const { data: merchant, error: merchantErr } = await admin.from('merchants').select('id').eq('slug', 'poultry-test').single();
  if (merchantErr) throw merchantErr;

  for (const category of CATEGORIES) {
    const categoryId = await upsertCategory(category);
    console.log(`\n✓ حي: ${category.name} (${category.slug}, ${categoryId})`);
    for (const product of category.products) {
      const productId = await upsertProduct(categoryId, merchant.id, product);
      console.log(`  ✓ منتج: ${product.name}${product.options?.length ? ` [${product.options[0].type}]` : ''} (${productId})`);
    }
  }

  console.log('\n=== تم الزرع بنجاح — 5 أحياء، 21 منتجاً، الكل is_active=true ===\n');
}

main().catch((err) => {
  console.error('✗ فشل السكربت:', err);
  process.exit(1);
});
