import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
const PUBLIC_BRAND='TRIXTERMS';
const brandCandidate=/(?<![\p{L}\p{N}_])(?:trixter|trickster|twixter)[\s\u200b-\u200d\ufeff_-]*ms(?![\p{L}\p{N}_])/giu;

// Inspect human-facing values, never raw HTML, href/src values, or code identifiers.
// The canonical domain, schemas, package names, and real filenames retain their
// technical spelling even when they are shown in explanatory copy.
function humanFacingText(value){
 return value
  .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"']+/gi,' ')
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,' ')
  .replace(/(?:^|(?<=[\s("']))(?:[A-Z]:[\\/]|\/)[^\s<>"']+/gi,' ')
  .replace(/\b(?:trixterms|tricksterms|twixterms)(?:[._-][a-z0-9][a-z0-9._-]*| (?:Public Beta |Public |Beta )?Launcher)?\.(?:exe|zip|7z|dll|wz|json|png|webp|svg|ico)\b/gi,' ')
  .replace(/\b(?:trixterms|tricksterms|twixterms)\.[a-z0-9][a-z0-9._-]*(?:[\\/][^\s<>"']*)?/gi,' ')
  .replace(/\b[a-z0-9_.-]*(?:trixterms|tricksterms|twixterms)[a-z0-9_.-]*[\\/][^\s<>"']+/gi,' ');
}
function brandMatches(value){return [...humanFacingText(value).matchAll(brandCandidate)].map(match=>match[0]);}
function assertBrandValue(surface,value,required=false){
 const matches=brandMatches(value);
 assert.deepEqual(matches.filter(match=>match!==PUBLIC_BRAND),[],`${surface}: public brand must be exactly ${PUBLIC_BRAND}`);
 if(required)assert.ok(matches.includes(PUBLIC_BRAND),`${surface}: missing canonical ${PUBLIC_BRAND} brand`);
 return matches.length;
}
function isExpectedMissingResourceConsole(text,location,expected404Url){
 return expected404Url!==null&&location.url===expected404Url
  &&location.lineNumber===0&&location.columnNumber===0
  &&/^Failed to load resource: the server responded with a status of 404 \((?:Not Found)?\)$/.test(text);
}
function trackBrowserErrors(page,report,expected404Url=null){
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('console',message=>{
  if(message.type()!=='error')return;
  const text=message.text();const location=message.location();
  if(isExpectedMissingResourceConsole(text,location,expected404Url))return;
  report.consoleErrors.push({page:page.url(),text,location});
 });
}
function brandSelfTest(){
 for(const wrong of ['TrixterMS','trixterms','TRIXTER MS','TricksterMS','TwixterMS','TRIXTER-MS','TRIXTER\u200bMS']){
  assert.throws(()=>assertBrandValue('self-test',`Play ${wrong} today`),assert.AssertionError);
 }
 assert.equal(assertBrandValue('self-test','Play TRIXTERMS. Welcome to TRIXTERMS!',true),2);
 assertBrandValue('self-test',"TRIXTERMS’s next adventure",true);
 for(const technical of ['https://trixterms.com/download','trixterms.com','support@trixterms.com',
  '/art/TrixterMS-hero.webp','C:\\Games\\TrixterMS\\client.exe','trixterms.client-update.v1',
  'TrixterMS Public Beta Launcher.exe','TRIXTERMS_PUBLIC_API_URL','trixterms-website/package.json']){
  assert.equal(assertBrandValue('technical self-test',technical),0,technical);
 }
 // Ignoring a technical token must never hide an adjacent incorrect brand.
 assert.throws(()=>assertBrandValue('self-test','Visit https://trixterms.com and play TrixterMS'),assert.AssertionError);
 assert.throws(()=>assertBrandValue('self-test','Play TrixterMS then open launcher.exe'),assert.AssertionError);
 const missingUrl='http://127.0.0.1:4315/not-a-real-route';
 const missingText='Failed to load resource: the server responded with a status of 404 (Not Found)';
 const missingLocation={url:missingUrl,lineNumber:0,columnNumber:0};
 assert.equal(isExpectedMissingResourceConsole(missingText,missingLocation,missingUrl),true);
 assert.equal(isExpectedMissingResourceConsole(missingText,missingLocation,null),false);
 assert.equal(isExpectedMissingResourceConsole(missingText,{...missingLocation,url:missingUrl+'/asset.png'},missingUrl),false);
 assert.equal(isExpectedMissingResourceConsole(missingText,{...missingLocation,lineNumber:12},missingUrl),false);
 assert.equal(isExpectedMissingResourceConsole('Application error',missingLocation,missingUrl),false);
 assert.equal(isExpectedMissingResourceConsole(missingText.replace('404','503'),missingLocation,missingUrl),false);
}
brandSelfTest();
if(process.argv.includes('--brand-self-test')){
 console.log('Brand checker self-test passed: canonical spelling, technical exclusions, adjacent copy, and strict expected-404 console filter.');
 process.exit(0);
}
const { chromium }=await import('@playwright/test');

async function verifyPageBrand(page,label){
 const snapshot=await page.evaluate(()=>{
  let text=document.body.innerText;
  for(const element of document.querySelectorAll('pre,code,[data-brand-technical]')){
   const technical=element instanceof HTMLElement?element.innerText:element.textContent;
   if(technical)text=text.replace(technical,' ');
  }
  const metadata=[...document.querySelectorAll('meta[name],meta[property]')].flatMap(element=>{
   const key=(element.getAttribute('property')??element.getAttribute('name')??'').toLowerCase();
   return /^(?:description|application-name|apple-mobile-web-app-title|title|keywords|author|creator|publisher|copyright|og:(?:title|site_name|description|image:alt|video:alt)|twitter:(?:title|description|image:alt|label\d+|data\d+))$/.test(key)
    ?[{surface:`meta ${key}`,value:element.getAttribute('content')??'',key}]:[];
  });
  const alts=[...document.querySelectorAll('img[alt],input[type="image"][alt],area[alt]')]
   .map((element,index)=>({surface:`image alt ${index+1}`,value:element.getAttribute('alt')??''}));
  const accessible=[...document.querySelectorAll('[aria-label],[title]')].filter(element=>{
   const style=getComputedStyle(element);
   return element.getClientRects().length>0&&style.display!=='none'&&style.visibility!=='hidden';
  }).flatMap((element,index)=>['aria-label','title'].flatMap(attribute=>{
   const value=element.getAttribute(attribute);return value?[{surface:`${attribute} ${index+1}`,value}]:[];
  }));
  return {text,title:document.title,metadata,alts,accessible};
 });
 const renderedBrandOccurrences=assertBrandValue(`${label} rendered text`,snapshot.text,true);
 assertBrandValue(`${label} document title`,snapshot.title,true);
 for(const field of [...snapshot.metadata,...snapshot.alts,...snapshot.accessible])assertBrandValue(`${label} ${field.surface}`,field.value);
 for(const key of ['og:title','og:site_name','twitter:title']){
  const fields=snapshot.metadata.filter(field=>field.key===key);
  assert.ok(fields.length>0,`${label} missing ${key}`);
  for(const field of fields)assertBrandValue(`${label} ${key}`,field.value,true);
 }
 return {renderedBrandOccurrences,metadataFields:snapshot.metadata.length,imageAlts:snapshot.alts.length,accessibleLabels:snapshot.accessible.length};
}
async function verifyFavicons(page){
 const icons=await page.locator('link[rel~="icon"]').evaluateAll(elements=>elements.map(element=>element.getAttribute('href')).filter(Boolean));
 assert.ok(icons.length>0,'A favicon must be linked from the document head');
 const checks=[];
 for(const href of new Set(icons)){
  const url=new URL(href,page.url());
  assert.equal(url.origin,new URL(base).origin,'Favicon QA must remain on the local portal origin');
  const response=await page.request.get(url.href);
  assert.equal(response.status(),200,`Favicon HTTP ${url.pathname}`);
  const type=response.headers()['content-type']??'';
  assert.ok(/image\//i.test(type),`Favicon must return an image, not an HTML fallback: ${url.pathname}`);
  let checkedLabels=0;
  if(type.includes('svg')||url.pathname.endsWith('.svg')){
   const labels=await page.evaluate(svg=>{
    const document=new DOMParser().parseFromString(svg,'image/svg+xml');
    if(document.querySelector('parsererror'))throw new Error('Invalid favicon SVG');
    return [...document.querySelectorAll('title,desc,[aria-label]')].flatMap(element=>[
     ...(element.matches('title,desc')?[element.textContent??'']:[]),
     ...(element.hasAttribute('aria-label')?[element.getAttribute('aria-label')??'']:[]),
    ]);
   },await response.text());
   for(const label of labels)assertBrandValue(`Favicon ${url.pathname} label`,label);
   checkedLabels=labels.length;
  }
  checks.push({path:url.pathname,status:response.status(),contentType:type,checkedLabels});
 }
 return checks;
}
const base=process.env.PORTAL_QA_URL??'http://127.0.0.1:4315';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('QA must target loopback');
const routes=['/','/download','/register','/rankings','/rankings/daily','/rankings/weekly','/achievements','/database','/free-market','/vote','/donate','/discord','/news','/character/PortalTest','/status','/classes','/features','/guide','/patch-notes','/players','/events','/boss-records','/live-world','/database/rare-drops'];
const screenshots=new Set(['/','/achievements','/download','/register','/rankings','/database','/free-market']);
const allWidthScreenshots=new Set(['/','/classes']);
await mkdir('local/qa',{recursive:true});
const browser=await chromium.launch({channel:process.env.PORTAL_QA_BROWSER??'chrome',headless:true});
const report={checkedAt:new Date().toISOString(),base,canonicalBrand:PUBLIC_BRAND,brandSelfTest:true,favicons:[],routes:[],links:[],errors:[],consoleErrors:[],interactions:[]};
try{
 const linkSet=new Set();
 for(const width of [1440,1024,768,390,320]){
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();trackBrowserErrors(page,report);
  for(const route of routes){
   const response=await page.goto(base+route,{waitUntil:'networkidle'});
   assert.equal(response.status(),200,route+' HTTP');
   assert.equal(await page.locator('h1').count(),1,route+' exactly one h1');
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
   assert.equal(overflow,false,route+' overflows at '+width);
   const brokenImages=await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')));
   assert.deepEqual(brokenImages,[],route+' broken images');
   const branding=await verifyPageBrand(page,`${route} at ${width}px`);
   const hrefs=await page.locator('a[href]').evaluateAll(links=>links.map(l=>l.getAttribute('href')));
   hrefs.filter(h=>h?.startsWith('/')&&!h.startsWith('//')).forEach(h=>linkSet.add(h));
   report.routes.push({route,width,status:response.status(),overflow,branding});
   if(route==='/')await page.screenshot({path:`local/qa/home-first-screen-${width}.png`,fullPage:false});
   if(allWidthScreenshots.has(route)||(screenshots.has(route)&&[1440,390].includes(width)))await page.screenshot({path:'local/qa/'+(route==='/'?'home':route.slice(1).replaceAll('/','-'))+'-'+width+'.png',fullPage:true});
  }
  if(width===390){await page.goto(base);await page.getByRole('button',{name:'Open menu'}).click();await verifyPageBrand(page,'home with mobile navigation open at 390px');await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Achievements',exact:true}).click();await page.waitForURL('**/achievements');assert.equal(await page.getByRole('button',{name:'Open menu'}).count(),1);report.interactions.push('mobile navigation opens, routes, closes');}
  await context.close();
 }
 const page=await browser.newPage();trackBrowserErrors(page,report);
 for(const href of linkSet){const url=new URL(href,base);const response=await page.goto(url.href,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200,'Broken internal link '+href);if(url.hash){const exists=await page.evaluate(id=>!!document.getElementById(id),decodeURIComponent(url.hash.slice(1)));assert.equal(exists,true,'Broken anchor '+href);}report.links.push(href)}
 await page.goto(base);report.favicons=await verifyFavicons(page);await page.getByRole('button',{name:'Daily leaders',exact:true}).click();await page.getByRole('heading',{name:'A new challenge. Every day.'}).waitFor();await verifyPageBrand(page,'home daily leaders selected');await page.getByRole('button',{name:'Weekly leaders',exact:true}).click();await page.getByRole('heading',{name:'A whole week to make your mark.'}).waitFor();await verifyPageBrand(page,'home weekly leaders selected');report.interactions.push('home daily and weekly leader tabs');
 await page.goto(base+'/achievements');await page.getByLabel('Find an achievement').fill('First Steps');assert.equal(await page.locator('.achievement-card').count(),1);await page.getByLabel('Find an achievement').fill('no-matching-achievement');await page.getByRole('heading',{name:'A different path, perhaps?'}).waitFor();report.interactions.push('achievement catalog search and empty result');
 for(const path of ['/database?type=maps','/database?type=bogus&page=-1&q=%00test','/free-market?category=%0A&page=99999999','/rankings/daily?date=2026-02-30','/rankings?sort=fame&job=112','/rankings/weekly?weekStart=2026-09-07']){const response=await page.goto(base+path);assert.equal(response.status(),200,path);report.interactions.push('query '+path)}
 const missingUrl=new URL('/not-a-real-route',base).href;
 const missingPage=await browser.newPage();trackBrowserErrors(missingPage,report,missingUrl);
 const missing=await missingPage.goto(missingUrl,{waitUntil:'networkidle'});assert.equal(missing.status(),404);await verifyPageBrand(missingPage,'404 page');await missingPage.close();
 const disabledRegistration=await page.request.post(base+'/api/register',{data:{}});assert.equal(disabledRegistration.status(),503);
 for(const path of ['/api/status','/api/rankings','/api/rankings/daily','/api/rankings/weekly','/api/characters/PortalTest','/api/achievements','/api/characters/PortalTest/achievements','/api/telemetry/PortalTest','/api/free-market','/api/database/items','/api/database/mobs']){const response=await page.request.get(base+path);assert.ok([200,503].includes(response.status()));const value=await response.json();assert.equal(value.data,null);assert.ok(['disabled','unavailable'].includes(value.status));}
 assert.deepEqual(report.errors,[],'browser errors');
 assert.deepEqual(report.consoleErrors,[],'browser console errors');
 report.interactions.push('all 11 APIs fail closed without backend; registration disabled; 404 works');
 await writeFile('local/qa/browser-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({routeViewportChecks:report.routes.length,brandChecks:report.routes.length,favicons:report.favicons.length,internalLinks:report.links.length,interactions:report.interactions.length,errors:report.errors.length,consoleErrors:report.consoleErrors.length}));
}finally{await browser.close();}
