import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base=process.env.PORTAL_QA_URL??'http://127.0.0.1:4316';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('QA must target loopback');
const routes=['/','/download','/register','/rankings','/rankings/daily','/rankings/weekly','/achievements','/database','/free-market','/vote','/donate','/discord','/news','/character/PortalTest','/status','/classes','/features','/guide','/patch-notes','/players','/events','/boss-records','/live-world','/database/rare-drops'];
const screenshots=new Set(['/','/achievements','/download','/register','/rankings','/database','/free-market']);
await mkdir('local/qa',{recursive:true});
const browser=await chromium.launch({channel:process.env.PORTAL_QA_BROWSER??'chrome',headless:true});
const report={checkedAt:new Date().toISOString(),base,routes:[],links:[],errors:[],interactions:[]};
try{
 const linkSet=new Set();
 for(const width of [1440,1024,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  for(const route of routes){
   const response=await page.goto(base+route,{waitUntil:'networkidle'});
   assert.equal(response.status(),200,route+' HTTP');
   assert.equal(await page.locator('h1').count(),1,route+' exactly one h1');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,route+' overflows at '+width);
   const brokenImages=await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')));
   assert.deepEqual(brokenImages,[],route+' broken images');
   const hrefs=await page.locator('a[href]').evaluateAll(links=>links.map(l=>l.getAttribute('href')));
   hrefs.filter(h=>h?.startsWith('/')&&!h.startsWith('//')).forEach(h=>linkSet.add(h));
   report.routes.push({route,width,status:response.status(),overflow});
   if(screenshots.has(route)&&[1440,390].includes(width))await page.screenshot({path:'local/qa/'+(route==='/'?'home':route.slice(1).replaceAll('/','-'))+'-'+width+'.png',fullPage:true});
  }
  if(width===390){await page.goto(base);await page.getByRole('button',{name:'Open menu'}).click();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Achievements',exact:true}).click();await page.waitForURL('**/achievements');assert.equal(await page.getByRole('button',{name:'Open menu'}).count(),1);report.interactions.push('mobile navigation opens, routes, closes');}
  await context.close();
 }
 const page=await browser.newPage();
 for(const href of linkSet){const url=new URL(href,base);const response=await page.goto(url.href,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,'Broken internal link '+href);if(url.hash){const exists=await page.evaluate(id=>!!document.getElementById(id),decodeURIComponent(url.hash.slice(1)));assert.equal(exists,true,'Broken anchor '+href);}report.links.push(href)}
 await page.goto(base);await page.getByRole('button',{name:'Daily leaders',exact:true}).click();await page.getByRole('heading',{name:'A new challenge. Every day.'}).waitFor();await page.getByRole('button',{name:'Weekly leaders',exact:true}).click();await page.getByRole('heading',{name:'A whole week to make your mark.'}).waitFor();report.interactions.push('home daily and weekly leader tabs');
 await page.goto(base+'/achievements');await page.getByLabel('Find an achievement').fill('First Steps');assert.equal(await page.locator('.achievement-card').count(),1);await page.getByLabel('Find an achievement').fill('no-matching-achievement');await page.getByRole('heading',{name:'A different path, perhaps?'}).waitFor();report.interactions.push('achievement catalog search and empty result');
 for(const path of ['/database?type=maps','/database?type=bogus&page=-1&q=%00test','/free-market?category=%0A&page=99999999','/rankings/daily?date=2026-02-30','/rankings?sort=fame&job=112','/rankings/weekly?weekStart=2026-09-07']){const response=await page.goto(base+path);assert.equal(response.status(),200,path);report.interactions.push('query '+path)}
 const missing=await page.goto(base+'/not-a-real-route');assert.equal(missing.status(),404);
 const disabledRegistration=await page.request.post(base+'/api/register',{data:{}});assert.equal(disabledRegistration.status(),503);
 for(const path of ['/api/status','/api/rankings','/api/rankings/daily','/api/rankings/weekly','/api/characters/PortalTest','/api/achievements','/api/characters/PortalTest/achievements','/api/telemetry/PortalTest','/api/free-market','/api/database/items','/api/database/mobs']){const response=await page.request.get(base+path);assert.ok([200,503].includes(response.status()));const value=await response.json();assert.equal(value.data,null);assert.ok(['disabled','unavailable'].includes(value.status));}
 assert.deepEqual(report.errors,[],'browser errors');
 report.interactions.push('all 11 APIs fail closed without backend; registration disabled; 404 works');
 await writeFile('local/qa/browser-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({routeViewportChecks:report.routes.length,internalLinks:report.links.length,interactions:report.interactions.length,errors:report.errors.length}));
}finally{await browser.close();}
