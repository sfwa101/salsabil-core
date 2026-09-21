'use client';

import React, { useState, useMemo } from 'react';
import { PageEngine } from '@/sdui/engine/PageEngine';
import { UIAction } from '@/sdui/actions/action-contracts';
import { ApplicationRuntime } from '@/sdui/runtime/ApplicationRuntime';
import { DataResolver } from '@/sdui/data/DataResolver';
import { QueryRegistry } from '@/sdui/data/QueryRegistry';
import { DataSource } from '@/sdui/data/DataSource';
import { SDUIPage } from '@/sdui/schema/page.schema';
import { z } from 'zod';

// This is a completely isolated portability test environment.
// It DOES NOT import useDummyCart, Reef context, or Supabase.

// An entirely standalone mock source for portability
class PortabilityMockDataSource implements DataSource {
  id = 'portability-ds';
  async resolve(queryId: string): Promise<unknown> {
    if (queryId === 'query.mock_shelf') {
      return [
        {
          id: 'port-2',
          title: 'Resolved Shelf Item 1',
          price: 45,
          imageUrl: '/dummy2.jpg',
          publisher: { name: 'Agnostic Platform', categoryName: 'Test Category', role: 'merchant' }
        }
      ];
    }
    return [];
  }
}

const PORTABILITY_PAGE_JSON: SDUIPage = {
  id: 'portability_test_page',
  sections: [
    {
      id: 'section_1',
      type: 'hero_card',
      props: {
        id: 'port-1',
        title: 'Portability Product',
        description: 'Testing architectural independence',
        price: 99.99,
        imageUrl: '/dummy.jpg', // Safe dummy
        publisher: { name: 'Agnostic Platform', verified: true }
      }
    },
    {
      id: 'section_2',
      type: 'product_shelf',
      props: {
        title: 'Generic Shelf',
        actionLabel: 'View All',
        items: { $bind: 'query.mock_shelf' }
      }
    }
  ]
};

export default function PortabilityTestPage() {
  const [localCart, setLocalCart] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [resolvedJSON, setResolvedJSON] = useState<SDUIPage | null>(null);

  const runtime = useMemo(() => {
    const appRuntime = new ApplicationRuntime();
    
    appRuntime.registerCapability('ADD_TO_CART', (action) => {
      setLogs(prev => [...prev, `Received Action: ${action.type}`]);
      const { id, amount, action: qtyAction } = action.payload;
      setLocalCart(prev => {
        const currentQty = prev[id] || 0;
        let newQty = currentQty;
        if (qtyAction === 'increment') newQty += 1;
        else if (qtyAction === 'decrement') newQty = Math.max(0, currentQty - 1);
        else if (qtyAction === 'set' && amount !== undefined) newQty = amount;
        return { ...prev, [id]: newQty };
      });
    });

    appRuntime.registerCapability('OPEN_QUICK_VIEW', (action) => {
      setLogs(prev => [...prev, `Received Action: ${action.type} for ${action.payload.product.id}`]);
    });

    return appRuntime;
  }, []);

  // Run resolution completely separate from Reef
  React.useEffect(() => {
    const registry = new QueryRegistry();
    registry.register({
      id: 'query.mock_shelf',
      paramSchema: z.unknown(),
      resultSchema: z.array(z.unknown())
    });

    const resolver = new DataResolver(registry);
    resolver.registerSource(new PortabilityMockDataSource());

    resolver.resolvePage(PORTABILITY_PAGE_JSON).then(resolved => {
      // Local hydration for agnostic cart
      const hydrated = {
        ...resolved,
        sections: resolved.sections.map(sec => {
          if (sec.type === 'product_shelf' && Array.isArray(sec.props.items)) {
            return {
              ...sec,
              props: {
                ...sec.props,
                items: sec.props.items.map((item: any) => ({
                  ...item,
                  quantity: localCart[item.id] || 0
                }))
              }
            };
          }
          return sec;
        })
      };
      setResolvedJSON(hydrated);
    });
  }, [localCart]);

  return (
    <div className="p-8 font-sans max-w-2xl mx-auto border-2 border-dashed border-red-500 rounded-lg">
      <h1 className="text-2xl font-bold mb-4">SDUI Portability Test Environment</h1>
      <p className="mb-4 text-sm text-gray-600">This page runs PageEngine completely isolated from Reef business logic.</p>
      
      <div className="mb-8 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Agnostic Local Cart State:</h2>
        <pre>{JSON.stringify(localCart, null, 2)}</pre>
        <h2 className="font-semibold mt-4 mb-2">Action Logs:</h2>
        <pre>{JSON.stringify(logs.slice(-5), null, 2)}</pre>
      </div>

      <div className="border border-gray-300 rounded overflow-hidden">
        {resolvedJSON ? (
          <PageEngine pageData={resolvedJSON} onAction={runtime.dispatch} />
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </div>
  );
}
