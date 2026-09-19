// @vitest-environment jsdom
// src/lib/personal-theme.test.ts
// FIX-STAGING-HOMEPAGE-FAKE-PRODUCTS-DARKMODE (القسم 2) — regression test لعطل applyPersonalThemeToDocument
// الموثَّق في docs/audits/2026-09-19-staging-homepage-fake-products-darkmode-report.md §2.2: اختيار
// "داكن" بلا ثيم مسمّى مسبقاً (theme=null، الحالة الافتراضية لكل زائر جديد) كان يحذف
// data-personal-theme/data-personal-mode كليهما بدل تطبيق الوضع الداكن — القاعدة المركَّبة في
// globals.css تتطلب السمتين معاً، فحذفهما يُسقطها بالكامل ويُبقي ألوان [data-world] الفاتحة الافتراضية.

import { describe, it, expect, afterEach } from 'vitest';
import { applyPersonalThemeToDocument, DEFAULT_PERSONAL_THEME_FOR_DARK } from './personal-theme';

describe('applyPersonalThemeToDocument', () => {
  afterEach(() => {
    delete document.documentElement.dataset.personalTheme;
    delete document.documentElement.dataset.personalMode;
  });

  it('يطبّق ثيماً افتراضياً مع الوضع الداكن عند theme=null (بدل حذف السمتين)', () => {
    applyPersonalThemeToDocument(null, 'dark');
    expect(document.documentElement.dataset.personalTheme).toBe(DEFAULT_PERSONAL_THEME_FOR_DARK);
    expect(document.documentElement.dataset.personalMode).toBe('dark');
  });

  it('يبقي السلوك القديم (حذف السمتين) مع theme=null والوضع الفاتح', () => {
    applyPersonalThemeToDocument(null, 'light');
    expect(document.documentElement.dataset.personalTheme).toBeUndefined();
    expect(document.documentElement.dataset.personalMode).toBeUndefined();
  });

  it('يحترم ثيماً مسمّى صراحة، بصرف النظر عن الوضع', () => {
    applyPersonalThemeToDocument('masculine', 'dark');
    expect(document.documentElement.dataset.personalTheme).toBe('masculine');
    expect(document.documentElement.dataset.personalMode).toBe('dark');
  });
});
