// src/core/modules/catalog/text-normalize.ts
// تطبيع اسم منتج للمطابقة بين استيراد تاجر والكتالوج الأساسي — راجع docs/DECISIONS.md → ADR-025.
// قرار مؤسس صريح: تطابق حرفي (exact) بعد هذا التطبيع فقط — لا مطابقة تقريبية (fuzzy)/عتبة تشابه.
// أي اسمين لا يتطابقان حرفياً بعد التطبيع يُعامَلان كمنتجين مختلفين (يذهب أحدهما لقائمة المراجعة)،
// حتى لو بدا التشابه واضحاً للعين — تفادياً لدمج مالي/مخزوني خاطئ صامت (AGENTS.md §8 Fail Closed).

const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

// كلمات وحدة شائعة تتكرر بصيغ مختلفة في كتالوجات التجار — تُوحَّد لصيغة واحدة قبل المقارنة.
// مطابقة رمزية كاملة (token) فقط، لا استبدال جزء من كلمة أخرى.
const UNIT_TOKEN_ALIASES: Record<string, string> = {
  'كجم': 'كيلو',
  'كغم': 'كيلو',
  'كيلوجرام': 'كيلو',
  'جم': 'جرام',
  'جرامات': 'جرام',
  'لترات': 'لتر',
  'قطع': 'قطعة',
};

export function normalizeProductName(raw: string): string {
  const collapsed = raw
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_INDIC_DIGITS.indexOf(digit)))
    .replace(/[ً-ٰٟـ]/g, '') // تشكيل عربي + حرف التطويل (ـ)
    .replace(/\s+/g, ' ')
    .toLowerCase();

  return collapsed
    .split(' ')
    .map((token) => UNIT_TOKEN_ALIASES[token] ?? token)
    .join(' ')
    .trim();
}
