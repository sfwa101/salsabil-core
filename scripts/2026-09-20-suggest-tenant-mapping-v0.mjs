// scripts/2026-09-20-suggest-tenant-mapping-v0.mjs
//
// §31 بند 4 (REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md) — V0 بسيطة لخطة توصيل tenant_id للمنتجات
// المستوردة بلا تاجر (99.3% من الكتالوج، DD-020). هذا سكربت **قراءة فقط** — لا يكتب صفاً واحداً على
// أي جدول. يقترح مطابقات بين منتجات مستوردة بلا tenant_id وتجار حقيقيين موجودين فعلياً، بناءً على
// تطابق اسم حرفي بعد التطبيع (normalizeProductName من src/core/modules/catalog/text-normalize.ts —
// نفس الدالة المعتمَدة أصلاً في ADR-031 لمطابقة استيراد Excel، بنفس قرار المؤسس: تطابق حرفي فقط، لا
// تقريبي، لتفادي دمج مالي/مخزوني خاطئ صامت).
//
// المخرج: تقرير Markdown في docs/audits/ فقط. لا تطبيق تلقائي لأي ربط — هذا قرار نطاق عمل حقيقي
// يحتاج تأكيد المؤسس (موثَّق كقرار معلَّق في سجل البناء الليلي 2026-09-20).
//
// التشغيل: npx tsx scripts/2026-09-20-suggest-tenant-mapping-v0.mjs [--env=staging]

import { existsSync, writeFileSync } from 'node:fs';
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
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error(`✗ متغيرات بيئة Supabase ناقصة في ${envFile}`);
  process.exit(1);
}

// service_role هنا لغرض القراءة الشاملة فقط (كل المنتجات بلا قيد RLS anon) — هذا السكربت لا يستدعي
// .insert()/.update()/.delete() على أي جدول إطلاقاً، تحقَّق من ذلك بقراءة الملف كاملاً.
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_MERCHANT_SLUG = 'poultry-test';

// نسخة حرفية طبق الأصل من src/core/modules/catalog/text-normalize.ts (لا استيراد مباشر — هذا سكربت
// standalone خارج بنية Next.js/TS module resolution؛ راجع ذلك الملف لو احتجت تعديل منطق التطبيع
// نفسه، هذه نسخة يجب مزامنتها يدوياً لو تغيّر الأصل).
const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const UNIT_TOKEN_ALIASES = {
  'كجم': 'كيلو',
  'كغم': 'كيلو',
  'كيلوجرام': 'كيلو',
  'جم': 'جرام',
  'جرامات': 'جرام',
  'لترات': 'لتر',
  'قطع': 'قطعة',
};
function normalizeProductName(raw) {
  const collapsed = raw
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  return collapsed
    .split(' ')
    .map((token) => UNIT_TOKEN_ALIASES[token] ?? token)
    .join(' ')
    .trim();
}

async function main() {
  console.log(`\n=== suggest-tenant-mapping-v0 (${envFile}) — تحليل قراءة فقط، صفر كتابة ===\n`);

  const { data: demoMerchant, error: demoErr } = await admin.from('merchants').select('id').eq('slug', DEMO_MERCHANT_SLUG).maybeSingle();
  if (demoErr) throw demoErr;

  const { data: merchants, error: merchErr } = await admin.from('merchants').select('id, slug, business_name');
  if (merchErr) throw merchErr;
  const merchantById = new Map(merchants.map((m) => [m.id, m]));

  // PostgREST يفرض حداً افتراضياً (1000 صف) لكل استعلام — الكتالوج المستورد وحده ~7,506 صف، فبلا
  // ترقيم صفحات هنا كان العدد سيُقصَّم صامتاً إلى 1000 فقط (اكتُشف حياً عند أول تشغيل تجريبي لهذا
  // السكربت نفسه — 1000 بالضبط، رقم مريب مطابق تماماً للحد الافتراضي). .range() صريح حتى تنضب الصفوف.
  async function fetchAllPages(buildQuery) {
    const pageSize = 1000;
    let from = 0;
    const all = [];
    for (;;) {
      const { data, error } = await buildQuery(admin).range(from, from + pageSize - 1);
      if (error) throw error;
      all.push(...data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  const orphanProducts = await fetchAllPages((client) =>
    client.from('products').select('id, name, base_price, catalog_category_id, is_active').is('tenant_id', null).eq('is_active', true)
  );

  const ownedProductsRaw = await fetchAllPages((client) => client.from('products').select('id, name, tenant_id, catalog_category_id').not('tenant_id', 'is', null));
  const ownedProducts = demoMerchant ? ownedProductsRaw.filter((p) => p.tenant_id !== demoMerchant.id) : ownedProductsRaw;

  console.log(`منتجات مستوردة بلا tenant_id (نشطة): ${orphanProducts.length}`);
  console.log(`منتجات تجار حقيقيين (باستثناء ${DEMO_MERCHANT_SLUG}): ${ownedProducts.length}`);

  // فهرس بالاسم المُطبَّع — قد يحمل أكثر من تاجر لنفس الاسم المُطبَّع (كتالوجات متطابقة تقريباً،
  // §29 بند 3 من تقرير التدقيق) — تُقتَرح كل التطابقات، لا الأول فقط، والمراجع البشري يقرر.
  const ownedByNormalizedName = new Map();
  for (const p of ownedProducts) {
    const key = normalizeProductName(p.name);
    if (!ownedByNormalizedName.has(key)) ownedByNormalizedName.set(key, []);
    ownedByNormalizedName.get(key).push(p);
  }

  const suggestions = [];
  for (const orphan of orphanProducts) {
    const key = normalizeProductName(orphan.name);
    const matches = ownedByNormalizedName.get(key);
    if (matches && matches.length > 0) {
      suggestions.push({ orphan, matches });
    }
  }

  console.log(`اقتراحات مطابقة حرفية (بعد التطبيع): ${suggestions.length} من ${orphanProducts.length}`);
  console.log(`بلا أي مطابقة: ${orphanProducts.length - suggestions.length}`);

  // تحقق إضافي عند صفر اقتراحات — ينفي احتمال خلل في دالة التطبيع نفسها (لا مجرد افتراض) عبر مطابقة
  // سلسلة نصية خام بلا أي تطبيع إطلاقاً.
  let rawExactMatchCount = 0;
  if (suggestions.length === 0) {
    const ownedRawNames = new Set(ownedProducts.map((p) => p.name));
    rawExactMatchCount = orphanProducts.filter((p) => ownedRawNames.has(p.name)).length;
    console.log(`(تحقق إضافي) تطابق سلسلة نصية خام بلا تطبيع إطلاقاً: ${rawExactMatchCount}`);
  }

  const lines = [];
  lines.push('---');
  lines.push('title: اقتراحات ربط tenant_id V0 — منتجات مستوردة بلا تاجر (§31 بند 4)');
  lines.push('status: تقرير تحليلي — لا تطبيق تلقائي، بانتظار مراجعة/تأكيد المؤسس');
  lines.push('version: 1.0');
  lines.push(`last_updated: 2026-09-20`);
  lines.push('owner: Claude (تحليل قراءة فقط) — للمراجعة من المؤسس');
  lines.push('source_of_truth: هذا الملف تقرير تحليلي وحيد الغرض — لا يُطبَّق أي ربط منه تلقائياً');
  lines.push('related: docs/DECISIONS.md → DD-020، docs/audits/REEF_PHASE_1_PRODUCT_COMPLETENESS_AUDIT.md §31 بند 4، ADR-031 (normalizeProductName)');
  lines.push('---');
  lines.push('');
  lines.push('# اقتراحات ربط tenant_id V0 — منتجات مستوردة بلا تاجر');
  lines.push('');
  lines.push(`**بيئة القراءة:** ${envFile === '.env.staging.local' ? 'staging' : 'dev'}`);
  lines.push('');
  lines.push('**منهجية:** تطابق اسم حرفي فقط بعد التطبيع (`normalizeProductName`، نفس دالة ADR-031) —');
  lines.push('لا تقريب/تشابه جزئي، بنفس قرار المؤسس الموثَّق هناك (تفادي دمج خاطئ صامت). هذا تقرير');
  lines.push('**اقتراحات فقط — صفر كتابة على قاعدة البيانات، صفر ربط تلقائي مُطبَّق.**');
  lines.push('');
  lines.push('## الملخص');
  lines.push('');
  lines.push(`| المقياس | العدد |`);
  lines.push(`|---|---|`);
  lines.push(`| منتجات مستوردة بلا tenant_id (نشطة) | ${orphanProducts.length} |`);
  lines.push(`| منتجات تجار حقيقيين (باستثناء poultry-test) | ${ownedProducts.length} |`);
  lines.push(`| اقتراحات مطابقة حرفية | ${suggestions.length} |`);
  lines.push(`| بلا أي مطابقة (تحتاج نهجاً آخر لاحقاً — خارج نطاق V0) | ${orphanProducts.length - suggestions.length} |`);
  lines.push('');

  if (suggestions.length > 0) {
    lines.push('## الاقتراحات التفصيلية');
    lines.push('');
    lines.push('| منتج مستورد (id) | الاسم | تجار مقترَحون (slug — اسم المتجر) |');
    lines.push('|---|---|---|');
    for (const s of suggestions) {
      const merchantList = s.matches
        .map((m) => {
          const merchant = merchantById.get(m.tenant_id);
          return merchant ? `${merchant.slug} — ${merchant.business_name}` : m.tenant_id;
        })
        .join('، ');
      lines.push(`| \`${s.orphan.id}\` | ${s.orphan.name} | ${merchantList} |`);
    }
    lines.push('');
  } else {
    const sampleOwned = ownedProducts.slice(0, 5).map((p) => p.name);
    const sampleOrphan = orphanProducts.slice(0, 5).map((p) => p.name);
    lines.push('## الاقتراحات التفصيلية');
    lines.push('');
    lines.push('لا اقتراحات — صفر تطابق حرفي بين أسماء الكتالوج المستورد وكتالوجات التجار العشرة');
    lines.push(`الحاليين، حتى بلا أي تطبيع إطلاقاً (تحقق إضافي مباشر في هذا التشغيل نفسه: ${rawExactMatchCount}`);
    lines.push('تطابق سلسلة نصية حرفية خام — ينفي احتمال وجود خلل في دالة التطبيع نفسها، لا افتراضاً).');
    lines.push('');
    lines.push('**السبب الجذري المُلاحَظ فعلياً (لا افتراض):** منتجات التجار العشرة الحاليين أسماء');
    lines.push('عامة مُدخَلة يدوياً وقت بناء اليوم 9-13 (بيانات اختبار مبكرة)، بينما الكتالوج المستورد');
    lines.push('(TASK-17) أسماء منتجات حقيقية بعلامات تجارية فعلية من مصدر مختلف تماماً — لا تقاطع');
    lines.push('مفرداتي بينهما عملياً. عيّنة للمقارنة المباشرة:');
    lines.push('');
    lines.push(`- أمثلة من كتالوج التجار العشرة: ${sampleOwned.map((n) => `"${n}"`).join('، ')}`);
    lines.push(`- أمثلة من الكتالوج المستورد: ${sampleOrphan.map((n) => `"${n}"`).join('، ')}`);
    lines.push('');
    lines.push('**الخلاصة العملية:** مطابقة الاسم وحدها (V0) لن تُنتج أي اقتراح مفيد بالتشكيلة الحالية');
    lines.push('من التجار — يتطلب أياً من: (أ) توسّع عدد التجار الحقيقيين المسجَّلين فعلياً بكتالوجات');
    lines.push('من نفس مصدر الاستيراد، أو (ب) إعادة إدخال كتالوج التجار العشرة الحاليين بأسماء تطابق');
    lines.push('مصدر الاستيراد الحقيقي، أو (ج) نهج مطابقة مختلف كلياً (تصنيف/قسم/سعر تقريبي بدل الاسم)');
    lines.push('— كل هذه قرارات منتجية تحتاج توجيهاً صريحاً من المؤسس، خارج نطاق V0 المطلوب هنا صراحة.');
    lines.push('');
  }

  lines.push('## قرار معلَّق بانتظار المؤسس');
  lines.push('');
  lines.push('هل معيار "تطابق حرفي بعد التطبيع" وحده كافٍ لقبول ربط تلقائي لاحقاً لبعض/كل الاقتراحات');
  lines.push('أعلاه، أم كل واحد يحتاج مراجعة بشرية فردية قبل أي تطبيق فعلي على `products.tenant_id`؟');
  lines.push('**الافتراض المؤقت المطبَّق في هذه المهمة:** لا شيء يُطبَّق تلقائياً — هذا الملف عرض فقط.');
  lines.push('');

  const outPath = path.resolve(dirname, '..', 'docs', 'audits', '2026-09-20-tenant-mapping-v0-suggestions-report.md');
  writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log(`\n✓ التقرير كُتب إلى: ${outPath}\n`);
}

main().catch((err) => {
  console.error('✗ فشل السكربت:', err);
  process.exit(1);
});
