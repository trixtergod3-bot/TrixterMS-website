import assert from 'node:assert/strict';
import test from 'node:test';
import nextConfig from '../next.config.ts';
import {
  CANONICAL_SITE_ORIGIN,
  createRobots,
  createSiteMetadata,
  createSitemap,
  getSiteConfig,
} from '../lib/site-config.ts';

const production = {
  NODE_ENV: 'production',
  TRIXTER_SITE_URL: CANONICAL_SITE_ORIGIN,
  TRIXTER_PUBLIC_LAUNCH: 'true',
};

void test('canonical origin normalizes the www alias without trusting request hosts', () => {
  assert.equal(getSiteConfig({}).origin, CANONICAL_SITE_ORIGIN);
  assert.deepEqual(getSiteConfig(production), { origin: CANONICAL_SITE_ORIGIN, allowIndexing: true });
  assert.deepEqual(getSiteConfig({ ...production, TRIXTER_SITE_URL: 'https://WWW.TRIXTERMS.COM/' }),
    { origin: CANONICAL_SITE_ORIGIN, allowIndexing: true });
  assert.equal(getSiteConfig({ ...production, TRIXTER_SITE_URL: 'https://preview.example.com/' }).allowIndexing, false);
});

void test('invalid production origins fail closed without echoing configured values', () => {
  const credentialOrigin = new URL(CANONICAL_SITE_ORIGIN);
  credentialOrigin.username = 'private-user';
  credentialOrigin.password = 'private-password';
  for (const value of [
    'http://trixterms.com', 'https://localhost', 'http://127.0.0.1:4315',
    'https://[::1]', 'https://192.168.1.2', 'https://website.internal',
    'https://trixterms.com:4315', 'https://trixterms.com/portal',
    'https://trixterms.com?preview=true', 'https://trixterms.com#home',
    'https://trixterms.com?', 'https://trixterms.com#',
    'https://trixterms.com/path/..', 'https:trixterms.com',
    credentialOrigin.href, 'not a URL',
    'https://trixterms.com\\untrusted',
  ]) {
    assert.throws(() => getSiteConfig({ ...production, TRIXTER_SITE_URL: value }), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message.includes(value), false);
      assert.equal(error.message.includes('private-password'), false);
      return true;
    });
  }
});

void test('loopback overrides remain limited to development and test with indexing disabled', () => {
  for (const NODE_ENV of ['development', 'test']) {
    for (const origin of ['http://localhost:4315', 'http://127.0.0.1:4315', 'http://[::1]:4315']) {
      assert.deepEqual(getSiteConfig({ ...production, NODE_ENV, TRIXTER_SITE_URL: origin }),
        { origin, allowIndexing: false });
    }
  }
});

void test('search metadata and discovery routes require an explicit canonical production launch', () => {
  for (const env of [
    {}, { ...production, TRIXTER_PUBLIC_LAUNCH: 'false' },
    { ...production, TRIXTER_PUBLIC_LAUNCH: 'TRUE' },
    { ...production, NODE_ENV: 'development' },
    { ...production, TRIXTER_SITE_URL: 'https://preview.example.com' },
  ]) {
    const config = getSiteConfig(env);
    assert.deepEqual(createSiteMetadata(config).robots, { index: false, follow: false });
    assert.deepEqual(createRobots(config), { rules: { userAgent: '*', disallow: '/' } });
    assert.deepEqual(createSitemap(env), []);
  }
  const metadata = createSiteMetadata(getSiteConfig(production));
  assert.ok(metadata.metadataBase instanceof URL);
  assert.equal(metadata.metadataBase.origin, CANONICAL_SITE_ORIGIN);
  assert.deepEqual(metadata.icons, { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }] });
  assert.equal(metadata.alternates?.canonical, './');
  assert.equal(metadata.openGraph?.url, './');
  assert.deepEqual(metadata.robots, { index: true, follow: true });
  assert.equal(createRobots(getSiteConfig(production)).sitemap, `${CANONICAL_SITE_ORIGIN}/sitemap.xml`);
});

void test('sitemap lists only public canonical pages and respects ranking feature flags', () => {
  const urls = createSitemap(production).map((entry) => entry.url);
  assert.ok(urls.includes(`${CANONICAL_SITE_ORIGIN}/`));
  assert.ok(urls.includes(`${CANONICAL_SITE_ORIGIN}/download`));
  assert.ok(urls.includes(`${CANONICAL_SITE_ORIGIN}/events`));
  assert.equal(new Set(urls).size, urls.length);
  assert.ok(urls.every((url) => new URL(url).origin === CANONICAL_SITE_ORIGIN));
  for (const path of ['/api/', '/character/', '/beta', '/community', '/daily-rankings', '/rankings/daily', '/rankings/weekly']) {
    assert.equal(urls.some((url) => new URL(url).pathname.startsWith(path)), false);
  }
  const enabled = createSitemap({ ...production, TRIXTER_DAILY_RANKINGS_ENABLED: 'true', TRIXTER_WEEKLY_RANKINGS_ENABLED: 'true' });
  assert.ok(enabled.some((entry) => entry.url === `${CANONICAL_SITE_ORIGIN}/rankings/daily`));
  assert.ok(enabled.some((entry) => entry.url === `${CANONICAL_SITE_ORIGIN}/rankings/weekly`));
});

void test('canonical redirect matches only the exact www hostname and retains existing redirects', async () => {
  const redirects = await nextConfig.redirects!();
  const redirect = redirects.find((item) => item.destination.startsWith(CANONICAL_SITE_ORIGIN));
  assert.ok(redirect);
  assert.equal(redirect.source, '/:path*');
  assert.equal(redirect.destination, `${CANONICAL_SITE_ORIGIN}/:path*`);
  assert.equal(redirect.permanent, true);
  assert.equal(redirect.has?.length, 1);
  const host = redirect.has?.[0];
  assert.equal(host?.type, 'host');
  assert.ok(host?.value);
  const matcher = new RegExp(`^${host.value}$`);
  assert.equal(matcher.test('www.trixterms.com'), true);
  for (const name of ['trixterms.com', 'preview.example.com', 'localhost', 'wwwXtrixtermsXcom', 'www.trixterms.com.attacker.example']) {
    assert.equal(matcher.test(name), false);
  }
  assert.ok(redirects.some((item) => item.source === '/daily-rankings' && item.destination === '/rankings/daily'));
  assert.ok(redirects.some((item) => item.source === '/community' && item.destination === '/discord'));
});
