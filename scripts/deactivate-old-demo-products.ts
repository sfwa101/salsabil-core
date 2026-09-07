// scripts/deactivate-old-demo-products.ts
//
// HEADER-BOTTOMNAV-REDESIGN-AND-REAL-PRODUCT-IMPORT دفعة 3 — تعطيل آمن (لا حذف) للثمانية منتجات
// القديمة من scripts/seed-daily-food-demo-content.ts (أرز/سكر/زيت/بيض/طماطم/بصل/خبز/جبنة قريش) بعد
// إحلال 19 منتجاً احترافياً حقيقياً محلها (scripts/seed-lovable-reference-demo-products.ts، دفعة 2).
//
// فحص FK إلزامي (قبل الموافقة، مُنفَّذ حياً — راجع Task Report دفعة 3): صفر مراجع في order_items
// وcart_items للثمانية جميعاً — آمن للتعطيل. **"دجاجة كاملة طازجة" مُستبعَدة عمداً وكلياً من هذا
// السكربت** — لها 16 مرجعاً في order_items و12 في cart_items (سجل طلبات حقيقي، على الأرجح اختبره
// المؤسس بنفسه) — لا تُذكَر هنا إطلاقاً، لا يُسمح لأي تعديل مستقبلي على هذا الملف بإضافتها بلا قرار
// مؤسس منفصل وصريح جديد.
//
// is_active=false فقط — لا DELETE، لا لمس على صفوف order_items/order_status_history المرتبطة (سعرها
// مُجمَّد أصلاً في unit_price_snapshot وقت الطلب، ADR-009). idempotent وقابل للعكس بالكامل: إعادة
// التشغيل بلا تغيير = نفس النتيجة؛ للتراجع، غيّر ACTIVE أدناه إلى true وأعد التشغيل.
// CatalogRepository.findAllProducts()/findProductsByIds() يستبعدان is_active=false أصلاً (مُتحقَّق
// من الكود) — التعطيل يُخفي المنتجات من كل واجهة عرض بلا أي كود إضافي.
//
// التشغيل: npx tsx scripts/deactivate-old-demo-products.ts

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

// عكس الحالة: true لإعادة تفعيل الثمانية (تراجع كامل عن هذا السكربت).
const ACTIVE = false;

// الثمانية فقط — نفس الأسماء الحرفية في scripts/seed-daily-food-demo-content.ts. "دجاجة كاملة
// طازجة" مُستبعَدة عمداً (راجع تعليق أعلى الملف).
const OLD_DEMO_PRODUCT_NAMES = [
  'أرز مصري أبيض (كيس 1 كجم)',
  'سكر أبيض مكرر (كيس 1 كجم)',
  'زيت عباد شمس (زجاجة 1 لتر)',
  'بيض بلدي طازج (طبق 30 بيضة)',
  'طماطم بلدي طازجة (كجم)',
  'بصل أصفر طازج (كجم)',
  'خبز بلدي طازج (5 أرغفة)',
  'جبنة بيضاء قريش (نصف كيلو)',
];

async function main() {
  console.log(`\n=== deactivate-old-demo-products — is_active=${ACTIVE} لـ${OLD_DEMO_PRODUCT_NAMES.length} منتج قديم ===\n`);

  const { data: products, error: findErr } = await admin
    .from('products')
    .select('id, name, is_active')
    .in('name', OLD_DEMO_PRODUCT_NAMES);
  if (findErr) throw findErr;

  if (!products || products.length !== OLD_DEMO_PRODUCT_NAMES.length) {
    console.error(`✗ توقُّع ${OLD_DEMO_PRODUCT_NAMES.length} منتجاً، وُجد ${products?.length ?? 0} — توقف بلا تعديل.`);
    process.exit(1);
  }

  for (const p of products) {
    const { error: updateErr } = await admin.from('products').update({ is_active: ACTIVE }).eq('id', p.id);
    if (updateErr) throw updateErr;
    console.log(`✓ ${p.name} (${p.id}): is_active ${p.is_active} → ${ACTIVE}`);
  }

  console.log(`\n=== تم — ${products.length} منتج، is_active=${ACTIVE} ===\n`);
}

main().catch((err) => {
  console.error('✗ فشل السكربت:', err);
  process.exit(1);
});
