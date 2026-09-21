import { DataSource } from '@/sdui/data/DataSource';
import { getDummyProducts, getDummyFeedItems, getDummyReels, getDummyCategories } from '@/services/dummy-ui-service';

export class ReefMockDataSource implements DataSource {
  id = 'reef-mock-ds';

  async resolve(queryId: string, params: unknown): Promise<unknown> {
    // In a real app, we'd use params to filter/sort. Here we just return the mock data.
    switch (queryId) {
      case 'query.products': {
        const p = params as { limit?: number };
        const items = getDummyProducts();
        return p.limit ? items.slice(0, p.limit) : items;
      }
      case 'query.categories': {
        // Return dummy categories
        return getDummyCategories();
      }
      case 'query.hero_feed': {
        const p = params as { limit?: number; tab?: string };
        let items = getDummyFeedItems();
        if (p.tab) {
          items = items.filter((item: any) => {
            if (p.tab === 'all') return true;
            if (p.tab === 'products') return item.type === 'shelf';
            if (p.tab === 'reels') return false; 
            if (p.tab === 'posts') return item.type === 'hero';
            return true;
          });
        }
        return p.limit ? items.slice(0, p.limit) : items;
      }
      case 'query.reels': {
        const p = params as { limit?: number };
        const items = getDummyReels();
        return p.limit ? items.slice(0, p.limit) : items;
      }
      default:
        throw new Error(`[ReefMockDataSource] Unsupported query: ${queryId}`);
    }
  }
}
