// data-world يعيد تعريف التوكنز الدلالية لهذا القسم فقط من الشجرة (docs/UI_UX_SYSTEM.md §8.3) —
// المكوّنات داخله لا تتغيّر، فقط القيم تحتها. "reef-lavender" (لا "reef" الأخضر) هو الغلاف البصري
// الفعلي المُفعَّل الآن (RAPID-VISUAL-REDESIGN-BATCH-SAFE-SCREENS، قرار مؤسس صريح) — القيم الخضراء
// تبقى معرَّفة بالكامل في theme-registry.ts/globals.css، لم تُحذَف، فقط لم تعد الافتراضي. راجع
// docs/DECISIONS.md → ADR-023.
//
// VERTICAL-SLICE-1-HEADER-BOTTOMNAV-INTEGRATION (2026-09-22) — Header/BottomNav (القديمان) استُبدِلا
// بـReefHeader (Adapter يُركِّب DesktopHeaderStem/MobileHeaderStem) وBottomNavStem — راجع
// docs/DECISIONS.md → ADR-035، docs/audits/2026-09-22-post-antigravity-integration-forensic-audit.md
// §19.10. src/components/Header.tsx وsrc/components/BottomNav.tsx **لم يُحذَفا** — يبقيان في الكود
// بلا استدعاء، لقابلية التراجع حتى تأكيد التحقق الحي لهذه الشريحة. getCartItemCountAction (كانت
// موجودة فعلاً، بُنيت أصلاً "للـHeader" — لم تكن مستخدَمة هنا من قبل) تُغذّي شارة عدد السلة في
// MobileHeaderStem الآن.
import { BottomNavStem } from '@/components/ui/BottomNavStem';
import { ReefHeader } from './ReefHeader';
import { CartTotalProvider } from '@/components/CartTotalProvider';
import { getCartSummaryAction } from '@/app/(reef)/cart/actions';

export default async function ReefLayout({ children }: { children: React.ReactNode }) {
  const cartSummary = await getCartSummaryAction();

  const cartTotal = cartSummary?.total ?? 0;
  const cartItemCount = cartSummary?.lines.reduce((acc, l) => acc + l.item.quantity, 0) ?? 0;
  const lines = cartSummary?.lines ?? [];

  return (
    // FIX-CART-CAPSULE-SYNC-AND-NAVIGATION-LAG-CRITICAL (الجزء 1) — يغلّف الشجرة بالكامل بحالة السلة
    // التفاؤلية المشتركة — CartLineItem/ProductCard/ProductOptions (في {children}) وReefHeader (هنا،
    // totalPrice عبر useCartTotal()) يقرآن/يكتبان نفس القيمة الآن، لا مصدرين منفصلين قد يتعارضان.
    <CartTotalProvider total={cartTotal} itemCount={cartItemCount}>
      <div data-world="reef-lavender" className="min-h-screen bg-background text-foreground">
        <ReefHeader lines={lines} />

        {/* pb-20: يمنع BottomNavStem (fixed bottom-5) من تغطية آخر عنصر في أي صفحة (reef) */}
        <div className="pb-20">{children}</div>
        <BottomNavStem />
      </div>
    </CartTotalProvider>
  );
}
