// src/app/(reef)/data/ReelsDataSource.ts
// DD-024 — نظير RealCatalogDataSource.ts حرفياً (نفس المجلد، نفس نمط DataSource) لكن يقرأ منشورات
// post_type='reel' الحقيقية من bayanService بدل بيانات وهمية (DummyReel/MOCK_REELS في test-ui).
//
// ⚠️ حدود متعمَّدة (نفس أسلوب RealCatalogDataSource — راجع تعليقه هناك للمبرر الكامل):
// - يستهلك bayanService (طبقة الخدمة) لا bayanRepository مباشرة.
// - يُستهلَك حصراً من مكوّن خادم (Server Component، page.tsx) — bayanService يستورد supabaseAdmin
//   عبر bayanRepository (server-only فعلياً).
// - يبني شكل ReelSnapshot (id/title/chefOrSource/platform/thumbnailUrl/embedUrl، نفس DummyReel
//   البنيوي) بنفسه هنا، لا في bayan.service.ts — bayan.service.ts يبقى مستقلاً عن أشكال عرض SDUI
//   (لا يستورد من src/sdui/*)، هذا الملف (طبقة app/تكامل) هو من يعرف كلا الطرفين.
// - أي منشور reel يفتقر videoUrl/videoSource/صورة مصغّرة (post_media[0])/رابط تضمين قابل للاستخراج
//   (buildReelEmbedUrl) يُستبعَد بالكامل من النتيجة — لا بيانات وهمية بديلة، لا iframe مكسور.

import { DataSource } from '@/sdui/data/DataSource';
import { bayanService } from '@/core/modules/bayan/bayan.service';
import { catalogService } from '@/core/modules/catalog/catalog.service';
import { buildReelEmbedUrl } from '@/core/modules/bayan/reel-embed';

export interface RealReelSnapshot {
  id: string;
  title: string;
  chefOrSource: string;
  platform: string;
  thumbnailUrl: string;
  embedUrl: string;
}

export class ReelsDataSource implements DataSource {
  id = 'reels-ds';

  async resolve(queryId: string, params: unknown): Promise<unknown> {
    switch (queryId) {
      case 'query.reels_feed': {
        const p = params as { limit?: number };
        // categories: لا حقل "شيف/مصدر" مخصَّص على posts (لا سابقة له، راجع DD-024 → Phase 0) — اسم
        // القسم الحقيقي المرتبط بالمنشور يُستخدَم بدلاً منه لتسمية "المصدر" (chefOrSource)، بدل قيمة
        // مُختلَقة. جلب مستقل هنا (لا اعتماد على categories المجلوبة أصلاً في page.tsx لخلاصة بيان
        // العادية) — نفس استقلالية RealCatalogDataSource عن بقية Promise.all في page.tsx، يسمح
        // بتشغيل resolveReelsFeed بالتوازي الكامل بلا تسلسل بينهما.
        const [feed, categories] = await Promise.all([
          bayanService.listFeed({ postTypes: ['reel'], limit: p.limit ?? 10 }),
          catalogService.listCategories(),
        ]);

        const reels: RealReelSnapshot[] = [];
        for (const post of feed.posts) {
          if (post.postType !== 'reel' || !post.videoUrl || !post.videoSource) continue;
          const embedUrl = buildReelEmbedUrl(post.videoSource, post.videoUrl);
          const thumbnailUrl = post.media[0]?.imageUrl;
          if (!embedUrl || !thumbnailUrl) continue;

          const category = categories.find((c) => c.id === post.categoryId);
          reels.push({
            id: post.id,
            title: post.caption ?? '',
            chefOrSource: category?.name ?? '',
            platform: post.videoSource,
            thumbnailUrl,
            embedUrl,
          });
        }
        return reels;
      }
      default:
        throw new Error(`[ReelsDataSource] Unsupported query: ${queryId}`);
    }
  }
}
