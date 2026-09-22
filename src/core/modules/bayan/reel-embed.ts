// src/core/modules/bayan/reel-embed.ts
// DD-024 — يحوّل رابط فيديو خارجي (كما يُدخله الأدمن، أي شكل شائع للرابط) إلى رابط iframe قابل
// للتضمين المباشر (embed) بلا مفتاح/اعتماد API خارجي — أنماط iframe العامة الموثَّقة لكل منصة (لا
// react-player، لا Meta Graph API oEmbed الذي يحتاج App Token — راجع DD-024 → Reason). دالة نقية،
// بلا اتصال شبكة، ترجع null عند تعذّر الاستخراج بدل رمي أو تخمين رابط قد لا يعمل.
//
// ⚠️ هذه أنماط iframe عامة معروفة (لا توثيق رسمي مضمون الاستقرار من كل منصة) — لو غيّرت إحدى المنصات
// بنية رابطها العام مستقبلاً، هذا يتعطل بصمت (يُستبعَد الريل من الخلاصة، لا خطأ حي) لا بخطأ صريح.
// مقبول لنطاق هذه الدفعة (Fast-Track، DD-024) — خطر متبقٍ منخفض (محتوى عرض لا معاملة مالية)، يُسجَّل
// هنا صراحة بدل دفنه.

import type { VideoSource } from './types';

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{6,})/,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function extractTikTokId(url: string): string | null {
  const match = url.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/) ?? url.match(/tiktok\.com\/embed\/v2\/(\d+)/);
  return match ? match[1] : null;
}

function extractInstagramRef(url: string): { type: string; shortcode: string } | null {
  const match = url.match(/instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return match ? { type: match[1], shortcode: match[2] } : null;
}

/**
 * يبني رابط iframe قابلاً للتضمين المباشر من رابط الفيديو الخام + المنصة المُختارة عند الإنشاء
 * (video_source، إدخال أدمن صريح — لا تخمين تلقائي من شكل الرابط). يرجع null لو تعذّر استخراج
 * معرّف الفيديو (رابط غير متوقَّع الشكل) أو كانت المنصة 'other'/غير معروفة — لا رابط وهمي أبداً.
 */
export function buildReelEmbedUrl(source: VideoSource | string, url: string): string | null {
  switch (source) {
    case 'youtube': {
      const id = extractYouTubeId(url);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    case 'tiktok': {
      const id = extractTikTokId(url);
      return id ? `https://www.tiktok.com/embed/v2/${id}` : null;
    }
    case 'instagram': {
      const ref = extractInstagramRef(url);
      return ref ? `https://www.instagram.com/${ref.type}/${ref.shortcode}/embed` : null;
    }
    case 'facebook': {
      try {
        const parsed = new URL(url); // تحقق شكل الرابط فقط قبل تمريره للـplugin العام
        if (parsed.protocol !== 'https:') return null;
      } catch {
        return null;
      }
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`;
    }
    default:
      return null;
  }
}
