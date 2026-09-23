// src/core/modules/catalog/founder-taxonomy-parser.ts
// FOUNDER-TAXONOMY-FOUNDATION (2026-09-23) — يحلّل docs/input/FOUNDER_APPROVED_TAXONOMY.md (المصدر
// المرجعي الوحيد للتصنيف المُعتمَد من المؤسس، راجع AGENTS §"لا استنتاج معماري مفقود") إلى بنية بيانات
// حي → قسم رئيسي → قسم فرعي. لا يكتب لقاعدة البيانات — هذا فقط التحليل النصي، منفصل عن سكربت الاستيراد
// (scripts/2026-09-23-import-founder-taxonomy.ts) الذي يستهلك مخرجاته.
//
// شكل الملف (ثابت عبر الـ27 عالماً كلها، تحقَّقتُ منه سطراً بسطر قبل كتابة هذا الملف):
//   "N. اسم الحي"        ← يبدأ عالماً جديداً (كتلة من سطرين مع السطر التالي)
//   "الوصف الفرعي"        ← سطر تعريفي واحد تحت كل حي (tagline)
//   <سطر فاضٍ>
//   "اسم قسم رئيسي"       ← كتلة سطر واحد
//   <سطر فاضٍ>
//   "قسم فرعي 1"          ← كتلة أسطر متعددة (قائمة الأقسام الفرعية لنفس القسم الرئيسي أعلاه)
//   "قسم فرعي 2"
//   <سطر فاضٍ>
//   ... (تتكرر أقسام رئيسية/فرعية) ...
//   "ملاحظة: ..."         ← كتلة اختيارية، ملاحظة خاصة بالحي الحالي، ليست قسماً
// يتوقف التحليل بعد إغلاق العالم رقم 27 تماماً — أي نص تالٍ (شرح عام، القاعدة الذهبية) متعمَّد تجاهله.

export interface FounderSubcategoryInput {
  nameAr: string;
  sortOrder: number;
}

export interface FounderCategoryInput {
  nameAr: string;
  sortOrder: number;
  subcategories: FounderSubcategoryInput[];
}

export interface FounderDistrictInput {
  nameAr: string;
  tagline: string | null;
  sortOrder: number;
  note: string | null;
  categories: FounderCategoryInput[];
}

export class FounderTaxonomyParseError extends Error {}

const WORLD_HEADER_PATTERN = /^(\d+)\.\s*(.+)$/;
const NOTE_PATTERN = /^ملاحظة/;
const EXPECTED_WORLD_COUNT = 27;

// كتلة = مجموعة أسطر متتالية غير فاضية، مفصولة بسطر فاضٍ واحد أو أكثر عن الكتلة التالية.
function splitIntoBlocks(raw: string): string[][] {
  const lines = raw.split('\n').map((l) => l.trim());
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (line === '') {
      if (current.length > 0) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current);
  return blocks;
}

// تحقَّقتُ يدوياً من أن السطر الفاضل بين الحي 2 (اللبّانة) والحي 3 (الزاد) ناقص في الملف المصدر
// (سطرا "سمن نباتي" و"3. الزاد" متجاوران بلا سطر فاضٍ) — عطل تنسيق حقيقي في الملف، لا افتراض من
// جهتي. رأس حي ("N. الاسم") لا يمكن أن يكون اسم قسم فرعي مشروعاً أبداً (الأرقام المتسلسلة وحدها كافية
// للتمييز)، فتقسيم أي كتلة عند ظهور رأس حي في وسطها إجراء حتمي، لا تخمين — لا يُصلَح الملف نفسه، فقط
// يُعوَّض عن غياب السطر الفاضل أثناء التحليل.
function splitBlocksAtEmbeddedWorldHeaders(blocks: string[][]): string[][] {
  const result: string[][] = [];
  for (const block of blocks) {
    let start = 0;
    for (let idx = 1; idx < block.length; idx += 1) {
      if (WORLD_HEADER_PATTERN.test(block[idx])) {
        result.push(block.slice(start, idx));
        start = idx;
      }
    }
    result.push(block.slice(start));
  }
  return result;
}

export function parseFounderTaxonomy(raw: string): FounderDistrictInput[] {
  const blocks = splitBlocksAtEmbeddedWorldHeaders(splitIntoBlocks(raw));
  const districts: FounderDistrictInput[] = [];

  let i = 0;
  while (districts.length < EXPECTED_WORLD_COUNT) {
    if (i >= blocks.length) {
      throw new FounderTaxonomyParseError(
        `توقَّف الملف بعد ${districts.length} عالماً فقط — متوقَّع ${EXPECTED_WORLD_COUNT} بالضبط.`
      );
    }
    const header = blocks[i];
    const match = WORLD_HEADER_PATTERN.exec(header[0]);
    if (!match) {
      throw new FounderTaxonomyParseError(
        `كتلة غير متوقَّعة عند الفهرس ${i} — توقَّعت رأس عالم جديد ("N. الاسم")، وجدت: "${header[0]}"`
      );
    }
    const worldNumber = Number(match[1]);
    const expectedNumber = districts.length + 1;
    if (worldNumber !== expectedNumber) {
      throw new FounderTaxonomyParseError(
        `ترقيم عالم غير متسلسل — متوقَّع ${expectedNumber}، وجدت ${worldNumber} ("${header[0]}")`
      );
    }
    const nameAr = match[2].trim();
    const tagline = header.length > 1 ? header.slice(1).join(' ').trim() : null;
    i += 1;

    const categories: FounderCategoryInput[] = [];
    let note: string | null = null;

    while (i < blocks.length) {
      const block = blocks[i];
      if (WORLD_HEADER_PATTERN.test(block[0])) {
        break;
      }
      if (NOTE_PATTERN.test(block[0])) {
        // ملاحظة الحي هي آخر كتلة فيه دائماً في هذا الملف (تحقَّقتُ من كل الـ27 عالماً قبل كتابة هذا
        // المحلِّل) — تُغلِق الحي الحالي فوراً بدل الاستمرار في قراءة الكتل التالية كأقسام. هذا بالذات
        // ما يمنع تسرّب النص العام بعد نهاية الحي 27 (شرح "الرحلة الذهبية"، ليس جزءاً من التصنيف).
        note = block.join(' ').trim();
        i += 1;
        break;
      }
      // كتلة قسم رئيسي: سطر واحد بالضبط.
      if (block.length !== 1) {
        throw new FounderTaxonomyParseError(
          `كتلة قسم رئيسي متوقَّعة بسطر واحد لحي "${nameAr}"، وجدت ${block.length} سطراً: ${JSON.stringify(block)}`
        );
      }
      const categoryName = block[0];
      i += 1;
      if (i >= blocks.length || WORLD_HEADER_PATTERN.test(blocks[i][0]) || NOTE_PATTERN.test(blocks[i][0])) {
        throw new FounderTaxonomyParseError(
          `القسم الرئيسي "${categoryName}" (حي "${nameAr}") بلا كتلة أقسام فرعية تالية له.`
        );
      }
      const subcatBlock = blocks[i];
      i += 1;
      const subcategories: FounderSubcategoryInput[] = subcatBlock.map((subName, idx) => ({
        nameAr: subName,
        sortOrder: idx + 1,
      }));
      categories.push({ nameAr: categoryName, sortOrder: categories.length + 1, subcategories });
    }

    districts.push({ nameAr, tagline, sortOrder: districts.length + 1, note, categories });
  }

  return districts;
}
