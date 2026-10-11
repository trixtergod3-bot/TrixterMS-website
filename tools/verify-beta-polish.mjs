import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.PORTAL_QA_URL ?? 'http://127.0.0.1:4328';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local preview only');
await mkdir('local/qa/after', { recursive: true });
const browser = await chromium.launch({ channel: process.env.PORTAL_QA_BROWSER ?? 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), base, checks: [], performance: [], errors: [] };
try {
  for (const width of [1440, 1024, 768, 390, 320]) {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => {
      window.portalMetrics = { lcp: null, cls: 0 };
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.portalMetrics.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.portalMetrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' || (message.type() === 'warning' && /Image with src/.test(message.text()))) report.errors.push(message.text()); });
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator('.beta-feature').count(), 6);
    assert.equal(await page.locator('h1').innerText(), 'TRIXTERMS');
    assert.match(await page.locator('.account-panel-body').innerText(), /Registration is currently unavailable/);
    assert.match(await page.locator('.server-state').innerText(), /Status unavailable/);
    assert.equal(await page.locator('.world-dot.online').count(), 0);
    assert.equal(await page.locator('.hero-play').getAttribute('href'), '/download');
    assert.equal(await page.locator('.hero-buttons a').nth(1).getAttribute('href'), '/register');
    const hero = await page.locator('.midnight-world img').evaluate(img => ({ source: img.currentSrc, loaded: img.complete && img.naturalWidth > 0 }));
    assert.equal(hero.loaded, true);
    assert.equal(hero.source.includes('midnight-mobile'), width <= 640);
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const resources = performance.getEntriesByType('resource');
      return { ...window.portalMetrics, domContentLoadedMs: navigation.domContentLoadedEventEnd, transferredBytes: resources.reduce((sum, entry) => sum + entry.transferSize, 0), externalResources: resources.filter(entry => new URL(entry.name).origin !== location.origin).map(entry => entry.name) };
    });
    assert.deepEqual(metrics.externalResources, [], 'No third-party fonts, tracking or asset requests');
    assert.ok(metrics.cls < 0.1, 'Homepage layout stability at ' + width);
    report.performance.push({ width, ...metrics });
    await page.screenshot({ path: `local/qa/after/home-first-screen-${width}.png` });
    await page.screenshot({ path: `local/qa/after/home-${width}.png`, fullPage: true });
    await page.locator('.home-features').screenshot({ path: `local/qa/after/features-section-${width}.png` });
    if (width <= 1024) {
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Features', exact: true }).focus();
      await page.keyboard.press('Escape');
      assert.equal(await page.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded'), 'false');
      assert.equal(await page.getByRole('button', { name: 'Open menu' }).evaluate(el => el === document.activeElement), true);
      await page.getByRole('button', { name: 'Open menu' }).click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'FAQ', exact: true }).click();
      await page.waitForURL('**/guide#faq');
      assert.equal(await page.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded'), 'false');
    } else {
      await page.locator('.portal-more summary').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.portal-more').getAttribute('open'), null);
      await page.goto(base + '/guide#faq', { waitUntil: 'networkidle' });
    }
    const question = page.locator('.faq-list summary').first();
    await question.focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.faq-list details').first().evaluate(el => el.open), true);
    assert.match(await page.locator('.faq-list details').first().innerText(), /not a public release/);
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.faq-list details').first().evaluate(el => el.open), false);
    for (const route of ['/features', '/classes', '/guide', '/download', '/register']) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, route + ' overflow at ' + width);
      if (route === '/register') {
        assert.equal(await page.locator('fieldset').evaluate(el => el.disabled), true);
        assert.equal(await page.getByLabel('Account ID', { exact: true }).isDisabled(), true);
        assert.equal(await page.locator('button[type="submit"]').isDisabled(), true);
      }
      if (route === '/features') {
        assert.match(await page.locator('#arcane-river').innerText(), /In development[\s\S]*Not publicly released/);
        assert.equal(await page.locator('#cubing').count(), 1);
      }
      if (route === '/classes') assert.match(await page.locator('#cygnus-remasters').innerText(), /IN TESTING/);
      await page.screenshot({ path: `local/qa/after/${route.slice(1)}-${width}.png`, fullPage: true });
    }
    report.checks.push('Six truthful spotlights; artwork; unavailable services; menu Escape/focus; FAQ keyboard; five supporting routes at ' + width);
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  await writeFile('local/qa/beta-polish-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
