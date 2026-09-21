export interface NavItemConfig {
  id: string;
  label: string;
  icon: string;
  isHero?: boolean;
  enabled: boolean;
  order: number;
}

export const getBottomNavConfig = (): NavItemConfig[] => {
  return [
    { id: 'home', label: 'الرئيسية', icon: 'Home', enabled: true, order: 1 },
    { id: 'contact', label: 'التواصل', icon: 'MessageCircle', enabled: true, order: 2 },
    { id: 'categories', label: 'الأقسام', icon: 'LayoutGrid', isHero: true, enabled: true, order: 3 },
    { id: 'wallet', label: 'محفظة', icon: 'Wallet', enabled: true, order: 4 },
    { id: 'profile', label: 'ملفي', icon: 'User', enabled: true, order: 5 },
  ].sort((a, b) => a.order - b.order).filter(i => i.enabled);
};

export interface SegmentedTabConfig {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export const getSegmentedFeedTabsConfig = (): SegmentedTabConfig[] => {
  return [
    { id: 'all', label: 'الكل', enabled: true, order: 1 },
    { id: 'products', label: 'المنتجات', enabled: true, order: 2 },
    { id: 'reels', label: 'الريلز', enabled: true, order: 3 },
    { id: 'posts', label: 'المنشورات', enabled: true, order: 4 },
  ].sort((a, b) => a.order - b.order).filter(i => i.enabled);
};
