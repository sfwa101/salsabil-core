// src/components/Header.tsx
// شريط علوي موحّد لكل صفحات (reef) — محايد لونياً بالكامل (توكنز دلالية فقط).
// مكوّن خادم ذاتي الجلب (نفس نمط بقية صفحات المشروع) — لا 'use client'، لا تفاعل يتطلب جافاسكربت.
//
// CREATE-DESIGN-CONSTITUTION-AND-HOME-FEED-PHASE-01 (الجزء 2): إعادة بناء كاملة لبنية ثلاثة مستويات
// أفقية في صف واحد — يمين: مبدّل العوالم (WorldSwitcher.tsx، دمج بصري فقط، بلا تعديل منطقي)، وسط:
// "ريف المدينة" + عنوان التوصيل تحته مباشرة (DeliveryAddressButton.tsx، مستخرَج من FeedTopBar.tsx
// المحذوف في هذه المهمة نفسها). مباشرة تحت هذا الصف، بلا فراغ: HeaderSearchBar.tsx (أصبح ظاهراً
// دائماً، لا lg فقط).
//
// FeedTopBar.tsx (كان يحمل مبدّل العوالم + عنوان التوصيل + زر باركود "قريباً" + زر بحث موبايل مكرر)
// حُذف بالكامل — كل مسؤولياته الحقيقية (عالم + عنوان) انتقلت هنا، زر الباركود (بلا وظيفة فعلية أصلاً)
// أُسقط، وزر البحث المكرر لم يعد ضرورياً بعد أن أصبح HeaderSearchBar ظاهراً دائماً.
//
// FIX-STALE-PRODUCT-REFS-PERFORMANCE-AND-CATEGORY-VISUALS (الجزء 5) — كبسولة السلة (CartCapsule.tsx)
// خرجت من هذا الصف بالكامل — أصبحت عنصراً عائماً مستقلاً (ReefLayout في layout.tsx) لا يختفي مع
// الهيدر عند التمرير للأسفل. الفراغ الذي تركته على اليسار هنا مقصود ومطابق بصرياً — الكبسولة العائمة
// تتموضع في نفس الإحداثيات تماماً (نفس max-width/padding)، فتبدو جزءاً من هذا الصف عند ظهور الهيدر.

import Link from 'next/link';
import { ShoppingCart, User, Home, ShoppingBag, Newspaper, Wallet, Headset, ChevronDown } from 'lucide-react';
import { HeaderSearchBar } from './HeaderSearchBar';
import { DeliveryAddressButton } from './DeliveryAddressButton';
import { CartCapsule } from './CartCapsule';

// TASK-04 — تبويب "ريلز" أُزيل من هنا عمداً (لا يظهر للمستخدم إطلاقاً): لا عمود فيديو في post_media
// (image_url فقط، docs/DATABASE.md §3) ولا أي حقل فيديو في PostMedia (bayan/types.ts) — بيانات
// الريلز الحقيقية غير موجودة أصلاً اليوم، لا مجرد تحويل بيانات ناقص. راجع Task Report لمعيار القرار
// الكامل (§3.2 من موجّه المهمة). يُعاد التبويب هنا فقط عند وجود مصدر فيديو حقيقي فعلياً.
const tabs = [
  { id: 'all', label: 'الكل', href: '/?tab=all', isActive: true },
  { id: 'products', label: 'المنتجات', href: '/?tab=products', isActive: false },
  { id: 'posts', label: 'منشورات', href: '/?tab=posts', isActive: false }
];

function getTabIcon(id: string) {
  switch (id) {
    case 'all': return <Home size={26} />;
    case 'products': return <ShoppingBag size={26} />;
    case 'posts': return <Newspaper size={26} />;
    default: return <Home size={26} />;
  }
}

export async function Header() {
  return (
    <header className="lg:sticky lg:top-0 z-50 bg-card shadow-sm border-b border-border">
      
      {/* === DESKTOP HEADER (Facebook Style) === */}
        <div className="hidden lg:flex relative mx-auto h-14 max-w-[1340px] items-center justify-between px-4">
          
          {/* Right: Logo & Search */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold leading-none text-primary-foreground">
              ر
            </Link>
            <div className="w-72">
              <HeaderSearchBar />
            </div>
          </div>

          {/* Center: Dynamic Icon Tabs */}
          <div className="absolute left-1/2 -translate-x-1/2 flex h-full items-center justify-center">
            <div className="flex gap-2 h-full">
              {tabs.map(tab => (
                <Link
                  key={tab.id}
                  href={tab.href}
                  title={tab.label}
                  className={`flex items-center justify-center w-[110px] h-full transition-colors hover:bg-muted/50 rounded-xl my-1 relative ${
                    tab.isActive 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {getTabIcon(tab.id)}
                  {tab.isActive && (
                    <span className="absolute bottom-[-4px] left-0 right-0 h-1 bg-primary rounded-t-md"></span>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* Left: Desktop Icons (Wallet, Support, Profile) */}
          <div className="flex justify-end items-center gap-2 shrink-0">
            <button className="p-2.5 bg-muted/50 text-foreground transition-colors rounded-full hover:bg-muted" title="محفظة تيسير">
              <Wallet size={22} />
            </button>
            <button className="p-2.5 bg-muted/50 text-foreground transition-colors rounded-full hover:bg-muted" title="الدعم والتواصل">
              <Headset size={22} />
            </button>
            <Link href="/account" className="p-2.5 bg-muted/50 text-foreground transition-colors rounded-full hover:bg-muted" title="حسابي">
              <User size={22} />
            </Link>
          </div>
        </div>

        {/* === MOBILE HEADER (Lovable Style) === */}
        <div className="flex flex-col lg:hidden px-4 py-3 gap-3">
          {/* Row 1: Cart (Left), Center Text, Logo (Right) */}
          <div className="flex items-center justify-between">
            {/* Right (Start in RTL): Logo */}
            <div className="shrink-0 flex justify-start">
              <Link href="/" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold leading-none text-primary-foreground">
                ر
              </Link>
            </div>
            
            {/* Center: Title & Address */}
            <div className="flex flex-col items-center justify-center flex-1 text-center min-w-0 px-2">
              <Link href="/" className="text-sm font-bold text-foreground truncate">ريف المدينة</Link>
              <div className="mt-0.5">
                <DeliveryAddressButton />
              </div>
            </div>

            {/* Left (End in RTL): Cart Capsule */}
            <div className="shrink-0 flex justify-end">
              <CartCapsule />
            </div>
          </div>

          {/* Row 2: Search */}
          <HeaderSearchBar />
          
          {/* Row 3: Tab Pills */}
          <div className="flex gap-2 overflow-x-auto justify-start no-scrollbar pb-1">
            {tabs.map(tab => (
              <Link
                key={tab.id}
                href={tab.href}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  tab.isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

    </header>
  );
}
