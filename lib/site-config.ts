import { isIP } from 'node:net';
import type { Metadata, MetadataRoute } from 'next';

/** Server/build configuration. Do not import this module from client components. */
export type SiteEnvironment = Record<string, string | undefined>;
export const CANONICAL_SITE_ORIGIN = 'https://trixterms.com';
export const WWW_SITE_HOST_PATTERN = 'www\\.trixterms\\.com';

export interface SiteConfig {
  origin: string;
  allowIndexing: boolean;
}

function invalidOrigin(): never {
  // The configured value could contain pasted credentials; never include it in errors.
  throw new Error('TRIXTER_SITE_URL must be an HTTPS public origin without credentials, a non-default port, a path, a query, or a fragment. Loopback origins are allowed only in development/test.');
}

export function getSiteConfig(env: SiteEnvironment = process.env): SiteConfig {
  const configured = env.TRIXTER_SITE_URL?.trim() || CANONICAL_SITE_ORIGIN;
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    return invalidOrigin();
  }
  for (let index = 0; index < configured.length; index++) {
    const code = configured.charCodeAt(index);
    if (code <= 32 || code === 92) return invalidOrigin();
  }
  if (!/^https?:\/\/[^/?#]+\/?$/i.test(configured)
    || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash) return invalidOrigin();

  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  const allowLocal = env.NODE_ENV === 'development' || env.NODE_ENV === 'test';
  if (local) {
    if (!allowLocal || !['http:', 'https:'].includes(url.protocol)) return invalidOrigin();
  } else {
    const hostname = url.hostname;
    const publicHostname = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(hostname);
    if (url.protocol !== 'https:' || url.port || !publicHostname
      || isIP(hostname) || /\.(?:localhost|local|internal)$/.test(hostname)) return invalidOrigin();
  }

  const origin = url.hostname === 'www.trixterms.com' ? CANONICAL_SITE_ORIGIN : url.origin;
  return {
    origin,
    allowIndexing: env.NODE_ENV === 'production'
      && env.TRIXTER_PUBLIC_LAUNCH === 'true'
      && origin === CANONICAL_SITE_ORIGIN,
  };
}

export function createSiteMetadata(config: SiteConfig = getSiteConfig()): Metadata {
  const title = 'TRIXTERMS — A familiar world. A new adventure.';
  const description = 'An independent GMS v111.1 adventure with classic roots, remastered possibilities, and a new beta chapter. Downloads, rankings, achievements and community.';
  const image = {
    url: '/art/trixterms-midnight-world.webp',
    width: 1536,
    height: 1024,
    alt: 'The original TRIXTERMS midnight world',
  };
  return {
    metadataBase: new URL(config.origin),
    applicationName: 'TRIXTERMS',
    icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }] },
    title: { default: title, template: '%s — TRIXTERMS' },
    description,
    // Next resolves ./ against the current route, avoiding a homepage canonical on every page.
    alternates: { canonical: './' },
    openGraph: {
      type: 'website',
      siteName: 'TRIXTERMS',
      locale: 'en_US',
      url: './',
      title,
      description,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
    robots: { index: config.allowIndexing, follow: config.allowIndexing },
  };
}

export function createRobots(config: SiteConfig = getSiteConfig()): MetadataRoute.Robots {
  if (!config.allowIndexing) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/character/', '/players'] },
    sitemap: `${config.origin}/sitemap.xml`,
  };
}

const publicPages = [
  '/', '/download', '/register', '/rankings', '/achievements', '/database',
  '/free-market', '/vote', '/donate', '/discord', '/news', '/status',
  '/patch-notes', '/classes', '/features', '/guide', '/events',
] as const;

export function createSitemap(env: SiteEnvironment = process.env): MetadataRoute.Sitemap {
  const config = getSiteConfig(env);
  if (!config.allowIndexing) return [];
  const pages: string[] = [...publicPages];
  if (env.TRIXTER_DAILY_RANKINGS_ENABLED === 'true') pages.push('/rankings/daily');
  if (env.TRIXTER_WEEKLY_RANKINGS_ENABLED === 'true') pages.push('/rankings/weekly');
  // Only known public pages: no fabricated character URLs, API endpoints, or patch-host paths.
  return pages.map((path) => ({ url: new URL(path, config.origin).href }));
}
