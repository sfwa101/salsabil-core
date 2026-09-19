/**
 * REEF V1 — Seeder: استيراد products_seed_final.json إلى products
 * (يفترض إن 01-districts-architecture-migration.sql اتشغّل قبله على نفس البيئة)
 *
 * الهيكلية: catalog_districts -> catalog_categories -> catalog_subcategories (3 مستويات)
 *
 * تصحيحات عن المسودة الأصلية (TASK-17، راجع رأس 01-districts-architecture-migration.sql):
 *   - اسم الجدول الفعلي products، لا catalog_master_items.
 *   - جداول التصنيف الجديدة catalog_districts/catalog_categories/catalog_subcategories
 *     (لا districts/categories/subcategories — تصادم مع جدول categories الحي القديم).
 *   - FK الأقسام على المنتج اسمه catalog_category_id/catalog_subcategory_id، لا category_id/
 *     subcategory_id (category_id القديم NOT NULL ويشير لجدول categories القديم، سياق مختلف تماماً).
 *   - title_ar/price/primary_image في ملف JSON تُخرَّط لأعمدة name/base_price/image_url
 *     الموجودة بالفعل على الجدول — لا أعمدة جديدة بهذه الأسماء.
 *
 * فجوات بيانات حقيقية مكتشفة في products_seed_final.json (وثّقها التقرير النهائي، لم تُصلَح هنا):
 *   - 76 صف بلا price → تُستبعَد من الاستيراد (base_price NOT NULL على الجدول الحقيقي، لا قيمة
 *     مُختلَقة). تُطبَع أسماؤها في الملخص.
 *   - ~642 صف مصدرها amazon بلا unit → يُستخدَم 'piece' (نفس default الجدول) بدل NULL.
 *   - unique_key: النسخة المُصحَّحة من الملف بها مفتاح لكل صف بلا استثناء (barcode/gtin → sku/asin
 *     → usa_id كـfallback)، صفر تكرار — تحقّقتُ منه فعلياً. upsert on-conflict يعمل بشكل كامل الآن.
 *
 * الاستخدام:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node 02-seed-products.mjs
 *   --dry-run  → عرض العدد والتوزيع بس، بدون كتابة على القاعدة
 *   --reset    → مسح كل صفوف products قبل الاستيراد (destructive)
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_FILE = path.join(__dirname, "data", "products_seed_final.json");

const DRY_RUN = process.argv.includes("--dry-run");
const RESET = process.argv.includes("--reset");
const BATCH_SIZE = 500;
const TABLE = "products";

function assertEnv() {
  if (DRY_RUN) return;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ لازم SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في env (أو استخدم --dry-run).");
    process.exit(1);
  }
}

function loadRows() {
  return JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
}

function partitionRows(rows) {
  const importable = rows.filter((r) => r.price !== null && r.price !== undefined);
  const skippedNoPrice = rows.filter((r) => r.price === null || r.price === undefined);
  return { importable, skippedNoPrice };
}

function printSummary(rows) {
  const { importable, skippedNoPrice } = partitionRows(rows);

  const byDistrict = {};
  for (const r of importable) {
    const key = r.district ?? "غير مصنف";
    byDistrict[key] = (byDistrict[key] ?? 0) + 1;
  }
  console.log(`\nإجمالي صفوف الملف: ${rows.length}`);
  console.log(`قابل للاستيراد (بسعر): ${importable.length}`);
  console.log(`مُستبعَد (بلا price): ${skippedNoPrice.length}`);
  if (skippedNoPrice.length > 0) {
    console.log("عيّنة من الصفوف المُستبعَدة (أول 10):");
    for (const r of skippedNoPrice.slice(0, 10)) {
      console.log(`  - [${r.source}] ${r.unique_key ?? r.sku ?? "(بلا معرّف)"}: ${r.title_ar}`);
    }
  }

  console.log("\nالتوزيع حسب الحي (من الصفوف القابلة للاستيراد فقط):");
  for (const [d, c] of Object.entries(byDistrict).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${d}: ${c}`);
  }

  const noKey = importable.filter((r) => !r.unique_key).length;
  const noUnit = importable.filter((r) => !r.unit).length;
  if (noKey > 0) {
    console.log(`\n⚠️ ${noKey} صف بلا unique_key — لن يُمنَع تكرارها عند إعادة تشغيل السكربت (راجع رأس الملف).`);
  }
  if (noUnit > 0) {
    console.log(`⚠️ ${noUnit} صف بلا unit — سيُستخدَم 'piece' افتراضياً.`);
  }
}

async function buildLookupMaps(supabase) {
  const { data: districts, error: e1 } = await supabase.from("catalog_districts").select("id, slug");
  if (e1) throw new Error(`فشل تحميل catalog_districts: ${e1.message}`);
  const { data: categories, error: e2 } = await supabase
    .from("catalog_categories")
    .select("id, slug, district_id");
  if (e2) throw new Error(`فشل تحميل catalog_categories: ${e2.message}`);
  const { data: subcategories, error: e3 } = await supabase
    .from("catalog_subcategories")
    .select("id, slug, category_id");
  if (e3) throw new Error(`فشل تحميل catalog_subcategories: ${e3.message}`);

  const districtBySlug = new Map(districts.map((d) => [d.slug, d.id]));
  const categoryByKey = new Map(categories.map((c) => [`${c.district_id}::${c.slug}`, c.id]));
  const subcategoryByKey = new Map(subcategories.map((s) => [`${s.category_id}::${s.slug}`, s.id]));
  return { districtBySlug, categoryByKey, subcategoryByKey };
}

const SUBCATEGORY_SLUG_MAP = {
  "طازج": "tazj",
  "مجمد": "mjmd",
};

async function main() {
  assertEnv();
  const rows = loadRows();
  printSummary(rows);

  if (DRY_RUN) {
    console.log("\n✅ dry-run بس — لم يتم أي كتابة على قاعدة البيانات.");
    return;
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (RESET) {
    console.log(`\n🗑️  --reset: بحذف كل الصفوف الحالية من ${TABLE} ...`);
    const { error } = await supabase.from(TABLE).delete().neq("id", "___never___");
    if (error) { console.error("❌ فشل الحذف:", error.message); process.exit(1); }
    console.log("✅ الجدول فاضي دلوقتي.");
  }

  console.log("\nبتحميل قاموس الأحياء/الأقسام/الأقسام الفرعية من القاعدة...");
  const { districtBySlug, categoryByKey, subcategoryByKey } = await buildLookupMaps(supabase);

  const { importable, skippedNoPrice } = partitionRows(rows);
  if (skippedNoPrice.length > 0) {
    console.log(`\n⚠️ ${skippedNoPrice.length} صف بلا price تم استبعاده من الاستيراد (راجع الملخص أعلاه).`);
  }

  const payload = importable.map((r) => {
    const district_id = r.district_slug ? districtBySlug.get(r.district_slug) ?? null : null;
    const catalog_category_id =
      district_id && r.category_slug
        ? categoryByKey.get(`${district_id}::${r.category_slug}`) ?? null
        : null;
    const subSlug = r.subcategory ? SUBCATEGORY_SLUG_MAP[r.subcategory] : null;
    const catalog_subcategory_id =
      catalog_category_id && subSlug ? subcategoryByKey.get(`${catalog_category_id}::${subSlug}`) ?? null : null;
    return {
      source: r.source,
      unique_key: r.unique_key ?? null,
      sku: r.sku ?? null,
      barcode: r.barcode ?? null,
      alternative_skus: r.alternative_skus ?? [],
      name: r.title_ar,
      title_en: r.title_en ?? null,
      district_id,
      catalog_category_id,
      catalog_subcategory_id,
      base_price: r.price,
      currency: r.currency ?? "EGP",
      unit: r.unit ?? "piece",
      image_url: r.primary_image ?? null,
      gallery_images: r.gallery_images ?? [],
      description: r.description ?? null,
      specs: r.specs ?? {},
      usa_id: r.usa_id ?? null,
    };
  });

  let done = 0;
  for (let i = 0; i < payload.length; i += BATCH_SIZE) {
    const batch = payload.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from(TABLE)
      .upsert(batch, { onConflict: "unique_key", ignoreDuplicates: false });
    if (error) {
      console.error(`❌ فشل الدفعة ${i}-${i + batch.length}:`, error.message);
      console.error("   أول صف في الدفعة:", JSON.stringify(batch[0]));
      process.exit(1);
    }
    done += batch.length;
    console.log(`  ✓ ${done}/${payload.length}`);
  }

  console.log(`\n✅ تم استيراد/تحديث ${done} منتج في ${TABLE}.`);
  console.log("منتجات بلا district_id (غير مصنّفة حالياً):",
    payload.filter((p) => p.district_id === null).length);
  console.log(`منتجات مُستبعَدة كلياً (بلا price): ${skippedNoPrice.length}`);
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });