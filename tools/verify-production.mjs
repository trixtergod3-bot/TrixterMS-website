import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.PORTAL_QA_URL ?? 'http://127.0.0.1:4316';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'Local candidate only');
const browser = await chromium.launch({channel:process.env.PORTAL_QA_BROWSER ?? 'chrome',headless:true});
const report = {checkedAt:new Date().toISOString(),base,checks:[],errors:[]};
try {
  const page = await browser.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if(message.type()==='error') report.errors.push(message.text()+" "+message.location().url); });
  for (const path of ['/', '/download', '/register', '/rankings', '/achievements', '/database', '/free-market', '/news', '/events', '/discord', '/status']) {
    const response = await page.goto(base+path, {waitUntil:'networkidle'});
    assert.equal(response.status(),200);
    assert.equal(new URL(await page.locator('link[rel="canonical"]').getAttribute('href')).href, 'https://trixterms.com'+(path==='/'?'/':path));
    assert.equal(new URL(await page.locator('meta[property="og:url"]').getAttribute('content')).href, 'https://trixterms.com'+(path==='/'?'/':path));
    assert.match(await page.locator('meta[property="og:image"]').getAttribute('content'), /^https:\/\/trixterms\.com\/art\/trixterms-midnight-world\.webp$/);
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');
    assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'),'/favicon.svg');
    assert.equal(response.headers()['x-robots-tag'],'noindex, nofollow');
    assert.equal(response.headers()['x-content-type-options'],'nosniff');
    assert.match(response.headers()['content-security-policy'], /connect-src 'self'/);
    assert.match(await page.title(), /TRIXTERMS/);
    report.checks.push('canonical, OG, preview indexing, security headers and brand '+path);
  }
  const robots=await page.request.get(base+'/robots.txt');
  assert.equal(robots.status(),200); assert.match(await robots.text(),/Disallow: \//);
  const sitemap=await page.request.get(base+'/sitemap.xml');
  assert.equal(sitemap.status(),200); assert.doesNotMatch(await sitemap.text(),/<loc>/);
  report.checks.push('preview robots disallow all; sitemap has no indexed URLs');
  const alias=await page.request.get(base+'/download?source=www-check',{headers:{host:'www.trixterms.com'},maxRedirects:0});
  assert.equal(alias.status(),308); assert.equal(alias.headers().location,'https://trixterms.com/download?source=www-check');
  const other=await page.request.get(base+'/download',{headers:{host:'preview.example.com'},maxRedirects:0});
  assert.equal(other.status(),200); report.checks.push('exact www redirect preserves path/query; unrelated hosts are not redirected');
  for(const asset of ['/art/trixterms-midnight-world.webp','/favicon.svg']) {
    const response=await page.request.get(base+asset);assert.equal(response.status(),200);report.checks.push('asset '+asset);
  }
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('.hero-play').hover();
  const textColor=await page.locator('.hero-play').evaluate(el=>getComputedStyle(el).color);
  assert.equal(textColor,'rgb(255, 255, 255)');report.checks.push('play hover retains white text');
  await page.keyboard.press('Tab');
  assert.deepEqual(report.errors,[],'Browser console and page errors');
  await mkdir('local/qa',{recursive:true});
  await writeFile('local/qa/production-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({productionChecks:report.checks.length,errors:report.errors.length}));
} finally {await browser.close()}
