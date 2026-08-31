# البنية المعمارية — مرجع سريع

Core + Domains (Modular Monolith + Event-Driven)
راجع القسم الكامل: SALSABIL_CONSTITUTION.md §5

هيكل المجلدات المعتمد:
src/
├── app/              → صفحات Next.js
├── components/       → مكونات واجهة قابلة لإعادة الاستخدام
├── core/
│   ├── kernel/        → المحركات التسعة (خليل، تيسير، حكيم، إلخ) §6
│   ├── modules/       → النطاقات (Orders, Catalog, Inventory) §8
│   ├── offline/       → دعم العمل بلا إنترنت (لاحقاً)
│   └── telemetry/     → سجل الأحداث والتدقيق §6, §26
└── types/             → أنواع TypeScript المشتركة

قاعدة ثابتة: كل نطاق في src/core/modules/[domain]/ يحتوي:
  - schema.ts   (الأنواع والبيانات)
  - service.ts  (منطق الأعمال)
  - repository.ts (الاتصال بقاعدة البيانات)