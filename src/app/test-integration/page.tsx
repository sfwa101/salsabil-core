// src/app/test-integration/page.tsx
// REAL-BACKEND-SDUI-INTEGRATION-POC (2026-09-21) — صفحة اختبار معزولة تُثبت مسار عمودي واحد كامل:
// الكتالوج الحقيقي → RealCatalogDataSource → DataResolver → PageSchema → PageEngine → StemProductCard
// → UIAction.ADD_TO_CART → ApplicationRuntime → Server Action السلة الحقيقية → قاعدة البيانات.
// راجع docs/audits/2026-09-21-real-backend-sdui-integration-poc.md للتفصيل الكامل والتحقق.
//
// ⚠️ قرار معماري مُتَّخَذ أثناء هذا الـPOC (موثَّق في تقرير التدقيق §J، ليس تعديلاً على DataResolver/
// PageEngine نفسيهما): الحل الحقيقي (catalogService) يستورد داخلياً supabase-admin-client.ts (محمي
// بحزمة `server-only`) عبر catalog.repository.ts — استيراده من أي كود 'use client' يكسر البناء.
// لذلك يُنفَّذ resolvePage() هنا في Server Component (خادم فقط)، لا في useEffect داخل صفحة عميل كما
// فعل test-ui/page.tsx مع بياناته الوهمية — نفس DataResolver/DataSource بلا أي تعديل عليهما، فقط
// موضع استدعاء مختلف يحترم حدود server-only الفعلية للمشروع.

import { notFound } from 'next/navigation';
import { QueryRegistry } from '@/sdui/data/QueryRegistry';
import { DataResolver } from '@/sdui/data/DataResolver';
import { RealCatalogDataSource } from '@/app/(reef)/data/RealCatalogDataSource';
import { getCartSummaryIfExistsAction } from '@/app/(reef)/cart/actions';
import type { SDUIPage } from '@/sdui/schema/page.schema';
import { TestIntegrationClient } from './TestIntegrationClient';
import { z } from 'zod';

const testIntegrationPageSchema: SDUIPage = {
  id: 'test_integration_page',
  sections: [
    {
      id: 'section_real_shelf',
      type: 'product_shelf',
      props: {
        title: 'منتجات حقيقية من الكتالوج (POC)',
        items: { $bind: 'query.real_products', params: { limit: 8 } },
      },
      visibility: { enabled: true },
    },
  ],
};

export default async function TestIntegrationPage() {
  // P0 SECURITY GUARD (2026-09-22): هذا المسار يكتب فعلياً على cart_items الحقيقية عبر Server
  // Actions السلة القائمة — راجع docs/audits/2026-09-21-real-backend-sdui-integration-poc.md §F
  // وFinding 2 في docs/audits/2026-09-22-post-antigravity-integration-forensic-audit.md §19.
  // `next build` يضبط NODE_ENV='production' لكل بيئة مبنية/منشورة (Vercel production وpreview/
  // staging معاً، لا الإنتاج فقط) — فهذا الحارس يمنع الوصول في أي بيئة مبنية، ويُبقيه متاحاً فقط
  // تحت `next dev` المحلي للتحقق الهندسي المُتحكَّم به. حارس خادم بحت (Server Component، يُنفَّذ
  // قبل أي قراءة/كتابة) — لا يعتمد على إخفاء رابط تنقّل ولا على أي فحص من جهة العميل.
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const registry = new QueryRegistry();
  registry.register({
    id: 'query.real_products',
    paramSchema: z.object({ limit: z.number().optional() }),
    resultSchema: z.array(z.unknown()),
  });

  const resolver = new DataResolver(registry);
  resolver.registerSource(new RealCatalogDataSource());

  const resolvedPage = await resolver.resolvePage(testIntegrationPageSchema);

  // قراءة فقط، بلا إنشاء كوكي (getCartSummaryIfExistsAction، آمنة أثناء عرض RSC — نفس نمط صفحة
  // الحي [category]/page.tsx) — تُظهر الكمية الحقيقية الحالية إن كان الزائر أضاف منتجاً بالفعل من
  // قبل في نفس الجلسة، بدل افتراض صفر دائماً.
  const existingSummary = await getCartSummaryIfExistsAction();
  const initialQuantities: Record<string, number> = {};
  if (existingSummary) {
    for (const line of existingSummary.lines) {
      initialQuantities[line.product.id] = line.item.quantity;
    }
  }

  return <TestIntegrationClient resolvedPage={resolvedPage} initialQuantities={initialQuantities} />;
}
