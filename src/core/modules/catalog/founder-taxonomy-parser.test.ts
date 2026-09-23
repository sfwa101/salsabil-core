import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFounderTaxonomy, FounderTaxonomyParseError } from './founder-taxonomy-parser';

const FOUNDER_FILE_PATH = join(process.cwd(), 'docs/input/FOUNDER_APPROVED_TAXONOMY.md');
const raw = readFileSync(FOUNDER_FILE_PATH, 'utf-8');

describe('parseFounderTaxonomy — against the real founder-approved file', () => {
  const districts = parseFounderTaxonomy(raw);

  it('parses exactly 27 top-level worlds', () => {
    expect(districts).toHaveLength(27);
  });

  it('preserves file order via sequential sortOrder 1..27', () => {
    expect(districts.map((d) => d.sortOrder)).toEqual(Array.from({ length: 27 }, (_, i) => i + 1));
  });

  it('preserves exact display names and order for world 1 (الجناين)', () => {
    const world1 = districts[0];
    expect(world1.nameAr).toBe('الجناين');
    expect(world1.tagline).toBe('خضراوات وفواكه');
    expect(world1.categories.map((c) => c.nameAr)).toEqual(['الخضراوات', 'الفواكه', 'المجمد', 'الأعشاب والطازج']);
    expect(world1.categories[0].subcategories.map((s) => s.nameAr)).toEqual([
      'خضراوات يومية',
      'ورقيات وخضرة',
      'جذور ودرنيات',
      'خضراوات موسمية',
      'خضراوات جاهزة',
    ]);
    expect(world1.note).toContain('لا تضع أسماء أصناف مثل طماطم/تفاح هنا');
  });

  it('captures the hybrid/collection note for خير البلد (world 8)', () => {
    const khairElBalad = districts.find((d) => d.nameAr === 'خير البلد');
    expect(khairElBalad).toBeDefined();
    expect(khairElBalad!.note).toContain('Hybrid/Collection');
  });

  it('captures the collection note for السلال (world 25) and no-tag note for الميزان (world 26)', () => {
    const salal = districts.find((d) => d.nameAr === 'السلال');
    const mizan = districts.find((d) => d.nameAr === 'الميزان');
    expect(salal!.note).toContain('لا يملك نسخًا من المنتجات');
    expect(mizan!.note).toContain('Tags/Attributes');
  });

  it('captures the content-not-category note for الوصفات (world 27, the last one)', () => {
    const recipes = districts[26];
    expect(recipes.nameAr).toBe('الوصفات');
    expect(recipes.note).toContain('وليست تصنيف Product');
  });

  it('does not leak trailing prose after world 27 into any category/subcategory', () => {
    const allNames = districts.flatMap((d) => [
      ...d.categories.map((c) => c.nameAr),
      ...d.categories.flatMap((c) => c.subcategories.map((s) => s.nameAr)),
    ]);
    expect(allNames).not.toContain('وهكذا يبقى شريط الأقسام نظيفًا جدًا:');
    expect(allNames.some((n) => n.includes('القاعدة الذهبية'))).toBe(false);
  });

  it('preserves literal non-Arabic subcategory names verbatim (B/C/D, Power Bank)', () => {
    const wellness = districts.find((d) => d.nameAr === 'العافية')!;
    const vitamins = wellness.categories.find((c) => c.nameAr === 'الفيتامينات والمعادن')!;
    expect(vitamins.subcategories.map((s) => s.nameAr)).toContain('B');
    expect(vitamins.subcategories.map((s) => s.nameAr)).toContain('D');

    const connectivity = districts.find((d) => d.nameAr === 'وصلة')!;
    const power = connectivity.categories.find((c) => c.nameAr === 'الطاقة')!;
    expect(power.subcategories.map((s) => s.nameAr)).toContain('Power Bank');
  });

  it('gives every subcategory a deterministic 1-based sortOrder within its category', () => {
    for (const district of districts) {
      for (const category of district.categories) {
        expect(category.subcategories.map((s) => s.sortOrder)).toEqual(
          Array.from({ length: category.subcategories.length }, (_, i) => i + 1)
        );
      }
    }
  });
});

describe('parseFounderTaxonomy — malformed input handling', () => {
  it('throws when a world is missing entirely (fewer than 27)', () => {
    expect(() => parseFounderTaxonomy('1. حي واحد\nوصف\n\nقسم\n\nفرعي')).toThrow(FounderTaxonomyParseError);
  });

  it('throws on non-sequential world numbering', () => {
    const bad = '1. الأول\nوصف\n\nقسم\n\nفرعي\n\n3. الثالث\nوصف\n\nقسم\n\nفرعي';
    expect(() => parseFounderTaxonomy(bad)).toThrow(FounderTaxonomyParseError);
  });

  it('throws when a category block has more than one line', () => {
    const bad = '1. الأول\nوصف\n\nقسم أول\nقسم ثانٍ بالغلط\n\nفرعي';
    expect(() => parseFounderTaxonomy(bad)).toThrow(FounderTaxonomyParseError);
  });

  it('throws when a category has no following subcategory block', () => {
    const bad = '1. الأول\nوصف\n\nقسم بلا أقسام فرعية\n\n2. الثاني\nوصف\n\nقسم\n\nفرعي';
    expect(() => parseFounderTaxonomy(bad)).toThrow(FounderTaxonomyParseError);
  });
});
