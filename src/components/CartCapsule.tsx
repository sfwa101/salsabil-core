'use client';
// src/components/CartCapsule.tsx
// كبسولة السلة — عنصر عائم مستقل (ReefLayout في src/app/(reef)/layout.tsx، لا داخل Header.tsx
// كما كانت) لأن نبضة الإضافة تحتاج حالة عميل (مقارنة القيمة الحالية بالسابقة عبر useRef). `total`
// يصل كـ prop (getCartTotalAction → cartService.getSummary().total — لا تغيير في مصدر البيانات).
//
// FULL-VISUAL-PARITY-AUDIT-AND-FIX (بند 1أ/1ب) + FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-
// VISUALS (بند 5):
//  - إجمالي السلة بالجنيه ("148ج" لا "148" عدد قطع) — "ج" لا "ج.م" (اختصار أقصر يلائم مساحة الكبسولة
//    الصغيرة)، بخط أكبر (text-sm بدل text-xs) لوضوح أعلى.
//  - إصلاح اتجاه النبضة: بلا `transform-origin` صريح، `scale-110` كانت تتمدد بالتساوي في الاتجاهين —
//    نصفها الأيمن (نحو منتصف الهيدر/العنوان) يتداخل بصرياً مع محتوى مجاور. الكبسولة تقع في أقصى
//    يسار الشاشة — حافتها اليمنى تواجه المحتوى، حافتها اليسرى تواجه حافة الشاشة الفارغة. `origin-right`
//    (فيزيائي، لا منطقي — dir="rtl" ثابت دائماً، لا وضع LTR) يُثبِّت الحافة اليمنى كنقطة الارتكاز،
//    فيتمدد كل النمو نحو اليسار فقط.
//  - **أصبحت عنصراً عائماً ثابتاً (`position: fixed` من المستدعي، layout.tsx)** — لا تختفي مع
//    الهيدر عند التمرير للأسفل بعد الآن (كانت جزءاً من صف الهيدر الذي يختفي/يظهر، ScrollHideBar)؛
//    تبقى ظاهرة دائماً بصرف النظر عن اتجاه التمرير أو حالة الهيدر.
//
// آلية النبضة: CSS transition بحت (scale + ring مؤقتان عبر className مشروط)، بلا Framer Motion —
// قيد صريح.
//
// FIX-CART-CAPSULE-SYNC-AND-NAVIGATION-LAG-CRITICAL (الجزء 1) — `total` لم يعد prop من layout.tsx
// (كان ينتظر اكتمال الجولة الحقيقية للسيرفر فقط، فيتناقض بصرياً مع التحديث الفوري في CartLineItem/
// ProductCard/ProductOptions، ADR-027) — يُقرَأ الآن من useCartTotal() (CartTotalProvider.tsx، يغلّف
// (reef)/layout.tsx بالكامل): نفس القيمة التفاؤلية التي تُحدِّثها كل نقاط التفاعل الثلاث فوراً، لا
// مصدر منفصل. النبضة (pulsing) تبقى تعمل بنفس الآلية بلا تغيير — فقط تتفاعل الآن مع تغيّر فوري بدل
// تغيّر بعد ثانية أو أكثر.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCartTotal } from '@/components/CartTotalProvider';
import { BottomSheet } from '@/components/BottomSheet';
import { getCartSummaryAction, updateCartItemAction } from '@/app/(reef)/cart/actions';
import { QuantityStepper } from '@/components/QuantityStepper';

const PULSE_DURATION_MS = 500;

export function CartCapsule() {
  const { total } = useCartTotal();
  const [pulsing, setPulsing] = useState(false);
  const prevTotal = useRef(total);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [cartData, setCartData] = useState<any>(null);
  const [localItems, setLocalItems] = useState<any[]>([]);

  const getSafeNumber = (val: unknown, fallback = 0) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  };

  // The button always uses the global optimistic total
  const displayTotalButton = getSafeNumber(total, 0);

  // The sheet uses the exact local items total to ensure absolute real-time sync with button clicks
  const displayTotalSheet = localItems.reduce((acc, line) => {
    const p = getSafeNumber(line.price ?? line.unitPrice, 0);
    const q = getSafeNumber(line.quantity, 1);
    return acc + (p * q);
  }, 0);

  useEffect(() => {
    if (total > prevTotal.current) {
      setPulsing(true);
      const timeout = setTimeout(() => setPulsing(false), PULSE_DURATION_MS);
      prevTotal.current = total;
      return () => clearTimeout(timeout);
    }
    prevTotal.current = total;
  }, [total]);

  async function handleOpenSheet() {
    setSheetOpen(true);
    const data = await getCartSummaryAction();
    setCartData(data);
    if (data?.lines) {
      setLocalItems(data.lines);
    }
  }

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    // Find target before pure update to extract side-effects
    const targetLine = localItems.find(line => line.item.id === itemId);
    if (!targetLine) return;

    const currentQty = getSafeNumber(targetLine.quantity, 1);
    const newQuantity = Math.max(0, currentQty + delta);

    // Side-effects MUST be outside the setState functional updater!
    updateCartItemAction(itemId, newQuantity).catch(console.error);

    // Pure state update
    setLocalItems(prev => prev.map(line => {
      if (line.item.id === itemId) {
        return { ...line, quantity: newQuantity };
      }
      return line;
    }).filter(line => getSafeNumber(line.quantity, 1) > 0));
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenSheet}
        aria-label="السلة"
        className={`relative flex shrink-0 origin-right items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 shadow-sm transition-transform duration-300 ease-out hover:bg-muted ${
          pulsing ? 'scale-110 ring-2 ring-primary' : 'scale-100'
        }`}
      >
        <ShoppingCart size={22} className="text-foreground" />
        {displayTotalButton > 0 && (
          <span className="flex h-6 items-center justify-center whitespace-nowrap rounded-full bg-primary px-2.5 text-sm font-semibold text-primary-foreground">
            {displayTotalButton.toLocaleString('ar-EG')}ج
          </span>
        )}
      </button>

      {/* Mobile Full Screen Cart Overlay */}
      {sheetOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white lg:hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 shrink-0">
            <h2 className="text-lg font-bold text-foreground">سلة المشتريات</h2>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="rounded-full bg-muted/50 p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              إغلاق
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {!cartData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">جاري تحميل السلة...</div>
            ) : localItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">السلة فارغة</div>
            ) : (
              <div className="flex flex-col">
                {localItems.map((line: any) => {
                  const unitPrice = getSafeNumber(line.price ?? line.unitPrice, 0);
                  const qty = getSafeNumber(line.quantity, 1);
                  return (
                    <div key={line.item.id} className="flex items-center gap-3 border-b border-border py-4">
                      {line.product.imageUrl && (
                        <div className="w-16 h-16 shrink-0 rounded-xl bg-muted overflow-hidden border border-border/50">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={line.product.imageUrl} alt={line.product.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-bold text-foreground line-clamp-1">{line.product.name}</span>
                        <span className="text-xs text-muted-foreground font-medium">{unitPrice.toLocaleString('ar-EG')} ج.م</span>
                      </div>
                      <div className="shrink-0">
                        <QuantityStepper 
                          quantity={qty} 
                          onIncrement={() => handleUpdateQuantity(line.item.id, 1)} 
                          onDecrement={() => handleUpdateQuantity(line.item.id, -1)} 
                          variant="pill"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {cartData && localItems.length > 0 && (
            <div className="shrink-0 border-t border-border bg-white p-4 pb-6 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              <div className="flex items-center justify-between font-bold text-foreground mb-4">
                <span className="text-muted-foreground">الإجمالي</span>
                <span className="text-primary text-2xl">{displayTotalSheet.toLocaleString('ar-EG')} ج.م</span>
              </div>
              <Link 
                href="/cart" 
                onClick={() => setSheetOpen(false)}
                className="w-full flex items-center justify-center h-14 rounded-2xl bg-primary text-primary-foreground text-lg font-bold transition hover:bg-primary/90 shadow-[var(--sb-shadow-pill)]"
              >
                إتمام الطلب
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Desktop Drawer Cart */}
      <div className="hidden lg:block">
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="سلة المشتريات">
          <div className="flex flex-col gap-2 pb-6">
            {!cartData ? (
              <div className="py-10 text-center text-sm text-muted-foreground">جاري تحميل السلة...</div>
            ) : localItems.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">السلة فارغة</div>
            ) : (
              <div className="flex flex-col max-h-[50vh] overflow-y-auto no-scrollbar mb-4">
                {localItems.map((line: any) => {
                  const unitPrice = getSafeNumber(line.price ?? line.unitPrice, 0);
                  const qty = getSafeNumber(line.quantity, 1);
                  return (
                    <div key={line.item.id} className="flex items-center gap-3 border-b border-border py-3">
                      {line.product.imageUrl && (
                        <div className="w-14 h-14 shrink-0 rounded-lg bg-muted overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={line.product.imageUrl} alt={line.product.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex flex-col flex-1">
                        <span className="text-sm font-semibold text-foreground line-clamp-1">{line.product.name}</span>
                        <span className="text-xs text-muted-foreground">{unitPrice.toLocaleString('ar-EG')} ج.م</span>
                      </div>
                      <div className="shrink-0">
                        <QuantityStepper 
                          quantity={qty} 
                          onIncrement={() => handleUpdateQuantity(line.item.id, 1)} 
                          onDecrement={() => handleUpdateQuantity(line.item.id, -1)} 
                          variant="pill"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {cartData && localItems.length > 0 && (
              <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between font-bold text-foreground">
                  <span>الإجمالي</span>
                  <span className="text-primary text-lg">{displayTotalSheet.toLocaleString('ar-EG')} ج.م</span>
                </div>
                <Link 
                  href="/cart" 
                  onClick={() => setSheetOpen(false)}
                  className="w-full flex items-center justify-center h-12 rounded-xl bg-primary text-primary-foreground font-bold transition hover:opacity-90"
                >
                  إتمام الطلب
                </Link>
              </div>
            )}
          </div>
        </BottomSheet>
      </div>
    </>
  );
}
