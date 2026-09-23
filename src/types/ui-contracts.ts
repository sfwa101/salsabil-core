import { UIAction } from '@/sdui/actions/action-contracts';

export interface ProductCardPresentationModel {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  description?: string;
  unit?: string;
  quantity?: number;
  requiresConfiguration: boolean;
  badge?: 'new' | 'trending' | 'best';
  publisher?: {
    role: 'admin' | 'merchant';
    name: string;
    categoryName: string;
  };
}

export interface ProductCardStemProps extends ProductCardPresentationModel {
  onAddToCart?: (id: string) => void;
  onAction?: (action: UIAction) => void;
}
