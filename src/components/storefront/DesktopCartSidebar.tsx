'use client';
import { useCallback, useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useRouter } from 'next/navigation';
import { useOptimisticCartLine } from '@/components/useOptimisticCartLine';
import { useCartToast } from '@/components/useCartToast';
import { awaitPendingCartMutations } from '@/components/cartMutationGate';

interface CartItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface DesktopCartSidebarProps {
  items?: CartItem[];
  total?: number;
  onCheckout?: () => void;
}

function getSafeNumber(val: unknown, fallback = 0) {
  const num = Number(val);
  return Number.isFinite(num) ? num : fallback;
}

// نفس نمط CartCapsuleLineRow (src/components/CartCapsule.tsx) — بند سلة واحد لكل استدعاء hook، لا
// يمكن استدعاء useOptimisticCartLine داخل map() على المكوّن الأب مباشرة. `item.id` هنا هو معرّف
// المنتج فعلياً رغم الاسم (HomePage يمرّره كـ line.product.id — راجع Task Report، التسمية موروثة من
// الكود القديم ولم تُغيَّر لتقليل حجم التعديل).
function DesktopCartLineRow({
  item,
  onError,
  onQuantityChange,
}: {
  item: CartItem;
  onError: (message: string) => void;
  onQuantityChange: (itemId: string, quantity: number) => void;
}) {
  const { quantity, setQuantity } = useOptimisticCartLine(
    item.id,
    getSafeNumber(item.price, 0),
    { itemId: item.itemId, quantity: getSafeNumber(item.quantity, 0) },
    onError
  );

  useEffect(() => {
    onQuantityChange(item.itemId, quantity);
  }, [item.itemId, quantity, onQuantityChange]);

  if (quantity <= 0) return null;

  const unitPrice = getSafeNumber(item.price, 0);
  const lineTotal = unitPrice * quantity;

  return (
    <div className="flex gap-3 border-b border-border pb-3 last:border-0">
      {item.imageUrl && (
        <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex flex-col flex-1">
        <span className="font-semibold text-sm line-clamp-1 text-foreground">{item.name}</span>
        <span className="text-muted-foreground text-xs">{unitPrice.toLocaleString('ar-EG')} جنيه</span>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-bold text-primary">{lineTotal.toLocaleString('ar-EG')} ج.م</span>
          <QuantityStepper
            quantity={quantity}
            onIncrement={() => setQuantity(quantity + 1)}
            onDecrement={() => setQuantity(quantity - 1)}
            variant="separate"
          />
        </div>
      </div>
    </div>
  );
}

export function DesktopCartSidebar({ items = [], total = 0, onCheckout }: DesktopCartSidebarProps) {
  const router = useRouter();
  const { showToast, toastNode } = useCartToast();
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.itemId, getSafeNumber(item.quantity, 0)]))
  );

  useEffect(() => {
    setQuantities(Object.fromEntries(items.map((item) => [item.itemId, getSafeNumber(item.quantity, 0)])));
  }, [items]);

  const handleQuantityChange = useCallback((itemId: string, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [itemId]: quantity }));
  }, []);

  const safeTotal = items.reduce((sum, item) => {
    const p = getSafeNumber(item.price, 0);
    const q = quantities[item.itemId] ?? getSafeNumber(item.quantity, 0);
    return sum + (p * q);
  }, 0);

  const hasVisibleItems = items.some((item) => (quantities[item.itemId] ?? getSafeNumber(item.quantity, 0)) > 0);

  // FIX-LIVE-BUG-SILENT-ADD-TO-CART-FAILURE — نفس ضمان CartCapsule.tsx→handleNavigateToCart: ينتظر
  // أي كتابة سلة معلَّقة (تعديل كمية للتو في هذا الشريط نفسه) قبل التنقّل، وإلا قد تصل صفحة /cart قبل
  // وصول تلك الكتابة فعلياً.
  function handleCheckoutClick() {
    if (onCheckout) {
      onCheckout();
      return;
    }
    awaitPendingCartMutations().then(() => router.push('/cart'));
  }

  return (
    <aside className="w-80 shrink-0 h-full flex flex-col bg-white rounded-xl shadow-sm border lg:my-4 overflow-hidden hidden lg:flex">
      <div className="p-4 shrink-0 border-b border-border bg-muted/30">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <ShoppingBag size={20} className="text-primary" />
          سلتك
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 py-4">
        {!hasVisibleItems ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-4 py-10">
            <ShoppingBag size={48} className="opacity-20" />
            <p className="font-medium text-sm">السلة فارغة حالياً</p>
          </div>
        ) : (
          items.map((item) => (
            <DesktopCartLineRow
              key={item.itemId}
              item={item}
              onError={showToast}
              onQuantityChange={handleQuantityChange}
            />
          ))
        )}
      </div>

      {hasVisibleItems && (
        <div className="p-4 shrink-0 border-t bg-white mt-auto">
          <div className="flex justify-between items-center mb-4 text-foreground">
            <span className="font-semibold">الإجمالي</span>
            <span className="font-extrabold text-lg text-primary">{safeTotal.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <Button onClick={handleCheckoutClick} className="w-full rounded-xl font-bold h-12 text-md shadow-sm">
            إتمام الطلب
          </Button>
        </div>
      )}
      {toastNode}
    </aside>
  );
}
