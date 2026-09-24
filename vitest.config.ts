import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // اختبارات التكامل تضرب Supabase حياً (شبكة حقيقية، لا Mock) — المهلة الافتراضية 5 ثوانٍ
    // ضيقة جداً تحت تزامن ملفات اختبار متعددة (راجع src/core/modules/orders/orders.integration.test.ts)
    testTimeout: 15000,
    // P0-GUEST-CART-CHECKOUT-REGRESSION — بلا هذا، pool forks الافتراضي يفتح عامل fork واحد لكل
    // نواة منطقية (16 هنا) لتشغيل test:unit كاملة (.husky/pre-commit) — يفشل حياً بـ"JavaScript
    // heap out of memory"/"spawn ENOMEM" على أي جهاز بذاكرة حرة محدودة وقت التشغيل (تحقُّق حي: فشل
    // pre-commit مرتين متتاليتين بلا حد، نجح 42/42 فوراً بـ--maxWorkers=3 يدوياً). تحديد أعلى مبرَّر
    // لا رقم عشوائي — لا يغيّر أي نتيجة اختبار، فقط درجة التوازي.
    maxWorkers: 3,
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      'server-only': path.resolve(dirname, './vitest.server-only-stub.ts'),
    },
  },
});
