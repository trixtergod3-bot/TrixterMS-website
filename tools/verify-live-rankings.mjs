import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';

// Safe browser fixtures exercise the website only. This is not authoritative database verification.
const base = process.env.PORTAL_QA_URL ?? 'http://127.0.0.1:4315';
if (!['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) throw new Error('QA must target loopback');
const browser = await chromium.launch({ channel: process.env.PORTAL_QA_BROWSER ?? 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), base, source: 'intercepted public browser fixtures', checks: [], requests: [], pageErrors: [] };

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  await page.clock.install();
  let mode = 'live';
  let beginnerLevel = 1;
  let releaseRequest;
  let holdRequest = true;
  await page.route('**/api/public/rankings?**', async (route) => {
    const url = new URL(route.request().url());
    const currentPage = Number(url.searchParams.get('page') ?? 1);
    const pageSize = Number(url.searchParams.get('limit') ?? 50);
    report.requests.push({ page: currentPage, pageSize, sort: url.searchParams.get('sort'), job: url.searchParams.get('job'), class: url.searchParams.get('class') });
    if (holdRequest) await new Promise((resolve) => { releaseRequest = resolve; });
    if (mode === 'outage') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'unavailable', data: null, asOf: null, source: 'none', message: 'Fixture outage' }) });
    if (mode === 'malformed') return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    const total = mode === 'empty' ? 0 : 51;
    const entries = mode === 'empty' ? [] : Array.from({ length: currentPage === 1 ? 50 : 1 }, (_, index) => {
      const rank = (currentPage - 1) * pageSize + index + 1;
      return {
        rank, name: rank === 1 ? 'PortalAvenger' : rank === 2 ? '[GM]Test' : rank === 50 ? 'PortalNewbie' : `Portal${rank}`,
        level: rank === 50 ? beginnerLevel : Math.max(1, 201 - rank),
        exp: rank === 50 ? (beginnerLevel === 1 ? '0' : '99') : '300',
        jobId: rank <= 2 ? 122 : 0,
        jobName: rank === 1 ? 'Demon Avenger' : rank === 2 ? 'Paladin' : 'Beginner',
        fame: rank === 1 ? 100 : 0,
        guildName: rank <= 2 ? 'PortalGuild' : null,
        score: null,
      };
    });
    const asOf = await page.evaluate(() => new Date().toISOString());
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: mode === 'stale' ? 'stale' : 'live', source: 'backend', message: '', asOf, data: { entries, total, page: currentPage, pageSize } }) });
  });

  await page.goto(base + '/rankings', { waitUntil: 'domcontentloaded' });
  // A configured SSR backend may already have rows; explicitly refresh in that case.
  const initialRefresh = page.getByRole('button', { name: 'Refresh', exact: true });
  if (await initialRefresh.count() && await initialRefresh.isEnabled()) await initialRefresh.click();
  await expect.poll(() => Boolean(releaseRequest)).toBe(true);
  await expect(page.getByRole('button', { name: 'Refreshing…', exact: true })).toBeDisabled();
  holdRequest = false;
  releaseRequest();
  await expect(page.locator('table tbody tr')).toHaveCount(50);
  await expect(page.getByText('51 characters · Showing 1–50', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '[GM]Test', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '[GM]Test', exact: true })).toHaveCount(0);
  await expect(page.locator('table tbody tr').filter({ hasText: 'PortalNewbie' }).locator('[data-label="Level"]')).toHaveText('1');
  await expect(page.locator('time[datetime]').filter({ hasText: 'Updated' })).toBeVisible();
  report.checks.push('Loading, 50 rows, total count, Level 1, class/guild/fame, safe non-alphanumeric name, update age');

  // A retained element must remain attached during a poll and an unavailable response.
  const firstRow = await page.locator('table tbody tr').first().elementHandle();
  const callsBefore = report.requests.length;
  mode = 'outage';
  await page.clock.fastForward(21_000);
  await expect.poll(() => report.requests.length).toBeGreaterThan(callsBefore);
  await expect(page.getByRole('status')).toContainText('Stale data · refresh unavailable · showing the last update');
  assert.equal(await firstRow.evaluate((element) => element.isConnected), true);
  await expect(page.locator('table tbody tr')).toHaveCount(50);
  report.checks.push('Automatic 20-second poll, outage indication, last successful rows retained without replacement/flicker');

  mode = 'live';
  beginnerLevel = 10;
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Live public data');
  await expect(page.locator('table tbody tr').filter({ hasText: 'PortalNewbie' }).locator('[data-label="Level"]')).toHaveText('10');
  assert.equal(await firstRow.evaluate((element) => element.isConnected), true);
  report.checks.push('Recovery updates level and retains stable character rows');

  mode = 'malformed';
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('refresh unavailable');
  await expect(page.locator('table tbody tr')).toHaveCount(50);
  mode = 'live';
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Live public data');
  report.checks.push('Malformed response is handled as an outage');

  mode = 'stale';
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Stale data · showing the last update');
  await expect(page.locator('table tbody tr')).toHaveCount(50);
  mode = 'outage';
  await page.clock.fastForward(121_000);
  await expect(page.locator('table tbody tr')).toHaveCount(0);
  await expect(page.getByRole('status')).not.toContainText('Live public data');
  report.checks.push('Explicit API stale response is labeled; retained rows expire after two minutes');
  mode = 'live';
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Live public data');

  await mkdir('local/qa/live-rankings', { recursive: true });
  await page.screenshot({ path: 'local/qa/live-rankings/desktop.png', fullPage: false });
  await page.locator('table tbody tr').first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'local/qa/live-rankings/desktop-table.png', fullPage: false });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Page overflow at ${width}px`);
    for (const label of ['Rank', 'Character', 'Class', 'Level', 'Guild', 'Fame']) await expect(page.locator(`table tbody tr:first-child [data-label="${label}"]`)).toBeVisible();
    await page.locator('table tbody tr').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: `local/qa/live-rankings/mobile-${width}.png`, fullPage: false });
  }
  report.checks.push('All six fields visible at 390px and 320px without horizontal page overflow');

  await page.getByRole('navigation', { name: 'Ranking pages' }).getByRole('link', { name: 'Next', exact: true }).click();
  await page.waitForURL('**/rankings?**page=2**');
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  await expect(page.locator('table tbody [data-label="Rank"]')).toHaveText('51');
  await expect(page.getByText('51 characters · Showing 51–51', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Ranking pages' }).getByRole('link', { name: 'Next', exact: true })).toHaveCount(0);
  report.checks.push('Pagination fetches page 2 and uses API ranks/total');

  for (const identity of ['demon-avenger', 'paladin']) {
    await page.getByRole('combobox', { name: 'Class', exact: true }).selectOption(identity);
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await page.waitForURL((url) => url.searchParams.get('class') === identity && url.searchParams.get('page') === '1');
    await expect.poll(() => report.requests.at(-1)?.class).toBe(identity);
    assert.equal(report.requests.at(-1).job, null);
  }
  await page.getByRole('combobox', { name: 'Class', exact: true }).selectOption('3112');
  await page.getByRole('combobox', { name: 'Rank by', exact: true }).selectOption('fame');
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get('job') === '3112' && url.searchParams.get('sort') === 'fame');
  await expect.poll(() => report.requests.at(-1)?.job).toBe('3112');
  assert.equal(report.requests.at(-1).class, null);
  report.checks.push('DA/Paladin identities remain separate, raw Demon Slayer job and fame filters preserved, filter resets pagination');

  mode = 'empty';
  await expect(page.getByRole('button', { name: 'Refresh', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByText('No characters match this class yet. Try viewing all classes.', { exact: true })).toBeVisible();
  await expect(page.locator('table tbody tr')).toHaveCount(0);
  mode = 'outage';
  await page.goto(base + '/rankings?page=3', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'The standings are temporarily unavailable.' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Data unavailable');
  report.checks.push('Empty result and initial unavailable states remain usable');
  assert.deepEqual(report.pageErrors, []);
  await writeFile('local/qa/live-rankings/report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checks: report.checks, requests: report.requests.length, pageErrors: report.pageErrors }, null, 2));
} finally {
  await browser.close();
}
