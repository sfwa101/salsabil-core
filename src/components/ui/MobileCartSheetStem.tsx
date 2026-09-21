'use client';

import React, { useState } from 'react';
import { X, Maximize2, Minimize2, ShoppingBag, Plus, Minus, Trash2, Home, Sparkles, MapPin, Banknote, Wallet, CreditCard, Smartphone } from 'lucide-react';
import { CartLineItemStem } from './CartLineItemStem';
import { CartBreakdownStem } from './CartBreakdownStem';
import { CartUpgradeBannerStem } from './CartUpgradeBannerStem';
import { VendorCartGroupStem } from './VendorCartGroupStem';
import { getDummyUpsells } from '@/services/dummy-ui-service';
import { OrderSuccessModalStem, OrderDetails } from './OrderSuccessModalStem';
import { UIAction } from '@/sdui/actions/action-contracts';

export interface MobileCartSheetProps {
  isOpen: boolean;
  onClose: () => void;
  products: any[];
  items: Record<string, { quantity: number; price: number }>;
  totalItems: number;
  totalPrice: number;
  onAction?: (action: UIAction) => void;
}

export const MobileCartSheetStem: React.FC<MobileCartSheetProps> = ({ 
  isOpen, 
  onClose, 
  products,
  items,
  totalItems,
  totalPrice,
  onAction
}) => {
  const [sheetState, setSheetState] = useState<'half' | 'full'>('half');
  const [tipAmount, setTipAmount] = useState(0);
  const [walletAmount, setWalletAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  let computedTotalPrice = 0;
  Object.entries(items).forEach(([id, item]) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const p = Number(item.price ?? product.price) || 0;
    const q = Number(item.quantity) || 0;
    computedTotalPrice += p * q;
  });

  const safeTotalPrice = computedTotalPrice;
  const safeTipAmount = Number(tipAmount) || 0;
  const safeWalletAmount = Number(walletAmount) || 0;

  const currentSum = safeTotalPrice + safeTipAmount;
  const finalTotal = currentSum + safeWalletAmount;

  const updateQuantity = (id: string, price: number, amount: number) => {
    onAction?.({
      type: 'ADD_TO_CART',
      payload: { id, amount, action: 'set' }
    });
  };

  const getSuggestions = (base: number) => {
    if (base === 0) return [5, 10, 15];
    const s = [];
    let current = Math.ceil((base + 1) / 5) * 5;
    while(s.length < 3) {
      s.push(current - base);
      current += 5;
    }
    return s;
  };

  const walletSuggestions = getSuggestions(currentSum);
  const tipSuggestions = getSuggestions(safeTotalPrice);

  const handleToggleState = () => {
    setSheetState(prev => (prev === 'half' ? 'full' : 'half'));
  };

  const handleClose = () => {
    onClose();
    // Reset state smoothly after closing animation
    setTimeout(() => setSheetState('half'), 300);
  };

  const upsells = getDummyUpsells();

  // Group items by vendor
  const vendorGroups: Record<string, { vendorName: string; items: any[] }> = {};
  Object.entries(items).forEach(([id, item]) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const vendorId = product.publisher?.id || product.publisher?.name || 'unknown';
    const vendorName = product.publisher?.name || 'متجر آخر';
    
    if (!vendorGroups[vendorId]) {
      vendorGroups[vendorId] = { vendorName, items: [] };
    }
    
    vendorGroups[vendorId].items.push({
      id,
      title: product.title,
      price: item.price ?? product.price,
      quantity: item.quantity,
      imageUrl: product.imageUrl,
      unit: product.publisher?.categoryName
    });
  });

  const handleCheckout = () => {
    if (totalItems === 0) return;
    
    const addressStr = 'جمصة - شارع ريف المدينة'; // Matching UI dummy text
    const orderId = `RF-${Math.floor(Math.random() * 90000) + 10000}`;
    
    // Flatten items for modal
    const flatItems = Object.entries(items).map(([id, item]) => {
      const product = products.find(p => p.id === id);
      return {
        title: product?.title || 'منتج',
        quantity: item.quantity
      };
    });

    setOrderDetails({
      orderId,
      total: finalTotal,
      itemsCount: totalItems,
      address: addressStr,
      tip: tipAmount,
      change: walletAmount,
      items: flatItems
    });

    setIsSuccessModalOpen(true);
  };

  const handleSuccessClose = () => {
    setIsSuccessModalOpen(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300 ease-out lg:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Expandable Sheet */}
      <div 
        className={`fixed bottom-0 left-0 w-full z-50 bg-[var(--sb-background)] shadow-2xl transition-all duration-300 ease-out flex flex-col lg:hidden ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'} ${sheetState === 'half' ? 'h-[72vh] rounded-t-[28px]' : 'h-full rounded-none inset-0'}`}
        dir="rtl"
      >
        {/* Drag Handle & Header */}
        <div className="flex flex-col w-full px-4 pt-2 pb-3 border-b border-border/40 shrink-0">
          <div 
            className="w-12 h-1.5 bg-[var(--sb-muted)] border border-border/40 rounded-full my-1 mx-auto cursor-pointer hover:opacity-70 active:scale-95 transition-all"
            onClick={handleToggleState}
            aria-label="توسيع أو تصغير السلة"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg text-foreground">سلة المشتريات</h2>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {totalItems} عناصر
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleToggleState}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--sb-muted)] text-muted-foreground transition-colors"
              >
                {sheetState === 'half' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
              </button>
              <button 
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--sb-muted)] hover:opacity-80 text-foreground transition-all"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col scrollbar-none">
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground opacity-70">
              <ShoppingBag size={48} strokeWidth={1.5} />
              <p className="font-medium text-sm">السلة فارغة حالياً</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Address Selector */}
              <div className="bg-[var(--sb-muted)] border border-border/40 p-3 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  <span className="text-sm font-bold text-foreground">جمصة - شارع ريف المدينة</span>
                </div>
                <button className="text-xs font-bold text-primary">تغيير</button>
              </div>

              {/* Upgrade Banner */}
              <CartUpgradeBannerStem currentTotal={safeTotalPrice} />

              {/* Vendor Groups */}
              {Object.entries(vendorGroups).map(([vendorId, group]) => (
                <VendorCartGroupStem 
                  key={vendorId}
                  vendorId={vendorId}
                  vendorName={group.vendorName}
                  items={group.items}
                  onUpdateQuantity={updateQuantity}
                />
              ))}

              {/* Upsell/Bundle Section */}
              <div className="mt-2 mb-2 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Sparkles size={16} className="text-amber-500" />
                  <h3 className="font-bold text-sm">غالباً ما يُشترى مع</h3>
                </div>
                
                <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-none -mx-4 px-4">
                  {upsells.map(upsell => (
                    <div key={upsell.id} className="min-w-[140px] flex flex-col gap-2 p-2 bg-[var(--sb-background)] border border-border/40 rounded-xl shadow-sm shrink-0">
                      <div className="w-full h-20 bg-[var(--sb-muted)] rounded-lg overflow-hidden relative border border-border/40">
                        {upsell.imageUrl && <img src={upsell.imageUrl} alt={upsell.title} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold line-clamp-1 text-foreground">{upsell.title}</span>
                        <span className="text-[10px] text-muted-foreground">{upsell.unit}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-extrabold text-primary">{upsell.price} ج</span>
                          <button 
                            onClick={() => updateQuantity(upsell.id, upsell.price, (items[upsell.id]?.quantity || 0) + 1)}
                            className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors"
                            aria-label="إضافة"
                          >
                            <Plus size={12} strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-foreground px-1">طريقة الدفع</span>
                <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none px-1">
                  {[
                    { id: 'cash', label: 'الدفع عند الاستلام', icon: Banknote },
                    { id: 'wallet', label: 'المحفظة', icon: Wallet },
                    { id: 'instapay', label: 'إنستاباي', icon: CreditCard },
                    { id: 'vodafone', label: 'فودافون كاش', icon: Smartphone }
                  ].map(method => (
                    <button 
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 transition-all ${paymentMethod === method.id ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 bg-[var(--sb-background)] text-muted-foreground hover:bg-[var(--sb-muted)]'}`}
                    >
                      <method.icon size={16} />
                      <span className="text-xs font-bold">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip & Change Round-up */}
              <div className="flex flex-col gap-4 bg-[var(--sb-muted)] border border-border/40 rounded-2xl p-4">
                
                {/* Tip */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-foreground">إكرامية القائمين على الطلب</span>
                  <div className="flex flex-wrap gap-2">
                    {tipSuggestions.map(amount => (
                      <button 
                        key={amount}
                        onClick={() => {
                          setTipAmount(prev => prev === amount ? 0 : amount);
                          setWalletAmount(0);
                        }}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${tipAmount === amount ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 bg-[var(--sb-background)] text-muted-foreground hover:border-primary/50'}`}
                      >
                        {amount} ج.م
                      </button>
                    ))}
                    <button className="px-3 py-1.5 rounded-full border border-border/40 bg-[var(--sb-background)] text-muted-foreground text-xs font-bold hover:border-primary/50">
                      إدخال مبلغ آخر
                    </button>
                  </div>
                </div>

                {/* Wallet Round-up */}
                <div className="flex flex-col gap-2 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-2 text-foreground">
                    <Wallet size={16} className="text-primary" />
                    <span className="text-sm font-bold">احفظ باقي الفكة في محفظتك</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {walletSuggestions.map(amount => (
                      <button 
                        key={amount}
                        onClick={() => setWalletAmount(prev => prev === amount ? 0 : amount)}
                        className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${walletAmount === amount ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 bg-[var(--sb-background)] text-muted-foreground hover:border-primary/50'}`}
                      >
                        {amount} ج.م
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Breakdown Section */}
          {totalItems > 0 && (
            <div className="px-1 pb-4">
              <CartBreakdownStem 
                subtotal={safeTotalPrice} 
                tipAmount={safeTipAmount}
                walletAmount={safeWalletAmount}
                finalTotal={finalTotal}
              />
            </div>
          )}
        </div>
        {/* Added padding to prevent the new fixed bottom bar from covering the last item */}
        <div className="h-20 shrink-0" />

        {/* Removed old inline sticky footer, using fixed bottom action bar instead */}
      </div>

      {/* Sticky Checkout Action Bar (Replaces BottomNavStem) */}
      <div 
        className={`fixed bottom-0 left-0 w-full z-[60] bg-[var(--sb-bg-glass)] [backdrop-filter:var(--sb-blur-md)] border-t border-border/40 p-3 flex items-center gap-3 transition-transform duration-300 ease-out lg:hidden pb-safe ${isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}
        dir="rtl"
      >
        {/* Right: Home Button (1x) */}
        <button 
          onClick={handleClose}
          className="w-14 sm:w-16 h-12 flex flex-col items-center justify-center rounded-xl bg-[var(--sb-muted)] text-foreground hover:opacity-80 transition-all shrink-0 border border-border/40"
          aria-label="الرئيسية"
        >
          <ShoppingBag size={18} className="mb-0.5" />
          <span className="text-[9px] font-bold">الرئيسية</span>
        </button>

        {/* Left: Checkout Button (3x) */}
        <button 
          disabled={totalItems === 0}
          onClick={handleCheckout}
          className="flex-1 h-12 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold flex items-center justify-between px-4 shadow-md transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-[0.98]"
        >
          <span>إتمام الطلب</span>
          <span>{finalTotal} ج.م</span>
        </button>
      </div>

      {/* Success Modal */}
      {orderDetails && (
        <OrderSuccessModalStem 
          isOpen={isSuccessModalOpen}
          onClose={handleSuccessClose}
          orderDetails={orderDetails}
          onClearCart={() => onAction?.({ type: 'CLEAR_CART' })}
        />
      )}
    </>
  );
};
