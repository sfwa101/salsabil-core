'use client';
// src/app/test-integration/TestIntegrationClient.tsx
// REAL-BACKEND-SDUI-INTEGRATION-POC (2026-09-21) — الشطر العميل من صفحة الاختبار: يبني
// ApplicationRuntime + يسجّل قدرة ADD_TO_CART الحقيقية (تستدعي Server Actions السلة الحقيقية،
// لا منطقاً جديداً)، ويسجّل مكوّن 'product_shelf' الذي يحوّل Product الحقيقي إلى ProductCardStemProps
// (طبقة المحوِّل/Adapter المطلوبة في §7 من موجّه المهمة) قبل تمريره لـStemProductCard الحقيقي.
// راجع docs/audits/2026-09-21-real-backend-sdui-integration-poc.md للتفصيل الكامل والتحقق.
//
// حدود متعمَّدة (POC ضيق النطاق، لا حاجة مصرَّح بها لتوسيعها هنا):
// - لا يُستهلَك quantity/publisher الحقيقيان لأي تاجر — publisher.name/categoryName قيم عرض ثابتة
//   (Product الحقيقي لا يحمل اسم تاجر معروض جاهزاً؛ حلّه الفعلي يحتاج استعلام merchantService إضافياً
//   خارج نطاق هذا الـPOC الضيق — راجع تقرير التدقيق §J).
// - لا معالجة IDOR/ملكية إضافية هنا — تُعاد استخدام cartService.updateItemQuantity/removeItem
//   الحاليين بالضبط، واللذان يتحققان من ملكية itemId لـcartId داخلياً بالفعل (ADR-014).

import React, { useMemo, useState } from 'react';
import { PageEngine } from '@/sdui/engine/PageEngine';
import { ApplicationRuntime } from '@/sdui/runtime/ApplicationRuntime';
import { componentRegistry } from '@/sdui/registry/component-registry';
import { SDUIComponent } from '@/sdui/contracts/component-contracts';
import type { SDUIPage } from '@/sdui/schema/page.schema';
import { StemProductCard } from '@/components/ui/StemProductCard';
import { HorizontalShelfStem } from '@/components/ui/HorizontalShelfStem';
import { toProductCardPresentation } from '@/components/product-presentation';
import type { ProductCardStemProps } from '@/types/ui-contracts';
import type { Product } from '@/core/modules/catalog/types';
import {
  addToCartAction,
  getCartSummaryAction,
  updateCartItemAction,
  removeCartItemAction,
} from '@/app/(reef)/cart/actions';

// --- Product View Model Adapter (§7) — Product حقيقي → ProductCardStemProps الذي يحتاجه Stem ---
function mapProductToStemProps(product: Product, quantity: number): ProductCardStemProps {
  return {
    ...toProductCardPresentation(product, quantity),
    publisher: {
      role: product.tenantId ? 'merchant' : 'admin',
      name: 'سلسبيل',
      categoryName: product.unit,
    },
  };
}

// --- SDUI Component Wrapper لـ'product_shelf' — يحوّل Product[] الخام (من DataResolver) عبر
// المحوِّل أعلاه، ثم يمرّرها كـReactNode[] لـHorizontalShelfStem (نفس حدود SDUIShelf في test-ui). ---
const TestIntegrationShelf: SDUIComponent = ({ props, onAction }) => {
  const items = Array.isArray(props.items) ? (props.items as Array<Product & { quantity?: number }>) : [];
  const mapped = items.map((product) => (
    <StemProductCard key={product.id} {...mapProductToStemProps(product, product.quantity ?? 0)} onAction={onAction} />
  ));
  return <HorizontalShelfStem title={props.title as string} items={mapped} />;
};

// تسجيل غير مشروط عمداً (لا `if (!componentRegistry.has(...))` كما في test-ui) — componentRegistry
// سجل Singleton مشترك عبر التطبيق كله؛ اكتُشف أثناء هذا الـPOC أن test-portability/page.tsx لا يسجّل
// أي مكوّن خاص به إطلاقاً ويعتمد ضمنياً على تسجيل سابق من صفحة أخرى — هشاشة معمارية قائمة فعلاً في
// السجل المشترك (ليست من صنع هذا الـPOC، مُسجَّلة في تقرير التدقيق §J، لا يُصلَح هنا لأنه توسيع خارج
// النطاق). التسجيل غير المشروط هنا يضمن أن /test-integration صحيحة دائماً بصرف النظر عن ترتيب زيارة
// الصفحات التجريبية الأخرى في نفس جلسة المتصفح.
componentRegistry.register('product_shelf', TestIntegrationShelf);

interface TestIntegrationClientProps {
  resolvedPage: SDUIPage;
  initialQuantities: Record<string, number>;
}

export function TestIntegrationClient({ resolvedPage, initialQuantities }: TestIntegrationClientProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities);
  const [log, setLog] = useState<string[]>([]);

  const appendLog = (line: string) => setLog((prev) => [...prev.slice(-9), line]);

  // ApplicationRuntime يُبنى مرة واحدة فقط (deps فارغة) — لا إعادة إنشاء عند تغيّر quantities/log،
  // بخلاف نمط test-ui/page.tsx (يعيد بناء الـruntime كلما تغيّرت حالة السلة). كل استدعاء state هنا
  // عبر الصيغة الوظيفية (setQuantities(prev => ...)) فلا حاجة لإغلاقات حديثة تفرض إعادة الإنشاء.
  const runtime = useMemo(() => {
    const appRuntime = new ApplicationRuntime();

    // --- القدرة الحقيقية الوحيدة المطلوبة لهذا الـPOC: ADD_TO_CART → Server Actions السلة الحقيقية ---
    appRuntime.registerCapability('ADD_TO_CART', (action) => {
      const { id: productId, action: qtyAction, amount } = action.payload;
      void (async () => {
        try {
          appendLog(`ADD_TO_CART received: productId=${productId} action=${qtyAction ?? 'increment'}`);

          // نجلب ملخّص السلة الحقيقي أولاً لمعرفة إن كان المنتج موجوداً فعلاً فيها (itemId الحقيقي)
          // — لا نخمّن أي شيء، ولا نثق بأي رقم محلي كمصدر حقيقة.
          const summary = await getCartSummaryAction();
          const existingLine = summary.lines.find((l) => l.product.id === productId);
          const currentQty = existingLine?.item.quantity ?? 0;

          let desiredQty: number;
          if (qtyAction === 'decrement') desiredQty = Math.max(0, currentQty - 1);
          else if (qtyAction === 'set' && amount !== undefined) desiredQty = Math.max(0, amount);
          else desiredQty = currentQty + 1;

          let result;
          if (existingLine) {
            result =
              desiredQty <= 0
                ? await removeCartItemAction(existingLine.item.id)
                : await updateCartItemAction(existingLine.item.id, desiredQty);
          } else if (desiredQty > 0) {
            result = await addToCartAction({ productId, quantity: desiredQty });
          } else {
            return; // لا شيء لفعله: لا بند موجود ولا كمية مطلوبة
          }

          if ('error' in result) {
            appendLog(`FAILED: ${result.error}`);
            return;
          }

          const line = result.summary.lines.find((l) => l.product.id === productId);
          setQuantities((prev) => ({ ...prev, [productId]: line?.item.quantity ?? 0 }));
          appendLog(`OK: cart now has qty=${line?.item.quantity ?? 0} for ${productId} (real DB write confirmed)`);
        } catch (err) {
          appendLog(`EXCEPTION: ${err instanceof Error ? err.message : String(err)}`);
        }
      })();
    });

    return appRuntime;
  }, []);

  // دمج synchronous بحت لحالة الكمية الحالية داخل بنود الرف قبل تمريرها لـPageEngine — لا عملية
  // غير متزامنة هنا، فقط اشتقاق عرض من حالتين موجودتين بالفعل (§12 من موجّه المهمة).
  const hydratedPage = useMemo<SDUIPage>(() => {
    return {
      ...resolvedPage,
      sections: resolvedPage.sections.map((section) => {
        if (section.type !== 'product_shelf' || !Array.isArray(section.props.items)) return section;
        return {
          ...section,
          props: {
            ...section.props,
            items: (section.props.items as Product[]).map((product) => ({
              ...product,
              quantity: quantities[product.id] ?? 0,
            })),
          },
        };
      }),
    };
  }, [resolvedPage, quantities]);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6" dir="rtl">
      <div className="rounded-2xl border border-dashed border-primary/50 bg-primary/5 p-4 text-sm">
        <h1 className="mb-1 text-lg font-bold text-foreground">POC: Real Backend → SDUI Integration</h1>
        <p className="text-muted-foreground">
          البيانات المعروضة أدناه حقيقية من الكتالوج الفعلي (لا بيانات وهمية). اضغط &quot;أضف للسلة&quot;
          لتنفيذ كتابة حقيقية على قاعدة البيانات عبر مسار السلة الحالي بلا أي منطق جديد.
        </p>
      </div>

      <PageEngine pageData={hydratedPage} onAction={runtime.dispatch} />

      <div className="rounded-2xl border border-border bg-card p-4 text-xs">
        <h2 className="mb-2 font-bold text-foreground">Action Log (للتحقق الحي)</h2>
        {log.length === 0 ? (
          <p className="text-muted-foreground">لا أحداث بعد — جرّب الضغط على زر الإضافة على أي منتج.</p>
        ) : (
          <ul className="flex flex-col gap-1 font-mono">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
