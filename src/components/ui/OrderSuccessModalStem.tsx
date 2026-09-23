'use client';

import React from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';

export interface OrderDetails {
  orderId: string;
  total: number;
  itemsCount: number;
  address: string;
  tip: number;
  change: number;
  items: any[];
}

export interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails: OrderDetails;
  onClearCart?: () => void;
}

export const OrderSuccessModalStem: React.FC<OrderSuccessModalProps> = ({ isOpen, onClose, orderDetails, onClearCart }) => {
  if (!isOpen) return null;

  const handleWhatsApp = () => {
    // encode message
    let text = `مرحباً، أود متابعة طلبي رقم: ${orderDetails.orderId}\n`;
    text += `العنوان: ${orderDetails.address}\n\n`;
    text += `المنتجات (${orderDetails.itemsCount}):\n`;
    orderDetails.items.forEach(item => {
      text += `- ${item.title} (الكمية: ${item.quantity})\n`;
    });
    text += `\nإجمالي الفاتورة: ${Number(orderDetails.total) || 0} ج.م`;
    if (Number(orderDetails.tip) > 0) text += `\nالإكرامية: ${Number(orderDetails.tip) || 0} ج.م`;
    if (Number(orderDetails.change) > 0) text += `\nشحن المحفظة: ${Number(orderDetails.change) || 0} ج.م`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleBackToShopping = () => {
    onClearCart?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-scrim/60 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in duration-200">
        
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
          <CheckCircle2 size={32} strokeWidth={2.5} />
        </div>

        <h2 className="font-bold text-lg text-foreground">تم تأكيد طلبك بنجاح!</h2>
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full my-2 font-mono">
          #{orderDetails.orderId}
        </span>

        <div className="w-full bg-muted rounded-2xl p-3.5 my-4 text-xs space-y-2 border border-border text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">العنوان:</span>
            <span className="font-bold text-foreground">{orderDetails.address}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">الإجمالي:</span>
            <span className="font-bold text-primary">{Number(orderDetails.total) || 0} ج.م</span>
          </div>
          {(Number(orderDetails.tip) > 0 || Number(orderDetails.change) > 0) && (
            <div className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="text-muted-foreground">إضافات (إكرامية/محفظة):</span>
              <span className="font-bold text-foreground">{(Number(orderDetails.tip) || 0) + (Number(orderDetails.change) || 0)} ج.م</span>
            </div>
          )}
        </div>

        <button 
          onClick={handleWhatsApp}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
        >
          <MessageCircle size={18} />
          <span>متابعة الطلب عبر واتساب</span>
        </button>

        <button 
          onClick={handleBackToShopping}
          className="w-full h-11 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-semibold text-sm transition-all mt-2"
        >
          العودة للتسوق
        </button>
      </div>
    </div>
  );
};
