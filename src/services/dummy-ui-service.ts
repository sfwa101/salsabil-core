import { ProductCardStemProps } from '@/types/ui-contracts';

// TODO: منطق حقيقي لاحقاً — البيانات هنا وهمية للعرض فقط.
export function getDummyProducts(): ProductCardStemProps[] {
  return [
    {
      id: 'prod-1',
      title: 'تمر عجوة المدينة',
      price: 120,
      badge: 'best',
      imageUrl: 'https://images.unsplash.com/photo-1589309736404-2e142a2acdf0?w=500&q=80',
      publisher: {
        role: 'admin',
        name: 'ريف المدينة',
        categoryName: 'تمور عضوية'
      }
    },
    {
      id: 'prod-2',
      title: 'عسل سدر بلدي',
      price: 350,
      badge: 'trending',
      imageUrl: 'https://images.unsplash.com/photo-1587049352847-4d4b126a71e1?w=500&q=80',
      publisher: {
        role: 'admin',
        name: 'ريف المدينة',
        categoryName: 'عسل ومشتقاته'
      }
    },
    {
      id: 'prod-3',
      title: 'زيت زيتون بكر',
      price: 85,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80',
      publisher: {
        role: 'merchant',
        name: 'مزرعة الخير',
        categoryName: 'زيوت طبيعية'
      }
    },
    {
      id: 'prod-4',
      title: 'قهوة عربية محمصة',
      price: 45,
      badge: 'new',
      imageUrl: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=500&q=80',
      publisher: {
        role: 'merchant',
        name: 'محمصة الأصيل',
        categoryName: 'قهوة'
      }
    }
  ];
}

export function getDummyCategories() {
  return [
    { id: 'c1', name: 'الكل', active: true },
    { id: 'c2', name: 'تمور', image: 'https://images.unsplash.com/photo-1589309736404-2e142a2acdf0?w=200&q=80' },
    { id: 'c3', name: 'عسل', image: 'https://images.unsplash.com/photo-1587049352847-4d4b126a71e1?w=200&q=80' },
    { id: 'c4', name: 'زيوت', image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&q=80' },
    { id: 'c5', name: 'قهوة', image: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=200&q=80' },
    { id: 'c6', name: 'مكسرات' },
    { id: 'c7', name: 'توابل' },
  ];
}

export interface DummyWorld {
  id: string;
  name: string;
  tag: string;
  active?: boolean;
  iconName?: string;
  imageUrl?: string;
}

export function getDummyWorlds(): DummyWorld[] {
  return [
    {
      id: 'w1',
      name: 'ريف المدينة',
      tag: 'تجزئة وأغذية',
      active: true,
      iconName: 'Store',
      imageUrl: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=150&q=80'
    },
    {
      id: 'w2',
      name: 'أسراب طيبة',
      tag: 'إدارة أملاك',
      iconName: 'Building2',
      imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=150&q=80'
    },
    {
      id: 'w3',
      name: 'الخدمات اللوجستية',
      tag: 'شحن وتوصيل',
      iconName: 'Truck',
    }
  ];
}

export function getDummyUpsells() {
  return [
    {
      id: 'up1',
      title: 'قهوة مختصة',
      price: 65,
      imageUrl: 'https://images.unsplash.com/photo-1559525839-b184a4d698c7?w=200&q=80',
      unit: '250 جم'
    },
    {
      id: 'up2',
      title: 'مكسرات مشكلة',
      price: 120,
      imageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200&q=80',
      unit: '500 جم'
    }
  ];
}

export function getDummyFeedItems() {
  return [
    {
      type: 'hero',
      id: 'f1',
      title: 'طماطم بلدي طازجة من المزرعة',
      description: 'طماطم بلدي مقطوفة اليوم فجراً من مزارعنا بالقصيم. خالية من المبيدات الكيميائية وغنية بالعصارة، مثالية للسلطات والطبخ.',
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80',
      isProduct: true,
      price: 15,
      originalPrice: 20,
      badge: 'طازج اليوم',
      category: { name: 'خضروات', slug: 'vegetables' },
      subCategory: 'مباشرة من المزرعة'
    },
    {
      type: 'shelf',
      title: 'طازج اليوم',
      actionLabel: 'عرض الكل'
    },
    {
      type: 'hero',
      id: 'f2',
      title: 'صدور دجاج بلدي طازجة',
      description: 'صدور دجاج بلدي مبردة، تغذية نباتية 100%، خالية من الهرمونات والمضادات الحيوية. جاهزة للطبخ مباشرة.',
      imageUrl: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800&q=80',
      isProduct: true,
      price: 35,
      category: { name: 'لحوم ودواجن', slug: 'meat' },
      subCategory: 'جزارة ريف'
    },
    {
      type: 'shelf',
      title: 'يُطلب معها عادة'
    },
    {
      type: 'hero',
      id: 'f3',
      title: 'وصفة اليوم: ريزوتو الدجاج بالكريمة والمشروم',
      description: 'وصفة سهلة وسريعة لتحضير طبق ريزوتو إيطالي فاخر في المنزل باستخدام منتجاتنا الطازجة. اضغط لمعرفة المكونات وخطوات التحضير بالتفصيل.',
      imageUrl: 'https://images.unsplash.com/photo-1476124369491-e7addf5db378?w=800&q=80',
      isProduct: false,
      badge: 'وصفة',
      category: { name: 'وصفات', slug: 'recipes' },
      subCategory: 'مطبخ ريف'
    }
  ];
}

export interface DummyReel {
  id: string;
  title: string;
  chefOrSource: string;
  platform: 'youtube' | 'tiktok' | 'facebook' | 'instagram';
  thumbnailUrl: string;
  embedUrl: string;
}

export function getDummyReels(): DummyReel[] {
  return [
    {
      id: 'r1',
      title: 'أسرار تحضير كبسة اللحم',
      chefOrSource: 'الشيف منال',
      platform: 'youtube',
      thumbnailUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=700&fit=crop',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    },
    {
      id: 'r2',
      title: 'حلى سريع في 5 دقائق',
      chefOrSource: 'وصفات سريعة',
      platform: 'tiktok',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=700&fit=crop',
      embedUrl: 'https://www.tiktok.com/embed/v2/123456789'
    },
    {
      id: 'r3',
      title: 'صينية دجاج بالخضار',
      chefOrSource: 'مطبخ ريف',
      platform: 'instagram',
      thumbnailUrl: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&h=700&fit=crop',
      embedUrl: 'https://www.instagram.com/p/123456789/embed'
    },
    {
      id: 'r4',
      title: 'تتبيلة المشاوي السحرية',
      chefOrSource: 'الشيف أبو يوسف',
      platform: 'facebook',
      thumbnailUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=700&fit=crop',
      embedUrl: 'https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/facebook/videos/123456789/'
    }
  ];
}