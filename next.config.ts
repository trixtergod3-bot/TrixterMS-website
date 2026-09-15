import type { NextConfig } from 'next';
import { CANONICAL_SITE_ORIGIN, getSiteConfig, WWW_SITE_HOST_PATTERN } from './lib/site-config.ts';

const site = getSiteConfig();
const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ...(!site.allowIndexing ? [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] : []),
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : "") + "; connect-src 'self'" }
    ] }];
  },
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: WWW_SITE_HOST_PATTERN }],
        destination: `${CANONICAL_SITE_ORIGIN}/:path*`,
        permanent: true,
      },
      { source: '/daily-rankings', destination: '/rankings/daily', permanent: true },
      { source: '/community', destination: '/discord', permanent: true }
    ];
  }
};
export default config;
