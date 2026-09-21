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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div 
        className={`relative w-full lg:max-w-2xl bg-white/95 backdrop-blur-xl shadow-2xl flex flex-col transition-transform duration-300 ease-out 
        rounded-t-3xl lg:rounded-3xl max-h-[90vh] overflow-hidden ${mounted ? 'translate-y-0 lg:scale-100' : 'translate-y-full lg:translate-y-0 lg:scale-95'}`}
        dir="rtl"
      >
        {/* Header / Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/10 hover:bg-black/20 text-white lg:text-slate-800 lg:bg-white/80 rounded-full flex items-center justify-center backdrop-blur-md transition-colors"
        >
          <X size={20} strokeWidth={2.5} />
        </button>

        <div className="overflow-y-auto flex-1 flex flex-col lg:flex-row">
          
          {/* Image Section */}
          <div className="w-full lg:w-1/2 aspect-square relative bg-slate-100 shrink-0">
            {product.imageUrl ? (
              <Image 
                src={product.imageUrl}
                alt={product.title || 'Product Image'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                لا توجد صورة
              </div>
            )}
            
            {/* Price Badge over image for mobile */}
            <div className="absolute bottom-4 left-4 lg:hidden bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg">
              <span className="font-extrabold text-emerald-700 text-lg">{product.price} ج.م</span>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-5 lg:p-8 flex flex-col gap-6 lg:w-1/2">
            
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">
                {product.title}
              </h2>
              {product.unit && (
                <span className="inline-block mt-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {product.unit}
                </span>
              )}
            </div>
            
            {/* Price (Desktop) */}
            <div className="hidden lg:block">
              <span className="text-3xl font-extrabold text-emerald-700">{product.price} ج.م</span>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-800">الوصف</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {product.description || 'وصف المنتج غير متوفر حالياً. يمتاز هذا المنتج بجودة عالية ومكونات طازجة مختارة بعناية لتناسب ذوقك.'}
              </p>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="mt-auto pt-6 flex flex-col gap-4">
              
              <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <span className="font-bold text-slate-700 px-3">الكمية</span>
                <div className="flex items-center gap-4 bg-white rounded-xl shadow-sm border border-slate-200 p-1">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <Minus size={20} strokeWidth={2.5} />
                  </button>
                  <span className="w-8 text-center font-bold text-lg">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Plus size={20} strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              <button 
                onClick={handleAddToCart}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/30 transition-all"
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
