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
  //
  // FIX-VERCEL-IMAGE-OPTIMIZATION-402-LIVE-BUG (2026-09-20) — تحقُّق حي على staging.reefam.com أثبت
  // أن `/_next/image` يُرجع 402 `OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` لكل صورة منتج تقريباً (حصة
  // Vercel Image Optimization على الخطة الحالية مستنفَدة) — بينما نفس الروابط تعمل 200 نظيف عند طلبها
  // مباشرة من المصدر (`assets.reefam.com`/`images.kheirzaman.com`). أي منتج تقريباً يظهر بلا صورة على
  // الموقع الحي فعلياً بسبب هذا تحديداً، لا خطأ نطاق. `unoptimized: true` يُلغي تمرير كل الصور عبر
  // محسِّن Vercel مؤقتاً (يبقى `next/image` نفسه، فقط بلا تحويل/تصغير على الخادم) — يُعيد الصور للعمل
  // فوراً بلا أي تعديل على كل مكوّن بطاقة منتج على حدة. **قرار مؤقت**: إعادة تفعيل التحسين لاحقاً
  // يتطلب ترقية خطة Vercel أو نقل الصور لمصدر بلا حصة (مثل Cloudflare Images/R2 مباشرة بلا محسِّن
  // Vercel) — خارج نطاق هذا الإصلاح.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    unoptimized: true,
  },
};

export default nextConfig;
