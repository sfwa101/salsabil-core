import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // BAYAN-CLOSEOUT-UI-GAPS: BottomNav.tsx الجديد (fixed bottom-0) يتعارض دائماً مع مؤشر التطوير
  // الافتراضي (bottom-left) — يحجب تبويب "حسابي" عن النقر أثناء التطوير (اكتُشف حياً أثناء التحقق).
  // dev فقط، بلا أثر على production build.
  devIndicators: {
    position: 'top-right',
  },
};

export default nextConfig;
