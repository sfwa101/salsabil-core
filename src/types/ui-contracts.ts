import { UIAction } from '@/sdui/actions/action-contracts';

export interface ProductCardStemProps {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  badge?: 'new' | 'trending' | 'best';
  publisher: { 
    role: 'admin' | 'merchant';
    name: string;
    categoryName: string;
  };
  onAddToCart?: (id: string) => void;
  quantity?: number;
  onAction?: (action: UIAction) => void;
}
