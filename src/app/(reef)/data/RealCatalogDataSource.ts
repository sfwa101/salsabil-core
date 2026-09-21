// src/app/(reef)/data/RealCatalogDataSource.ts
// REAL-BACKEND-SDUI-INTEGRATION-POC (2026-09-21) — نظير حقيقي لـReefMockDataSource.ts (نفس المجلد،
// نفس الواجهة DataSource) لكن يقرأ من الكتالوج الحقيقي عبر catalogService بدل بيانات وهمية ثابتة.
// راجع docs/audits/2026-09-21-real-backend-sdui-integration-poc.md للسياق الكامل.
//
// ⚠️ حدود متعمَّدة (لا تُوسَّع بلا قرار مؤسس):
// - يستهلك catalogService (طبقة الخدمة) لا catalogRepository مباشرة — نفس اتجاه الاعتماد المفروض
//   آلياً في .dependency-cruiser.cjs (no-ui-importing-repository) وdocs/ARCHITECTURE.md §3.
// - catalogService.listPurchasableProducts يستورد داخلياً catalog.repository.ts، الذي يستخدم
//   supabaseAdmin (service_role، محمي بحزمة `server-only`) لبعض دوال الإدارة الأخرى في نفس الملف —
//   هذا يعني أن استيراد هذا الملف من أي كود عميل ('use client') سيكسر البناء (خرق حزمة server-only).
//   لهذا يُستهلَك هذا الـDataSource حصراً من مكوّن خادم (Server Component)، لا من useEffect في صفحة
//   عميل كما فعلت ReefMockDataSource/test-ui — راجع src/app/test-integration/page.tsx.
// - لا يعرف عن سعر السلة/الخصومات — يعيد Product الخام فقط (basePrice، لا سعراً نهائياً محسوباً
//   بخيارات). التسعير النهائي عند الإضافة الفعلية للسلة يمر دائماً عبر CatalogService.calculatePrice
//   من داخل addToCartAction/cartService، لا من هنا.

import { DataSource } from '@/sdui/data/DataSource';
import { catalogService } from '@/core/modules/catalog/catalog.service';

export class RealCatalogDataSource implements DataSource {
  id = 'real-catalog-ds';

  async resolve(queryId: string, params: unknown): Promise<unknown> {
    switch (queryId) {
      case 'query.real_products': {
        const p = params as { limit?: number };
        return catalogService.listPurchasableProducts(p.limit ?? 10);
      }
      default:
        throw new Error(`[RealCatalogDataSource] Unsupported query: ${queryId}`);
    }
  }
}
