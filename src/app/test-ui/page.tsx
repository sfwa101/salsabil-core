'use client';

import React, { useState, useEffect } from 'react';
import { getDummyProducts, getDummyCategories, getDummyFeedItems, getDummyReels, DummyReel } from '@/services/dummy-ui-service';
import { StemProductCard } from '@/components/ui/StemProductCard';
import { StemHeroFeedCard } from '@/components/ui/StemHeroFeedCard';
import { ReelsHorizontalShelfStem } from '@/components/ui/ReelsHorizontalShelfStem';
import { ReelsEmbedModalStem } from '@/components/ui/ReelsEmbedModalStem';
import { HorizontalShelfStem } from '@/components/ui/HorizontalShelfStem';
import { CategoryBarStem, CategoryStem } from '@/components/ui/CategoryBarStem';
import { BottomNavStem } from '@/components/ui/BottomNavStem';
import { MobileHeaderStem } from '@/components/ui/MobileHeaderStem';
import { WorldsTrayStem } from '@/components/ui/WorldsTrayStem';
import { MobileCartSheetStem } from '@/components/ui/MobileCartSheetStem';
import { DesktopHeaderStem } from '@/components/ui/DesktopHeaderStem';
import { DummyCartProvider, useDummyCart } from '@/context/DummyCartContext';
import Image from 'next/image';

import { Wallet, MapPin, ChevronDown, Plus, Search, Loader2, ShoppingCart, ChevronLeft } from 'lucide-react';
import { CartUpgradeBannerStem } from '@/components/ui/CartUpgradeBannerStem';
import { VendorCartGroupStem } from '@/components/ui/VendorCartGroupStem';
import { AddressModalStem, AddressItem } from '@/components/ui/AddressModalStem';
import { CartBreakdownStem } from '@/components/ui/CartBreakdownStem';
import { OrderSuccessModalStem, OrderDetails } from '@/components/ui/OrderSuccessModalStem';
import { ProductQuickViewStem } from '@/components/ui/ProductQuickViewStem';
import { UIAction } from '@/sdui/actions/action-contracts';

import { componentRegistry } from '@/sdui/registry/component-registry';
import { PageEngine } from '@/sdui/engine/PageEngine';
import { SDUIComponent } from '@/sdui/contracts/component-contracts';
import { ApplicationRuntime } from '@/sdui/runtime/ApplicationRuntime';
import { DataResolver } from '@/sdui/data/DataResolver';
import { QueryRegistry } from '@/sdui/data/QueryRegistry';
import { ReefMockDataSource } from '@/app/(reef)/data/ReefMockDataSource';
import { z } from 'zod';
import { SDUIPage } from '@/sdui/schema/page.schema';

// --- SDUI Component Wrappers ---
const SDUIHeroFeedCard: SDUIComponent = ({ props, onAction }) => {
  return (
    <div className="px-2 sm:px-4">
      <StemHeroFeedCard 
        {...props} 
        onAddToCart={(id: string) => onAction?.({ type: 'ADD_TO_CART', payload: { id, action: 'increment' } })}
        onClick={() => onAction?.({ type: 'OPEN_QUICK_VIEW', payload: { product: props } })}
      />
    </div>
  );
};

const SDUIShelf: SDUIComponent = ({ props, onAction }) => {
  // We map the resolved data objects to actual React components (StemProductCard)
  // because HorizontalShelfStem expects ReactNode[].
  const mappedItems = Array.isArray(props.items) ? props.items.map((product: any) => (
    <StemProductCard
      key={product.id}
      {...product}
      onAddToCart={(id: string) => onAction?.({ type: 'ADD_TO_CART', payload: { id, action: 'increment' } })}
      onClick={() => onAction?.({ type: 'OPEN_QUICK_VIEW', payload: { product } })}
    />
  )) : [];

  return (
    <HorizontalShelfStem 
      title={props.title as string} 
      actionLabel={props.actionLabel as string} 
      items={mappedItems} 
    />
  );
};

const SDUIReelsShelf: SDUIComponent = ({ props, onAction }) => {
  return (
    <ReelsHorizontalShelfStem 
      items={props.items}
      onReelClick={(reel) => onAction?.({ type: 'OPEN_REEL', payload: reel })}
    />
  );
};

const SDUICategoryBar: SDUIComponent = ({ props, onAction }) => {
  return (
    <CategoryBarStem 
      categories={props.categories as CategoryStem[]} 
      onSelect={(id) => onAction?.({ type: 'SELECT_CATEGORY', payload: { categoryId: id } })} 
    />
  );
};

// --- Component Registration ---
if (!componentRegistry.has('hero_card')) {
  componentRegistry.register('hero_card', SDUIHeroFeedCard);
  componentRegistry.register('product_shelf', SDUIShelf);
  componentRegistry.register('reels_shelf', SDUIReelsShelf);
  componentRegistry.register('category_bar', SDUICategoryBar);
}

function useScrollDirection() {
  const [showBars, setShowBars] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          if (currentScrollY > 50) {
            if (currentScrollY > lastScrollY) {
              // Scrolling down
              setShowBars(false);
            } else {
              // Scrolling up
              setShowBars(true);
            }
          } else {
            setShowBars(true);
          }
          setLastScrollY(currentScrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return showBars;
}

function DesktopCartSidebar({ products }: { products: any[] }) {
  const { items, totalItems, updateQuantity, tipAmount, walletAmount, setTipAmount, setWalletAmount, selectedAddress } = useDummyCart();
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

  const vendorGroups: Record<string, { vendorName: string; items: any[] }> = {};
  Object.entries(items).forEach(([id, item]) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const vendorId = product.publisher?.id || product.publisher?.name || 'unknown';
    const vendorName = product.publisher?.name || 'متجر آخر';
    if (!vendorGroups[vendorId]) vendorGroups[vendorId] = { vendorName, items: [] };
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
    const addressStr = selectedAddress;
    const orderId = `RF-${Math.floor(Math.random() * 90000) + 10000}`;
    const flatItems = Object.entries(items).map(([id, item]) => {
      const product = products.find(p => p.id === id);
      return { title: product?.title || 'منتج', quantity: item.quantity };
    });
    setOrderDetails({
      orderId, total: finalTotal, itemsCount: totalItems, address: addressStr,
      tip: tipAmount, change: walletAmount, items: flatItems
    });
    setIsSuccessModalOpen(true);
  };

  return (
    <aside className="w-[380px] shrink-0 sticky top-24 h-[calc(100vh-7rem)] flex flex-col bg-white/40 backdrop-blur-xl rounded-3xl p-4 border border-white/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
        <h2 className="font-bold text-lg text-foreground mb-4 shrink-0">سلة المشتريات</h2>
        {totalItems === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 bg-[var(--sb-muted)] rounded-full flex items-center justify-center text-muted-foreground text-2xl">🛒</div>
            <p className="text-sm text-muted-foreground">السلة فارغة</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-1 scrollbar-thin flex flex-col gap-4 pb-4">
              <CartUpgradeBannerStem currentTotal={safeTotalPrice} />
              
              {Object.entries(vendorGroups).map(([vendorId, group]) => (
                <VendorCartGroupStem key={vendorId} vendorId={vendorId} vendorName={group.vendorName} items={group.items} onUpdateQuantity={updateQuantity} />
              ))}
              
              <div className="text-center text-[11px] text-muted-foreground py-1">
                اسحب المنتج لليسار للحذف السريع
              </div>
              
              <div className="flex flex-col gap-4 bg-[var(--sb-muted)] border border-border/40 rounded-2xl p-4">
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-bold text-foreground">إكرامية القائمين على الطلب</span>
                  <div className="flex flex-wrap gap-2">
                    {tipSuggestions.map(amount => (
                      <button key={amount} onClick={() => { setTipAmount(tipAmount === amount ? 0 : amount); setWalletAmount(0); }} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${tipAmount === amount ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 bg-[var(--sb-background)] text-muted-foreground hover:border-primary/50'}`}>{amount} ج.م</button>
                    ))}
                    <button className="px-3 py-1.5 rounded-full border border-border/40 bg-[var(--sb-background)] text-muted-foreground text-xs font-bold hover:border-primary/50">إدخال مبلغ آخر</button>
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-3 border-t border-border/40">
                  <div className="flex items-center gap-2 text-foreground">
                    <Wallet size={16} className="text-primary" />
                    <span className="text-sm font-bold">احفظ باقي الفكة في محفظتك</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {walletSuggestions.map(amount => (
                      <button key={amount} onClick={() => setWalletAmount(walletAmount === amount ? 0 : amount)} className={`px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${walletAmount === amount ? 'border-primary bg-primary text-primary-foreground' : 'border-border/40 bg-[var(--sb-background)] text-muted-foreground hover:border-primary/50'}`}>{amount} ج.م</button>
                    ))}
                  </div>
                </div>
              </div>
              
              <CartBreakdownStem subtotal={safeTotalPrice} tipAmount={safeTipAmount} walletAmount={safeWalletAmount} finalTotal={finalTotal} />
            </div>
            
            <div className="pt-3 border-t border-slate-100/80 bg-white/40 backdrop-blur-sm shrink-0">
              <button onClick={handleCheckout} className="w-full h-12 rounded-xl bg-primary hover:opacity-90 text-primary-foreground font-bold flex items-center justify-between px-4 shadow-md transition-all active:scale-[0.98]">
                <span>إتمام الطلب</span>
                <span>{finalTotal} ج.م</span>
              </button>
            </div>
          </>
        )}
      {orderDetails && (
        <OrderSuccessModalStem isOpen={isSuccessModalOpen} onClose={() => setIsSuccessModalOpen(false)} orderDetails={orderDetails} />
      )}
    </aside>
  );
}

// --- Static Data References (Moved outside to prevent infinite render loops) ---
const products = getDummyProducts();
const initialCategories: CategoryStem[] = getDummyCategories();
const dummyWorlds = require('@/services/dummy-ui-service').getDummyWorlds();
const feedItems = getDummyFeedItems();
const dummyReels = getDummyReels();

// ==========================================
// STATIC DECLARATIVE PAGE SCHEMA
// ==========================================
const homePageSchema: SDUIPage = {
  id: "home_page_1",
  sections: [
    {
      id: "section_categories",
      type: "category_bar",
      props: {
        categories: { $bind: 'query.categories' }
      },
      visibility: { enabled: true }
    },
    {
      id: "section_hero_1",
      type: "hero_card",
      props: {
        id: "hero-1",
        title: "اكتشف متعة التسوق",
        subtitle: "منتجات ريف المدينة بين يديك",
        imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200",
        badge: "جديد",
        category: { name: "عروض", slug: "offers" },
        type: "hero"
      },
      visibility: { enabled: true }
    },
    {
      id: "section_shelf_1",
      type: "product_shelf",
      props: {
        title: 'طازج اليوم',
        actionLabel: 'عرض الكل',
        items: { $bind: 'query.products', params: { limit: 10 } }
      },
      visibility: { enabled: true }
    },
    {
      id: "section_reels_1",
      type: "reels_shelf",
      props: {
        title: 'لحظات ريف المدينة',
        items: { $bind: 'query.reels', params: { limit: 5 } }
      },
      visibility: { enabled: true }
    }
  ]
};

export function TestUIContent() {
  const showBars = useScrollDirection();

  
  const [categories, setCategories] = useState<CategoryStem[]>(initialCategories);
  const [isWorldsOpen, setIsWorldsOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeReel, setActiveReel] = useState<DummyReel | null>(null);
  const [isReelModalOpen, setIsReelModalOpen] = useState(false);
  const [activeFeedTab, setActiveFeedTab] = useState('all');
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);
  const [resolvedPage, setResolvedPage] = useState<SDUIPage | null>(null);
  
  const { selectedAddress, setSelectedAddress, items, updateQuantity, totalItems, totalPrice, clearCart } = useDummyCart();

  // Build Reef Capabilities Runtime
  const runtime = React.useMemo(() => {
    const appRuntime = new ApplicationRuntime();

    appRuntime.registerCapability('ADD_TO_CART', (action) => {
      // REAL-BACKEND-SDUI-INTEGRATION-POC (2026-09-21) — UIAction.ADD_TO_CART لم يعد يحمل price
      // (السعر لا يصل من العميل أبداً، حتى في هذه الصفحة التجريبية). هذه الصفحة تبقى بيانات وهمية
      // بالكامل (DummyCartContext غير مُعدَّل)، فنشتق السعر محلياً من مصفوفة products الوهمية بدل
      // قراءته من الحمولة — أقل تغيير ممكن يبقي هذا الملف متوافقاً مع العقد الجديد.
      const { id, action: qtyAction, amount } = action.payload;
      const price = products.find((p) => p.id === id)?.price ?? 0;
      const currentQty = items[id]?.quantity || 0;
      
      if (qtyAction === 'decrement') {
        updateQuantity(id, price, Math.max(0, currentQty - 1));
      } else if (qtyAction === 'set' && amount !== undefined) {
        updateQuantity(id, price, Math.max(0, amount));
      } else {
        updateQuantity(id, price, currentQty + 1);
      }
    });

    appRuntime.registerCapability('OPEN_QUICK_VIEW', (action) => {
      setQuickViewProduct(action.payload.product);
    });

    appRuntime.registerCapability('OPEN_REEL', (action) => {
      setActiveReel(action.payload as any);
      setIsReelModalOpen(true);
    });

    appRuntime.registerCapability('NAVIGATE', (action) => {
      console.log('Navigating to', action.payload.destination);
    });

    appRuntime.registerCapability('SELECT_CATEGORY', (action) => {
      const { categoryId } = action.payload;
      setCategories((prev) => 
        prev.map(cat => ({
          ...cat,
          active: cat.id === categoryId
        }))
      );
    });

    appRuntime.registerCapability('CHANGE_FEED_TAB', (action) => {
      setActiveFeedTab(action.payload.tab);
    });

    appRuntime.registerCapability('CLEAR_CART', () => {
      clearCart();
    });

    return appRuntime;
  }, [items, updateQuantity, clearCart]); // We must include hook deps here so closures stay fresh

  const activeCategoryName = categories.find(c => c.active)?.name || 'الكل';

  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchQuery || product.title.toLowerCase().includes(searchQuery.toLowerCase()) || (product.publisher?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategoryName === 'الكل' || (product.publisher?.categoryName || '').includes(activeCategoryName);
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, activeCategoryName]);

  const productCards = filteredProducts.map((product) => (
    <StemProductCard 
      key={product.id} 
      {...product} 
      quantity={items[product.id]?.quantity || 0}
      onAction={runtime.dispatch}
    />
  ));

  // Resolve the page using DataResolver
  useEffect(() => {
    const registry = new QueryRegistry();
    
    // Strict schema registration
    registry.register({
      id: 'query.products',
      paramSchema: z.object({
        limit: z.number().optional(),
        reverse: z.boolean().optional()
      }),
      resultSchema: z.array(z.unknown()) // In a real app we'd validate the product shape
    });

    registry.register({
      id: 'query.reels',
      paramSchema: z.object({
        limit: z.number().optional()
      }),
      resultSchema: z.array(z.unknown())
    });

    registry.register({
      id: 'query.categories',
      paramSchema: z.object({
        parentId: z.string().optional()
      }),
      resultSchema: z.array(z.unknown())
    });

    const resolver = new DataResolver(registry);
    resolver.registerSource(new ReefMockDataSource());

    resolver.resolvePage(homePageSchema).then(resolved => {
      // Small mapping to inject quantity from DummyCart into products, since 
      // dummy-ui-service doesn't know about DummyCart. 
      // We do it here in the composition root so Stems stay pure.
      const hydrated = {
        ...resolved,
        sections: resolved.sections.map(sec => {
          if (sec.type === 'product_shelf' && Array.isArray(sec.props.items)) {
            return {
              ...sec,
              props: {
                ...sec.props,
                items: sec.props.items.map((prod: any) => ({
                  ...prod,
                  quantity: items[prod.id]?.quantity || 0
                }))
              }
            };
          }
          return sec;
        })
      };
      setResolvedPage(hydrated);
    });
  }, [items]);

  const filteredPageData = React.useMemo(() => {
    if (!resolvedPage) return null;
    return {
      ...resolvedPage,
      sections: resolvedPage.sections.filter(sec => {
        if (activeFeedTab === 'all') return true;
        if (activeFeedTab === 'products') return sec.type === 'product_shelf' || sec.type === 'category_bar';
        if (activeFeedTab === 'reels') return sec.type === 'reels_shelf' || sec.type === 'category_bar';
        if (activeFeedTab === 'posts') return sec.type === 'hero_card' || sec.type === 'category_bar';
        return true;
      })
    };
  }, [resolvedPage, activeFeedTab]);

  const renderEmptyState = () => (
    <div className="w-full flex flex-col items-center justify-center py-16 px-4 bg-white/40 backdrop-blur-md rounded-3xl border border-white/50 shadow-sm mt-4">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
        <Search size={32} />
      </div>
      <h3 className="text-lg font-bold text-slate-700 mb-2">لا توجد نتائج مطابقة لبحثك</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm text-center">جرب استخدام كلمات مختلفة أو تصفح الأقسام للعثور على ما تبحث عنه.</p>
      <button 
        onClick={() => { setSearchQuery(''); handleCategorySelect('all'); }} 
        className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all"
      >
        عرض جميع المنتجات
      </button>
    </div>
  );

  const handleCategorySelect = (id: string) => {
    setCategories((prev) => 
      prev.map(cat => ({
        ...cat,
        active: cat.id === id
      }))
    );
  };

  return (
    <main className="min-h-screen bg-[var(--sb-muted)] w-full pb-24" dir="rtl">
        
        {/* ============================================================ */}
        {/* ============================================================ */}
      <div className="flex lg:hidden flex-col relative pt-40">
        
        <MobileHeaderStem 
          onToggleWorlds={() => setIsWorldsOpen(true)} 
          onOpenCart={() => setIsCartOpen(true)}
          onAddressClick={() => setIsAddressModalOpen(true)}
          currentAddress={selectedAddress}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          showBars={showBars}
          activeFeedTab={activeFeedTab}
          onFeedTabChange={(tab) => runtime.dispatch({ type: 'CHANGE_FEED_TAB', payload: { tab: tab as any } })}
          totalItems={totalItems}
          totalPrice={totalPrice}
        />
        <WorldsTrayStem isOpen={isWorldsOpen} onClose={() => setIsWorldsOpen(false)} worlds={dummyWorlds} />
        <MobileCartSheetStem 
          isOpen={isCartOpen} 
          onClose={() => setIsCartOpen(false)} 
          products={products}
          items={items}
          totalItems={totalItems}
          totalPrice={totalPrice}
          onAction={runtime.dispatch}
        />
        
        <section className="mt-2 flex flex-col gap-6 pb-28">
          {productCards.length === 0 ? renderEmptyState() : searchQuery ? (
            <HorizontalShelfStem 
              title="نتائج البحث" 
              actionLabel="" 
              items={productCards} 
            />
          ) : (
            <>
              {/* SDUI Runtime Engine replaces the entire if/else mapping block */}
              {filteredPageData ? (
                <PageEngine pageData={filteredPageData} onAction={runtime.dispatch} />
              ) : (
                <div className="w-full flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
              )}
              
              {/* Infinite Scroll Loader Stub */}
              <div className="w-full flex items-center justify-center py-8">
                <div className="w-10 h-10 rounded-full bg-white/60 shadow-sm flex items-center justify-center border border-white">
                  <Loader2 className="animate-spin text-primary" size={20} />
                </div>
              </div>
            </>
          )}
        </section>
        {!isCartOpen && <BottomNavStem showBars={showBars} />}
      </div>


      {/* Desktop Header Full Width */}
      <DesktopHeaderStem 
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <div className="hidden lg:flex flex-row w-full max-w-[1400px] mx-auto px-6 py-6 gap-6 items-start">
        
        {/* العمود الأيمن (1): شريط الأقسام الجانبي الثابت */}
        <aside className="w-60 shrink-0 sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-none bg-white/40 backdrop-blur-xl rounded-3xl p-4 border border-white/50 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-4">
          
          {/* محدد العناوين */}
          <div className="relative z-20">
            <button 
              onClick={() => setIsAddressModalOpen(true)}
              className="w-full flex items-center justify-between bg-white/80 border border-slate-200/50 p-2.5 rounded-xl hover:bg-white transition-colors text-right"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <MapPin size={16} className="text-primary shrink-0" />
                <span className="text-xs font-semibold text-slate-700 truncate">{selectedAddress}</span>
              </div>
              <ChevronDown size={14} className="text-slate-400 shrink-0" />
            </button>
          </div>

          <div>
            <h3 className="font-bold text-sm text-slate-800 mb-3 px-2">الأقسام</h3>
            <div className="flex flex-col gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex items-center gap-3 p-2 rounded-xl text-xs font-semibold transition-all ${
                    cat.active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden relative shrink-0">
                    {cat.image && <Image alt={cat.name} className="object-cover" fill src={cat.image}/>}
                  </div>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* العمود الأوسط (2): رفوف المنتجات المتدفقة */}
        <main className="flex-1 min-w-0 flex flex-col gap-6">

          {/* رفوف المنتجات والكروت الكبيرة (Hybrid Feed) */}
          <div className="flex flex-col gap-6 pb-8">
            {productCards.length === 0 ? renderEmptyState() : searchQuery ? (
              <HorizontalShelfStem 
                title="نتائج البحث" 
                actionLabel="" 
                items={productCards} 
              />
            ) : (
              <>
                {filteredPageData ? (
                  <PageEngine pageData={filteredPageData} onAction={runtime.dispatch} />
                ) : (
                  <div className="w-full flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                )}
                
                {/* Infinite Scroll Loader Stub */}
                <div className="w-full flex items-center justify-center py-8">
                  <div className="w-10 h-10 rounded-full bg-white/60 shadow-sm flex items-center justify-center border border-white">
                    <Loader2 size={20} className="text-primary animate-spin" />
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        {/* العمود الأيسر (3): سلة المشتريات التفاعلية الثابتة */}
        <DesktopCartSidebar products={products} />

      </div>

      <AddressModalStem 
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        currentAddressTitle={selectedAddress}
        onSelectAddress={(addr: AddressItem) => setSelectedAddress(addr.title)}
      />

      <ReelsEmbedModalStem 
        isOpen={isReelModalOpen}
        onClose={() => { setIsReelModalOpen(false); setActiveReel(null); }}
        reel={activeReel}
      />
      
      {quickViewProduct && (
        <ProductQuickViewStem 
          product={quickViewProduct} 
          onClose={() => setQuickViewProduct(null)} 
          onAction={runtime.dispatch} 
        />
      )}
    </main>
  );
}

export default function TestUIPage() {
  return (
    <DummyCartProvider>
      <TestUIContent />
    </DummyCartProvider>
  );
}
