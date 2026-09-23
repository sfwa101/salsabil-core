import { describe, expect, it } from 'vitest';
import nextConfig from './next.config';

// FIX-CLOUDFLARE-DIRECT-IMAGE-DELIVERY (2026-09-23): production usage showed Vercel Image
// Optimization quota exhausted (transformations + cache writes) because every Cloudflare-hosted
// product/media image was being proxied through `/_next/image`. `images.unoptimized: true` is the
// fix — verified against next/dist/shared/lib/get-img-props.js that `config.unoptimized` forces
// `unoptimized = true` unconditionally for every next/image instance, with no per-component way to
// opt back into the Vercel optimizer. This test guards against that flag being silently reverted.
describe('next.config images', () => {
  it('disables Vercel Image Optimization for every next/image instance (Cloudflare CDN bypass)', () => {
    expect(nextConfig.images?.unoptimized).toBe(true);
  });

  it('still declares remotePatterns for documentation/future-optimizer-reactivation purposes', () => {
    expect(nextConfig.images?.remotePatterns).toBeDefined();
    expect(nextConfig.images?.remotePatterns?.length).toBeGreaterThan(0);
  });
});
