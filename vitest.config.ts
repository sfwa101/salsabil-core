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
  },
  resolve: {
    alias: {
      '@': path.resolve(dirname, './src'),
      'server-only': path.resolve(dirname, './vitest.server-only-stub.ts'),
    },
  },
});
