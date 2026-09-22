// src/core/modules/bayan/reel-embed.test.ts
// DD-024 — دالة نقية، بلا تمويه لازم

import { describe, it, expect } from 'vitest';
import { buildReelEmbedUrl } from './reel-embed';

describe('buildReelEmbedUrl', () => {
  it('يبني رابط تضمين يوتيوب من watch?v=', () => {
    expect(buildReelEmbedUrl('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );
  });

  it('يبني رابط تضمين يوتيوب من youtu.be المختصر', () => {
    expect(buildReelEmbedUrl('youtube', 'https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('يبني رابط تضمين يوتيوب من shorts', () => {
    expect(buildReelEmbedUrl('youtube', 'https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(
      'https://www.youtube.com/embed/dQw4w9WgXcQ'
    );
  });

  it('يرجع null ليوتيوب برابط لا يحمل معرّف فيديو', () => {
    expect(buildReelEmbedUrl('youtube', 'https://www.youtube.com/')).toBeNull();
  });

  it('يبني رابط تضمين تيك توك من رابط فيديو كامل', () => {
    expect(buildReelEmbedUrl('tiktok', 'https://www.tiktok.com/@someuser/video/7123456789012345678')).toBe(
      'https://www.tiktok.com/embed/v2/7123456789012345678'
    );
  });

  it('يرجع null لتيك توك برابط بلا معرّف فيديو رقمي', () => {
    expect(buildReelEmbedUrl('tiktok', 'https://www.tiktok.com/@someuser')).toBeNull();
  });

  it('يبني رابط تضمين إنستجرام لنوع reel', () => {
    expect(buildReelEmbedUrl('instagram', 'https://www.instagram.com/reel/CxAbC123xyz/')).toBe(
      'https://www.instagram.com/reel/CxAbC123xyz/embed'
    );
  });

  it('يبني رابط تضمين إنستجرام لنوع p (منشور عادي)', () => {
    expect(buildReelEmbedUrl('instagram', 'https://www.instagram.com/p/CxAbC123xyz/')).toBe(
      'https://www.instagram.com/p/CxAbC123xyz/embed'
    );
  });

  it('يبني رابط تضمين فيسبوك عبر plugin عام (href مُرمَّز)', () => {
    const url = 'https://www.facebook.com/watch/?v=1234567890';
    expect(buildReelEmbedUrl('facebook', url)).toBe(
      `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`
    );
  });

  it('يرجع null لفيسبوك برابط غير صالح', () => {
    expect(buildReelEmbedUrl('facebook', 'not-a-url')).toBeNull();
  });

  it('يرجع null دائماً لمنصة other — لا تضمين حقيقي ممكن اليوم', () => {
    expect(buildReelEmbedUrl('other', 'https://example.com/video')).toBeNull();
  });

  it('يرجع null لمنصة غير معروفة (قيمة video_source خام غير متوقَّعة من DB بلا CHECK)', () => {
    expect(buildReelEmbedUrl('snapchat' as never, 'https://example.com/video')).toBeNull();
  });
});
