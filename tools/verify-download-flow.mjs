import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { validateReleaseDownloads } from '../lib/portal/integrations.ts';

const base = process.env.PORTAL_QA_URL ?? 'http://127.0.0.1:4327';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local candidate only');
const metadataPath = process.argv[2];
assert.ok(metadataPath, 'Supply the reviewed release metadata JSON path');
const release = validateReleaseDownloads(JSON.parse(await readFile(metadataPath, 'utf8')));
assert.ok(release?.launcher && release.manifest, 'A published launcher and manifest are required');
const browser = await chromium.launch({ channel: process.env.PORTAL_QA_BROWSER ?? 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), release: release.releaseVersion, sequence: release.manifest.sequence, checks: [], errors: [] };
try {
  for (const width of [1440, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: /^play now$/i }).click();
    await page.waitForURL(base + '/download');
    const download = page.getByRole('link', { name: 'DOWNLOAD FOR WINDOWS', exact: true });
    await download.waitFor({ state: 'visible' });
    assert.equal(await download.count(), 1);
    assert.equal(await download.getAttribute('href'), release.launcher.url);
    assert.ok(await download.isVisible());
    assert.equal(await page.getByRole('link', { name: /Download Full client/i }).count(), 0);
    const main = await page.locator('main').innerText();
    assert.ok(main.includes(release.releaseVersion));
    assert.match(main, /Windows x64/);
    assert.match(main, /click UPDATE/);
    assert.match(main, /PLAY stays disabled/);
    assert.match(main, /native login screen/);
    assert.doesNotMatch(main, /Download the full client and extract/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.getByText('SHA-256 checksum', { exact: true }).click();
    assert.ok((await page.locator('main').innerText()).includes(release.launcher.sha256));
    report.checks.push(`PLAY NOW to exact launcher, metadata, integrity instructions, checksum and no overflow at ${width}px`);
    await page.close();
  }
  assert.deepEqual(report.errors, []);
  await mkdir('local/qa', { recursive: true });
  await writeFile('local/qa/download-flow-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { await browser.close(); }
