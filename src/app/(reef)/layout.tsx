// data-world يعيد تعريف التوكنز الدلالية لهذا القسم فقط من الشجرة (docs/UI_UX_SYSTEM.md §8.3) —
// المكوّنات داخله لا تتغيّر، فقط القيم تحتها. "reef-lavender" (لا "reef" الأخضر) هو الغلاف البصري
// الفعلي المُفعَّل الآن (RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS، قرار مؤسس صريح) — القيم الخضراء
// تبقى معرَّفة بالكامل في theme-registry.ts/globals.css، لم تُحذَف، فقط لم تعد الافتراضي. راجع
// docs/DECISIONS.md → ADR-023.
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CartCapsule } from '@/components/CartCapsule';
import { getCartTotalAction } from '@/app/(reef)/cart/actions';

export default async function ReefLayout({ children }: { children: React.ReactNode }) {
  const cartTotal = await getCartTotalAction();

  return (
    <div data-world="reef-lavender" className="min-h-screen bg-background text-foreground">
      <Header />

      {/* FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 5) — كبسولة السلة عنصر عائم
          مستقل تماماً عن Header/ScrollHideBar — لا تختفي أبداً بالتمرير (بعكس الهيدر)، تبقى ثابتة في
          أعلى اليسار طوال الوقت. `justify-end` (لا start) عمداً — في RTL هذا يضعها في أقصى اليسار،
          نفس موضعها القديم داخل صف الهيدر بالضبط (نفس max-width/padding). `pointer-events-none` على
          الغلاف الخارجي يمنعها من حجب أي نقر آخر في هذا الشريط الأفقي؛ `pointer-events-auto` يعيد
          التفعيل للكبسولة نفسها فقط. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-2xl justify-end px-4 pt-4 md:max-w-4xl xl:max-w-6xl">
          <div className="pointer-events-auto">
            <CartCapsule total={cartTotal} />
          </div>
        </div>
      </div>

      {/* pb-20: يمنع BottomNav (fixed bottom-0، BAYAN-CLOSEOUT-UI-GAPS) من تغطية آخر عنصر في أي
          صفحة (reef) */}
      <div className="pb-20">{children}</div>
      <BottomNav />
    </div>
  );
}
