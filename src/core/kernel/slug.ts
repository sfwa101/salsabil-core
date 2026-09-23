// src/core/kernel/slug.ts
// FOUNDER-TAXONOMY-FOUNDATION (2026-09-23) — تحويل اسم عربي إلى slug إنجليزي متوافق مع SLUG_PATTERN
// المستخدَم أصلاً في admin/taxonomy/actions.ts وmerchant.service.ts (/^[a-z0-9]+(-[a-z0-9]+)*$/).
// لا مكتبة slugify خارجية — بحث في src/ لم يجد أي دالة تحويل عربي→slug موجودة (Capability Before
// Creation، AGENTS.md §2)، والحاجة هنا محددة: نص عربي حصراً (لا نطاق دولي عام يستدعي مكتبة كاملة).

// جدول تحويل حرف عربي واحد → مقطع لاتيني. ترتيب حروف الجدول لا يعني شيئاً؛ التطبيق يمر حرفاً بحرف.
const ARABIC_TRANSLITERATION: Record<string, string> = {
  ا: 'a', أ: 'a', إ: 'a', آ: 'a', ب: 'b', ت: 't', ث: 'th', ج: 'j', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'th', ر: 'r', ز: 'z', س: 's', ش: 'sh', ص: 's', ض: 'd', ط: 't', ظ: 'z',
  ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ك: 'k', ل: 'l', م: 'm', ن: 'n', ه: 'h', و: 'w',
  ي: 'y', ى: 'a', ة: 'a', ء: '', ئ: 'y', ؤ: 'w',
};

// تشكيل/تطويل يُحذَف بلا نص بديل (لا يحمل معنى صوتي مستقل هنا).
const DIACRITICS_PATTERN = /[ً-ْـ]/g;

function transliterateArabicWord(word: string): string {
  let out = '';
  for (const ch of word) {
    const mapped = ARABIC_TRANSLITERATION[ch];
    if (mapped !== undefined) {
      out += mapped;
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      out += ch.toLowerCase();
    }
    // أي حرف آخر (رموز، لغات أخرى غير مغطاة) يُحذَف بصمت — نفس معاملة الفراغات بين الكلمات.
  }
  return out;
}

// يحوِّل أي نص عربي/إنجليزي مختلط إلى slug مطابق لـSLUG_PATTERN — حروف/أرقام إنجليزية صغيرة وشرطات
// فقط، بلا شرطات مزدوجة أو في البداية/النهاية. مُحدَّد المخرجات (نفس النص يُعطي دائماً نفس الـslug).
export function slugify(text: string): string {
  const withoutDiacritics = text.replace(DIACRITICS_PATTERN, '');
  const words = withoutDiacritics
    .split(/\s+/)
    .map(transliterateArabicWord)
    .filter((w) => w.length > 0);
  return words.join('-');
}

// عند تعارض slug مع صف موجود فعلياً (ضمن نفس النطاق: نفس الأب لفئة/قسم فرعي، أو عالمياً للأحياء) —
// يُضاف رقم تسلسلي بدل رفض الاستيراد بالكامل أو الكتابة فوق صف قائم. `existingSlugs` يُمرَّر صريحاً
// من المستدعي (لا استعلام قاعدة بيانات ضمن هذه الدالة — نقاء الدالة يسهّل اختبارها).
export function makeUniqueSlug(baseSlug: string, existingSlugs: ReadonlySet<string>): string {
  if (!existingSlugs.has(baseSlug)) return baseSlug;
  let attempt = 2;
  let candidate = `${baseSlug}-${attempt}`;
  while (existingSlugs.has(candidate)) {
    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }
  return candidate;
}
