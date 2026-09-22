import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, Minus, Plus, ShoppingCart } from 'lucide-react';
import { UIAction, QuickViewProductSnapshot } from '@/sdui/actions/action-contracts';

export interface ProductQuickViewProps {
  product: QuickViewProductSnapshot;
  onClose: () => void;
  onAction?: (action: UIAction) => void;
}

export const ProductQuickViewStem: React.FC<ProductQuickViewProps> = ({ product, onClose, onAction }) => {
  const [quantity, setQuantity] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!product) return null;

  const handleAddToCart = () => {
    onAction?.({ type: 'ADD_TO_CART', payload: { id: product.id, amount: quantity, action: 'set' } });
    onClose();
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-end lg:items-center justify-center transition-all duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`relative w-full lg:max-w-2xl sb-glass shadow-2xl flex flex-col transition-transform duration-300 ease-out
        rounded-t-3xl lg:rounded-3xl max-h-[90vh] overflow-hidden ${mounted ? 'translate-y-0 lg:scale-100' : 'translate-y-full lg:translate-y-0 lg:scale-95'}`}
        dir="rtl"
      >
        {/* Header / Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-foreground/10 hover:bg-foreground/20 text-primary-foreground lg:text-foreground lg:bg-card/80 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        <div className="overflow-y-auto flex-1 flex flex-col lg:flex-row">
          
          {/* Image Section */}
          <div className="w-full lg:w-1/2 aspect-square relative bg-muted shrink-0">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.title || 'Product Image'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                لا توجد صورة
              </div>
            )}

            {/* Price Badge over image for mobile */}
            <div className="absolute bottom-4 left-4 lg:hidden bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg">
              <span className="font-extrabold text-primary text-lg">{product.price} ج.م</span>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-5 lg:p-8 flex flex-col gap-6 lg:w-1/2">

            <div>
              <h2 className="text-2xl font-extrabold text-foreground leading-tight">
                {product.title}
              </h2>
              {product.unit && (
                <span className="inline-block mt-2 text-sm font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {product.unit}
                </span>
              )}
            </div>

            {/* Price (Desktop) */}
            <div className="hidden lg:block">
              <span className="text-3xl font-extrabold text-primary">{product.price} ج.م</span>
            </div>

            {/* VISUAL-PARITY-PASS (2026-09-22) — استبدال fallback نصي كان يدّعي صفات تسويقية غير
                حقيقية ("جودة عالية ومكونات طازجة") عن أي منتج بلا وصف حقيقي. الآن: يُخفى القسم كاملاً
                إن لم يوجد وصف حقيقي، بدل اختلاق واحد. */}
            {product.description && (
              <div className="space-y-3">
                <h3 className="font-bold text-foreground">الوصف</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="mt-auto pt-6 flex flex-col gap-4">
              
              <div className="flex items-center justify-between bg-muted p-2 rounded-2xl border border-border">
                <span className="font-bold text-foreground px-3">الكمية</span>
                <div className="flex items-center gap-4 bg-card rounded-xl shadow-sm border border-border p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  >
                    <Minus size={20} strokeWidth={2.5} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-primary hover:opacity-80 hover:bg-primary/10 rounded-lg transition-colors"
                  >
                    <Plus size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                className="w-full h-14 bg-primary hover:opacity-90 active:scale-[0.98] text-primary-foreground rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all"
              >
                <ShoppingCart size={22} strokeWidth={2.5} />
                <span className="font-bold text-lg">أضف للسلة - {(product.price || 0) * quantity} ج.م</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
