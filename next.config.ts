import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // BAYAN-CLOSEOUT-UI-GAPS: BottomNav.tsx الجديد (fixed bottom-0) يتعارض دائماً مع مؤشر التطوير
  // الافتراضي (bottom-left) — يحجب تبويب "حسابي" عن النقر أثناء التطوير (اكتُشف حياً أثناء التحقق).
  // dev فقط، بلا أثر على production build.
  devIndicators: {
    position: 'top-right',
  },
  // COMPLETE-VISUAL-STENCIL-IMPORT-FULL-BATCH-NO-STOPS (بند 1، تشخيص البطء): يفعّل next/image لكل
  // الصور (كانت img خام بلا تحسين — لا WebP/AVIF، لا srcset، لا width/height تمنع CLS). المنتجات
  // اليوم كلها /public محلية (بلا حاجة لأي إعداد)، لكن صور المنشورات (post_media.image_url) تُدخَل
  // كنص URL حر من لوحة إدارة بيان (PostForm.tsx، بلا رفع/تحقق نطاق) — أي https مسموح هنا صراحة
  // ليعمل next/image بلا كسر عند أي مصدر خارجي مستقبلي، بدل حصر نطاقات لا نعرفها مسبقاً.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
