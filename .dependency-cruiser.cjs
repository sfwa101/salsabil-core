// .dependency-cruiser.cjs
// فاحص الحدود المعمارية — يفرض آلياً القواعد الموثَّقة في docs/ARCHITECTURE.md §3 (اتجاه الاعتماد)
// وADR-009 (khalil.repository.ts نقطة وصول داخلية فقط). يعمل عبر `npm run arch:check`،
// مربوط بخطاف pre-commit (راجع .husky/pre-commit).
//
// القاعدة العامة غير المفروضة هنا عمداً (قيد معروف، لا تجاهل صامت): لا يمنع هذا الفاحص
// service.ts في نطاق ما من استيراد repository.ts نطاق آخر مباشرة (تجاوز طبقة خدمته) — يتطلب
// مطابقة عبر مجلدات متناظرة (from/to) لا تدعمها dependency-cruiser بمطابقة regex بسيطة بلا
// enumerar صريح لكل نطاق. الحماية الفعلية القائمة: لا repository.ts يستطيع لمس جداول نطاق آخر
// إطلاقاً (القاعدة الأولى أدناه) — وهي الحدّ الفاصل الحقيقي بين الشرائح الرأسية.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-repository-cross-import',
      comment:
        'كل نطاق يملك جداوله حصرياً (Vertical Slice) — لا repository.ts يستورد repository.ts آخر. ' +
        'التواصل بين نطاقات مختلفة يمر عبر service.ts فقط. راجع docs/ARCHITECTURE.md §7.',
      severity: 'error',
      from: { path: '\\.repository\\.ts$' },
      to: { path: '\\.repository\\.ts$' },
    },
    {
      name: 'no-repository-importing-service',
      comment:
        'اتجاه الاعتماد الموثَّق (docs/ARCHITECTURE.md §3): component → service → repository → db-client. ' +
        'repository.ts ممنوع من استدعاء service.ts (عكس الاتجاه).',
      severity: 'error',
      from: { path: '\\.repository\\.ts$' },
      to: { path: '\\.service\\.ts$' },
    },
    {
      name: 'only-repository-touches-db-client',
      comment:
        'عملاء Supabase (supabase-client.ts بمفتاح anon، supabase-admin-client.ts بمفتاح service_role) ' +
        'يُستورَدان فقط من repository.ts الخاص بكل نطاق. اختبارات التكامل مُستثناة عمداً (تصل مباشرة ' +
        'للتنظيف الذاتي في afterAll — نمط قائم فعلياً في cart.integration.test.ts وorders.integration.test.ts).',
      severity: 'error',
      from: { pathNot: ['\\.repository\\.ts$', '\\.test\\.ts$'] },
      to: { path: 'core/kernel/database/(supabase-client|supabase-admin-client)\\.ts$' },
    },
    {
      name: 'no-direct-khalil-repository-access',
      comment:
        'khalil.repository.ts نقطة وصول داخلية فقط لمحرك خليل — أي نطاق آخر يستخدم khalilService حصراً ' +
        '(نفس نمط ADR-009: findOrCreateCustomerByPhone عبر الخدمة لا المستودع مباشرة). راجع docs/DECISIONS.md.',
      severity: 'error',
      from: { pathNot: ['core/kernel/khalil/', '\\.test\\.ts$'] },
      to: { path: 'core/kernel/khalil/khalil\\.repository\\.ts$' },
    },
    {
      name: 'no-ui-importing-repository',
      comment:
        'طبقة الواجهة (src/app/, src/components/) تتحدث فقط مع service.ts — لا وصول مباشر لطبقة ' +
        'قاعدة البيانات. راجع docs/ARCHITECTURE.md §3.',
      severity: 'error',
      from: { path: '^src/(app|components)/' },
      to: { path: '\\.repository\\.ts$' },
    },
    {
      name: 'no-circular',
      comment: 'حلقات استيراد دائرية تكسر وضوح اتجاه الاعتماد بين الوحدات.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
