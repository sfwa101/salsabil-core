// VERTICAL-SLICE-1-HEADER-BOTTOMNAV-INTEGRATION (2026-09-22) — أُضيف `href`/`comingSoon` (كانا
// غائبين تماماً: BottomNavStem.tsx كان يُصيِّر href="#" ثابتاً لكل بند بصرف النظر عن المحتوى هنا).
// القيم مطابقة حرفياً لما كان موجوداً فعلاً في src/components/BottomNav.tsx (NAV_ITEMS) —
// لا وجهات جديدة، فقط نقل نفس الوجهات الحقيقية إلى هذا الملف المشترك الذي يقرأه BottomNavStem الآن.
export interface NavItemConfig {
  id: string;
  label: string;
  icon: string;
  isHero?: boolean;
  enabled: boolean;
  order: number;
  href?: string;
  comingSoon?: boolean;
}

export const getBottomNavConfig = (): NavItemConfig[] => {
  return [
    { id: 'home', label: 'الرئيسية', icon: 'Home', enabled: true, order: 1, href: '/' },
    { id: 'contact', label: 'التواصل', icon: 'MessageCircle', enabled: true, order: 2, comingSoon: true },
    { id: 'categories', label: 'الأقسام', icon: 'LayoutGrid', isHero: true, enabled: true, order: 3, href: '/categories' },
    { id: 'wallet', label: 'محفظة', icon: 'Wallet', enabled: true, order: 4, comingSoon: true },
    { id: 'profile', label: 'ملفي', icon: 'User', enabled: true, order: 5, href: '/account' },
  ].sort((a, b) => a.order - b.order).filter(i => i.enabled);
};

export interface SegmentedTabConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

// "الريلز" أُزيل عمداً (كان موجوداً هنا قبل هذه المهمة) — src/components/Header.tsx يستثنيه صراحة من
// تبويباته الحقيقية بنفس التبرير الموثَّق هناك: لا عمود فيديو في post_media (image_url فقط،
// docs/DATABASE.md §3)، لا بيانات ريلز حقيقية موجودة أصلاً اليوم. تبويب هنا بلا بيانات خلفه يُعيد نفس
// الفجوة التي أُغلِقت سابقاً في Header.tsx — لا يُعاد إلا عند وجود مصدر فيديو حقيقي فعلياً.
export const getSegmentedFeedTabsConfig = (): SegmentedTabConfig[] => {
  return [
    { id: 'all', label: 'الكل', enabled: true, order: 1 },
    { id: 'products', label: 'المنتجات', enabled: true, order: 2 },
    { id: 'posts', label: 'المنشورات', enabled: true, order: 3 },
  ].sort((a, b) => a.order - b.order).filter(i => i.enabled);
};
