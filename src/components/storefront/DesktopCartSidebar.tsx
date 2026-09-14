'use client';
import { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityStepper } from '@/components/QuantityStepper';
import { useRouter } from 'next/navigation';
import { updateCartItemAction } from '@/app/(reef)/cart/actions';

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

export function DesktopCartSidebar({ items = [], total = 0, onCheckout }: DesktopCartSidebarProps) {
  const [localItems, setLocalItems] = useState(items);
  const router = useRouter();

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const getSafeNumber = (val: unknown, fallback = 0) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  };

  const safeTotal = localItems.reduce((sum, item) => {
    const p = getSafeNumber(item.price, 0);
    const q = getSafeNumber(item.quantity, 1);
    return sum + (p * q);
  }, 0);

  const handleUpdate = (itemId: string, delta: number) => {
    // Find target before pure update to extract side-effects
    const targetItem = localItems.find(i => i.itemId === itemId);
    if (!targetItem) return;

    const currentQty = getSafeNumber(targetItem.quantity, 1);
    const newQuantity = Math.max(0, currentQty + delta);

    // Side-effects MUST be outside the setState functional updater!
    updateCartItemAction(itemId, newQuantity).catch(console.error);

    // Pure state update
    setLocalItems(prev => prev.map(item => {
      if (item.itemId === itemId) {
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => getSafeNumber(item.quantity, 1) > 0));
  };

  return (
    <aside className="w-80 shrink-0 h-full flex flex-col bg-white rounded-xl shadow-sm border lg:my-4 overflow-hidden hidden lg:flex">
      <div className="p-4 shrink-0 border-b border-border bg-muted/30">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <ShoppingBag size={20} className="text-primary" />
          سلتك
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3 py-4">
        {localItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-4 py-10">
            <ShoppingBag size={48} className="opacity-20" />
            <p className="font-medium text-sm">السلة فارغة حالياً</p>
          </div>
        ) : (
          localItems.map((item) => {
            const unitPrice = getSafeNumber(item.price, 0);
            const qty = getSafeNumber(item.quantity, 1);
            const lineTotal = unitPrice * qty;
            return (
              <div key={item.id} className="flex gap-3 border-b border-border pb-3 last:border-0">
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
                      quantity={qty} 
                      onIncrement={() => handleUpdate(item.itemId, 1)} 
                      onDecrement={() => handleUpdate(item.itemId, -1)} 
                      variant="separate"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {localItems.length > 0 && (
        <div className="p-4 shrink-0 border-t bg-white mt-auto">
          <div className="flex justify-between items-center mb-4 text-foreground">
            <span className="font-semibold">الإجمالي</span>
            <span className="font-extrabold text-lg text-primary">{safeTotal.toLocaleString('ar-EG')} ج.م</span>
          </div>
          <Button onClick={onCheckout || (() => router.push('/cart'))} className="w-full rounded-xl font-bold h-12 text-md shadow-sm">
            إتمام الطلب
          </Button>
        </div>
      )}
    </aside>
  );
}
