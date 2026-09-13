import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CartItem {
  id: string;
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
  return (
    <aside className="sticky top-[80px] h-[calc(100vh-80px)] flex flex-col bg-card rounded-2xl border border-border shadow-[var(--sb-shadow-soft)] overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/30">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <ShoppingBag size={20} className="text-primary" />
          سلتك
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground gap-4 py-10">
            <ShoppingBag size={48} className="opacity-20" />
            <p className="font-medium text-sm">السلة فارغة حالياً</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex gap-3 border-b border-border pb-3 last:border-0">
              {item.imageUrl && (
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col flex-1">
                <span className="font-semibold text-sm line-clamp-1 text-foreground">{item.name}</span>
                <span className="text-muted-foreground text-xs">{item.price} جنيه</span>
                <div className="mt-auto flex items-center justify-between">
                  <span className="font-bold text-primary">{item.price * item.quantity} ج.م</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded-md font-medium text-foreground">الكمية: {item.quantity}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {items.length > 0 && (
        <div className="p-4 bg-muted/30 border-t border-border">
          <div className="flex justify-between items-center mb-4 text-foreground">
            <span className="font-semibold">الإجمالي</span>
            <span className="font-extrabold text-lg text-primary">{total} ج.م</span>
          </div>
          <Button onClick={onCheckout} className="w-full rounded-xl font-bold h-12 text-md shadow-sm">
            إتمام الطلب
          </Button>
        </div>
      )}
    </aside>
  );
}
