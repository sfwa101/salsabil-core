// data-world يعيد تعريف التوكنز الدلالية لهذا القسم فقط من الشجرة (docs/UI_UX_SYSTEM.md §8.3) —
// المكوّنات داخله لا تتغيّر، فقط القيم تحتها. "reef-lavender" (لا "reef" الأخضر) هو الغلاف البصري
// الفعلي المُفعَّل الآن (RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS، قرار مؤسس صريح) — القيم الخضراء
// تبقى معرَّفة بالكامل في theme-registry.ts/globals.css، لم تُحذَف، فقط لم تعد الافتراضي. راجع
// docs/DECISIONS.md → ADR-023.
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { CartCapsule } from '@/components/CartCapsule';
import { CartTotalProvider } from '@/components/CartTotalProvider';
import { getCartTotalAction } from '@/app/(reef)/cart/actions';

export default async function ReefLayout({ children }: { children: React.ReactNode }) {
  const cartTotal = await getCartTotalAction();

  return (
    // FIX-CART-CAPSULE-SYNC-AND-NAVIGATION-LAG-CRITICAL (الجزء 1) — يغلّف الشجرة بالكامل (الكبسولة
    // نفسها + كل الصفحات) بحالة السلة التفاؤلية المشتركة — CartLineItem/ProductCard/ProductOptions
    // (في {children}) وCartCapsule (هنا) يقرآن/يكتبان نفس القيمة الآن، لا مصدرين منفصلين قد يتعارضان.
    <CartTotalProvider total={cartTotal}>
      <div data-world="reef-lavender" className="min-h-screen bg-background text-foreground">
        <Header />

        {/* CartCapsule moved to Header.tsx */}

        {/* pb-20: يمنع BottomNav (fixed bottom-0، BAYAN-CLOSEOUT-UI-GAPS) من تغطية آخر عنصر في أي
            صفحة (reef) */}
        <div className="pb-20">{children}</div>
        <BottomNav />
      </div>
    </CartTotalProvider>
  );
}
