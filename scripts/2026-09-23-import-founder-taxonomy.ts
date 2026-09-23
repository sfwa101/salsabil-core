// scripts/2026-09-23-import-founder-taxonomy.ts
// STAGING-BASELINE-FOUNDER-TAXONOMY-FOUNDATION (2026-09-23/24) — يستورد docs/input/
// FOUNDER_APPROVED_TAXONOMY.md (المصدر الوحيد المُعتمَد، AGENTS.md) إلى catalog_districts/
// catalog_categories/catalog_subcategories، ويخفي (is_active=false) الأحياء الـ19 القديمة بدل حذفها
// أو إعادة تسميتها — 5,527 من 7,555 منتج على staging (73%) لهم district_id/catalog_category_id
// فعلي على تلك الشجرة القديمة (تحقُّق حي عبر service_role قبل كتابة هذا السكربت)، فحذفها/تعديلها
// كان سيكسر مراجع حقيقية. لا حذف/تعديل على أي صف منتج هنا إطلاقاً.
//
// **يعتمد على** scripts/2026-09-23-founder-taxonomy-foundation.sql مُطبَّقاً يدوياً أولاً (عمود
// is_active على catalog_categories/catalog_subcategories، عمود tagline على catalog_districts) —
// هذا السكربت يفشل عمداً بلا هذا العمود (لا محاولة صامتة لتجاوز الغياب)، لأن supabase-js لا يوفّر
// تنفيذ DDL مباشرة (لا اتصال Postgres مباشر متاح في هذه البيئة، لا مشروع Supabase CLI مربوط) —
// راجع docs/DATABASE.md §8، نفس القيد الموثَّق أصلاً لكل تغيير Schema في هذا المستودع.
//
// الافتراضي: --dry-run (تقرير تصالح + عدّ فقط، صفر كتابة). الكتابة الفعلية تتطلب --apply صراحة.
// التشغيل (dev، افتراضي): npx tsx scripts/2026-09-23-import-founder-taxonomy.ts
// التشغيل الفعلي على staging: npx tsx scripts/2026-09-23-import-founder-taxonomy.ts --staging --apply

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const useStaging = process.argv.includes('--staging');
const apply = process.argv.includes('--apply');
const envFile = useStaging ? '.env.staging.local' : '.env.local';
const envPath = path.resolve(dirname, '..', envFile);
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
} else {
  console.error(`✗ ملف البيئة غير موجود: ${envFile}`);
  process.exit(1);
}
console.log(`(بيئة: ${useStaging ? 'STAGING' : 'dev'} — ${envFile}، وضع: ${apply ? 'APPLY (كتابة فعلية)' : 'DRY-RUN (تقرير فقط)'})`);

const { createClient } = await import('@supabase/supabase-js');
const { parseFounderTaxonomy } = await import('../src/core/modules/catalog/founder-taxonomy-parser');
const { slugify, makeUniqueSlug } = await import('../src/core/kernel/slug');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('✗ متغيرات بيئة Supabase ناقصة');
  process.exit(1);
}
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const FOUNDER_FILE_PATH = path.resolve(dirname, '..', 'docs/input/FOUNDER_APPROVED_TAXONOMY.md');
const raw = readFileSync(FOUNDER_FILE_PATH, 'utf-8');
const founderDistricts = parseFounderTaxonomy(raw);
if (founderDistricts.length !== 27) {
  console.error(`✗ توقَّعت 27 عالماً، حصلت على ${founderDistricts.length} — توقُّف بلا كتابة`);
  process.exit(1);
}

type ExistingDistrictRow = { id: string; slug: string; name_ar: string; is_active: boolean };
const { data: existingDistricts, error: existingDistrictsError } = await admin
  .from('catalog_districts')
  .select('id, slug, name_ar, is_active');
if (existingDistrictsError) {
  console.error('✗ فشل قراءة catalog_districts الحالية:', existingDistrictsError.message);
  process.exit(1);
}
const existingDistrictRows = existingDistricts as ExistingDistrictRow[];
const founderNames = new Set(founderDistricts.map((d) => d.nameAr));

// تصالح — مطابقة حرفية فقط بالاسم، بلا أي تقريب/تشابه (ممنوع صراحة دمج غامض صامت). أي حي قديم
// اسمه لا يطابق حرفياً أحد الـ27 اسماً الجديدة = OLD_ONLY (يُخفى، لا يُحذَف). أي عالم جديد لا يطابق
// حرفياً اسم حي قديم = NEW_ONLY (هذا متوقَّع لكل الـ27 — الأسماء القديمة كلها بصيغة "حي X" مختلفة تماماً).
const reconciliation = {
  exactMatch: existingDistrictRows.filter((d) => founderNames.has(d.name_ar)),
  oldOnly: existingDistrictRows.filter((d) => !founderNames.has(d.name_ar)),
  newOnly: founderDistricts.filter((d) => !existingDistrictRows.some((e) => e.name_ar === d.nameAr)),
};

console.log(`\nتصالح: EXACT_MATCH=${reconciliation.exactMatch.length} OLD_ONLY=${reconciliation.oldOnly.length} NEW_ONLY=${reconciliation.newOnly.length}\n`);

const existingDistrictSlugs = new Set(existingDistrictRows.map((d) => d.slug));

interface PlannedSubcategory { nameAr: string; slug: string; sortOrder: number }
interface PlannedCategory { nameAr: string; slug: string; sortOrder: number; subcategories: PlannedSubcategory[] }
interface PlannedDistrict { nameAr: string; tagline: string | null; slug: string; sortOrder: number; note: string | null; categories: PlannedCategory[] }

const plan: PlannedDistrict[] = [];
for (const district of founderDistricts) {
  const districtSlug = makeUniqueSlug(slugify(district.nameAr), existingDistrictSlugs);
  existingDistrictSlugs.add(districtSlug);

  const categorySlugsInDistrict = new Set<string>();
  const categories: PlannedCategory[] = district.categories.map((category) => {
    const categorySlug = makeUniqueSlug(slugify(category.nameAr), categorySlugsInDistrict);
    categorySlugsInDistrict.add(categorySlug);

    const subcategorySlugsInCategory = new Set<string>();
    const subcategories: PlannedSubcategory[] = category.subcategories.map((sub) => {
      const subSlug = makeUniqueSlug(slugify(sub.nameAr), subcategorySlugsInCategory);
      subcategorySlugsInCategory.add(subSlug);
      return { nameAr: sub.nameAr, slug: subSlug, sortOrder: sub.sortOrder };
    });

    return { nameAr: category.nameAr, slug: categorySlug, sortOrder: category.sortOrder, subcategories };
  });

  plan.push({ nameAr: district.nameAr, tagline: district.tagline, slug: districtSlug, sortOrder: district.sortOrder, note: district.note, categories });
}

const totalCategories = plan.reduce((s, d) => s + d.categories.length, 0);
const totalSubcategories = plan.reduce((s, d) => s + d.categories.reduce((s2, c) => s2 + c.subcategories.length, 0), 0);
console.log(`الخطة: ${plan.length} حياً، ${totalCategories} قسماً رئيسياً، ${totalSubcategories} قسماً فرعياً`);

// تقرير التصالح — يُكتَب دائماً (dry-run أو apply)، مصدر المعرفة الوحيد لهذا القرار خارج الكود.
const reportPath = path.resolve(dirname, '..', 'docs/audits/2026-09-23-founder-taxonomy-reconciliation.md');
const reportLines: string[] = [
  '---',
  'title: تصالح شجرة التصنيف — القديمة (19 حياً) مقابل المُعتمَدة من المؤسس (27 عالماً)',
  `date: 2026-09-23`,
  'type: audit',
  'author: Claude',
  '---',
  '',
  '# تصالح شجرة التصنيف',
  '',
  `مصدر الحقيقة الوحيد: docs/input/FOUNDER_APPROVED_TAXONOMY.md. مطابقة بالاسم الحرفي فقط — بلا أي`,
  `تقريب/تشابه (AGENTS.md: "لا تُستخدَم المطابقة بالتشابه لدمج سجلات غامضة صامتاً").`,
  '',
  `- EXACT_MATCH: ${reconciliation.exactMatch.length}`,
  `- OLD_ONLY (يُخفى is_active=false، لا يُحذَف — ${reconciliation.exactMatch.length + reconciliation.oldOnly.length === existingDistrictRows.length ? 'يغطي كل الأحياء القديمة' : 'راجع العدّ'}): ${reconciliation.oldOnly.map((d) => d.name_ar).join('، ')}`,
  `- NEW_ONLY (تُضاف من ملف المؤسس، ${reconciliation.newOnly.length}/27): ${reconciliation.newOnly.map((d) => d.nameAr).join('، ')}`,
  '',
  `**الأثر على المنتجات الحالية**: صفر — الأحياء القديمة تبقى موجودة (مخفية فقط)، تحافظ على`,
  `district_id/catalog_category_id لكل منتج حالي مرتبط بها. لا حذف ولا إعادة تصنيف منتجات في هذه`,
  `المهمة (مؤجَّل لمهمة إعادة ضبط الكتالوج المنفصلة).`,
  '',
  `## الخطة (${plan.length} حياً، ${totalCategories} قسماً رئيسياً، ${totalSubcategories} قسماً فرعياً)`,
  '',
];
for (const d of plan) {
  reportLines.push(`### ${d.sortOrder}. ${d.nameAr} (${d.slug})${d.tagline ? ` — ${d.tagline}` : ''}`);
  if (d.note) reportLines.push(`> ${d.note}`);
  for (const c of d.categories) {
    reportLines.push(`- ${c.nameAr} (${c.slug}): ${c.subcategories.map((s) => s.nameAr).join('، ')}`);
  }
  reportLines.push('');
}
writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');
console.log(`\nتقرير التصالح: ${reportPath}`);

if (!apply) {
  console.log('\nDRY-RUN فقط — لم تُكتَب أي صفوف. أعد التشغيل بـ--apply للكتابة الفعلية (بعد تطبيق SQL migration يدوياً).');
  process.exit(0);
}

// إخفاء الأحياء القديمة — تحديث is_active فقط، لا حذف، لا لمس أي حقل آخر.
for (const oldDistrict of reconciliation.oldOnly) {
  if (!oldDistrict.is_active) continue; // مخفي أصلاً — idempotent
  const { error } = await admin.from('catalog_districts').update({ is_active: false }).eq('id', oldDistrict.id);
  if (error) {
    console.error(`✗ فشل إخفاء الحي القديم "${oldDistrict.name_ar}":`, error.message);
    process.exit(1);
  }
}
console.log(`أُخفيت ${reconciliation.oldOnly.length} حياً قديماً (is_active=false).`);

// إدراج الشجرة الجديدة — idempotent عبر upsert بـonConflict على قيود UNIQUE الموجودة فعلاً.
for (const d of plan) {
  const { data: districtRow, error: districtError } = await admin
    .from('catalog_districts')
    .upsert({ slug: d.slug, name_ar: d.nameAr, tagline: d.tagline, sort_order: d.sortOrder, is_active: true }, { onConflict: 'slug' })
    .select('id')
    .single();
  if (districtError) {
    console.error(`✗ فشل إدراج الحي "${d.nameAr}":`, districtError.message);
    process.exit(1);
  }
  const districtId = (districtRow as { id: string }).id;

  for (const c of d.categories) {
    const { data: categoryRow, error: categoryError } = await admin
      .from('catalog_categories')
      .upsert({ district_id: districtId, slug: c.slug, name_ar: c.nameAr, sort_order: c.sortOrder, is_active: true }, { onConflict: 'district_id,slug' })
      .select('id')
      .single();
    if (categoryError) {
      console.error(`✗ فشل إدراج القسم "${c.nameAr}" (حي ${d.nameAr}):`, categoryError.message);
      process.exit(1);
    }
    const categoryId = (categoryRow as { id: string }).id;

    for (const s of c.subcategories) {
      const { error: subError } = await admin
        .from('catalog_subcategories')
        .upsert({ category_id: categoryId, slug: s.slug, name_ar: s.nameAr, sort_order: s.sortOrder, is_active: true }, { onConflict: 'category_id,slug' });
      if (subError) {
        console.error(`✗ فشل إدراج القسم الفرعي "${s.nameAr}" (قسم ${c.nameAr}):`, subError.message);
        process.exit(1);
      }
    }
  }
  console.log(`✓ ${d.nameAr} (${d.categories.length} قسماً، ${d.categories.reduce((s, c) => s + c.subcategories.length, 0)} قسماً فرعياً)`);
}

console.log(`\nتم — ${plan.length} حياً، ${totalCategories} قسماً رئيسياً، ${totalSubcategories} قسماً فرعياً.`);
