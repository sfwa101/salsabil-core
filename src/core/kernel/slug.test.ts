import { describe, it, expect } from 'vitest';
import { slugify, makeUniqueSlug } from './slug';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('slugify', () => {
  it('produces ascii-only, SLUG_PATTERN-compliant output for Arabic text', () => {
    const result = slugify('الجناين');
    expect(result).toMatch(SLUG_PATTERN);
  });

  it('is deterministic — same input always produces the same slug', () => {
    expect(slugify('خضراوات وفواكه')).toBe(slugify('خضراوات وفواكه'));
  });

  it('joins multiple words with a single hyphen, never double hyphens', () => {
    const result = slugify('حي   الرجل');
    expect(result).not.toContain('--');
    expect(result).toMatch(SLUG_PATTERN);
  });

  it('passes through ascii words verbatim (lowercased)', () => {
    expect(slugify('Power Bank')).toBe('power-bank');
  });

  it('handles mixed Arabic/English text', () => {
    const result = slugify('فيتامين D');
    expect(result).toMatch(SLUG_PATTERN);
    expect(result.endsWith('-d')).toBe(true);
  });

  it('drops diacritics without producing gaps', () => {
    const result = slugify('مُشَكَّل');
    expect(result).toMatch(SLUG_PATTERN);
  });
});

describe('makeUniqueSlug', () => {
  it('returns the base slug unchanged when there is no collision', () => {
    expect(makeUniqueSlug('alban', new Set(['other']))).toBe('alban');
  });

  it('appends -2 on first collision', () => {
    expect(makeUniqueSlug('alban', new Set(['alban']))).toBe('alban-2');
  });

  it('finds the next free suffix across multiple collisions', () => {
    expect(makeUniqueSlug('alban', new Set(['alban', 'alban-2', 'alban-3']))).toBe('alban-4');
  });
});
