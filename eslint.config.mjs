// @ts-check
import tsParser from '@typescript-eslint/parser';
import noLiteralTailwindColors from './eslint-rules/no-literal-tailwind-colors.js';

// قاعدة نظام تصميم مخصَّصة (لا يوجد بديل جاهز مناسب لـ Tailwind v4 + توكنز --sb-* الدلالية هنا —
// eslint-plugin-tailwindcss لا يدعم Tailwind v4 رسمياً وقت الكتابة). راجع
// eslint-rules/no-literal-tailwind-colors.js للتفاصيل الكاملة.
const designSystemPlugin = {
  rules: {
    'no-literal-tailwind-colors': noLiteralTailwindColors,
  },
};

export default [
  {
    ignores: ['node_modules/**', '.next/**', '.vercel/**', 'public/**'],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['src/app/**/*.tsx', 'src/components/**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'design-system': designSystemPlugin,
    },
    rules: {
      'design-system/no-literal-tailwind-colors': 'error',
    },
  },
];
