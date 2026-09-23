'use client';
// src/app/(reef)/ReelsShelfSDUI.tsx
// DD-024 — نظير RealCatalogShelfSDUI.tsx حرفياً (نفس المجلد، نفس هيكل PageEngine/ApplicationRuntime)
// لكن لريلز الفيديو الحقيقية بدل رف المنتجات. يحل محل SDUIReelsShelf/OPEN_REEL التجريبيين في
// src/app/test-ui/page.tsx (أول استهلاك إنتاجي حقيقي لهما) — نفس اسم نوع المكوّن 'reels_shelf' واسم
// القدرة 'OPEN_REEL' حرفياً، لا يعيد تعريفهما.
//
// راجع docs/salsabil-frontend-integration-pattern.md — لا لمس PageEngine/ApplicationRuntime نفسيهما،
// فقط تسجيل مكوّن + قدرة جديدين هنا (مشروط بـ.has()، القاعدة رقم 4).
//
// OPEN_REEL لا يحتاج جولة خادم (لا تعديل بيانات، فقط فتح نافذة عرض ببيانات مجلوبة مسبقاً) — القدرة
// هنا تُحدِّث حالة محلية فقط، بلا Server Action، بنفس نمط test-ui المرجعي حرفياً (لا OPEN_QUICK_VIEW
// أيضاً هناك يستدعي الخادم).

import { useMemo, useState } from 'react';
import { PageEngine } from '@/sdui/engine/PageEngine';
import { ApplicationRuntime } from '@/sdui/runtime/ApplicationRuntime';
import { componentRegistry } from '@/sdui/registry/component-registry';
import { SDUIComponent } from '@/sdui/contracts/component-contracts';
import type { SDUIPage } from '@/sdui/schema/page.schema';
import { ReelsHorizontalShelfStem } from '@/components/ui/ReelsHorizontalShelfStem';
import { ReelsEmbedModalStem } from '@/components/ui/ReelsEmbedModalStem';
import type { ReelSnapshot } from '@/sdui/actions/action-contracts';
import type { RealReelSnapshot } from './data/ReelsDataSource';

const SDUIReelsShelf: SDUIComponent = ({ props, onAction }) => {
  const items = Array.isArray(props.items) ? (props.items as ReelSnapshot[]) : [];
  return <ReelsHorizontalShelfStem items={items} onReelClick={(reel) => onAction?.({ type: 'OPEN_REEL', payload: reel })} />;
};

if (!componentRegistry.has('reels_shelf')) {
  componentRegistry.register('reels_shelf', SDUIReelsShelf);
}

interface ReelsShelfSDUIProps {
  reels: RealReelSnapshot[];
}

export function ReelsShelfSDUI({ reels }: ReelsShelfSDUIProps) {
  const [activeReel, setActiveReel] = useState<ReelSnapshot | null>(null);
  const [isReelModalOpen, setIsReelModalOpen] = useState(false);

  const runtime = useMemo(() => {
    const appRuntime = new ApplicationRuntime();
    appRuntime.registerCapability('OPEN_REEL', (action) => {
      setActiveReel(action.payload);
      setIsReelModalOpen(true);
    });
    return appRuntime;
  }, []);

  const page = useMemo<SDUIPage>(
    () => ({
      id: 'home_reels_shelf',
      sections: [
        {
          id: 'section_reels_shelf',
          type: 'reels_shelf',
          props: { items: reels },
          visibility: { enabled: true },
        },
      ],
    }),
    [reels]
  );

  if (reels.length === 0) return null;

  return (
    <>
      <PageEngine pageData={page} onAction={runtime.dispatch} />
      <ReelsEmbedModalStem isOpen={isReelModalOpen} onClose={() => setIsReelModalOpen(false)} reel={activeReel} />
    </>
  );
}
