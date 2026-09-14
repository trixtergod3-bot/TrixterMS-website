import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
import Link from 'next/link.js';
import * as icons from 'lucide-react';
import ts from 'typescript';
import { APPROVED_MAPLE_EXECUTABLE_SHA256, getPublicIntegrations } from '../lib/portal/integrations.ts';

// Render the real TSX route with its real hero, icons and release validator. Only the
// environment lookup is injected; no server, process.env changes or network calls.
function compileComponent(relativePath: string, modules: Map<string, unknown>): Record<string, unknown> {
  const sourceUrl = new URL(relativePath, import.meta.url);
  const compiled = ts.transpileModule(readFileSync(sourceUrl, 'utf8'), {
    fileName: sourceUrl.pathname,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const exports: Record<string, unknown> = {};
  runInNewContext(compiled.outputText, {
    exports,
    require: (id: string) => {
      assert.ok(modules.has(id), `Unexpected component import: ${id}`);
      return modules.get(id);
    },
  }, { filename: sourceUrl.pathname, timeout: 1000 });
  return exports;
}

const launcher = { filename: 'TrixterMS-Synthetic-Launcher.zip', url: 'https://downloads.example.invalid/TrixterMS-Synthetic-Launcher.zip', sizeBytes: 1024, sha256: 'a'.repeat(64) };
const fullClient = { filename: 'TrixterMS-Synthetic-Client.7z', url: 'https://downloads.example.invalid/TrixterMS-Synthetic-Client.7z', sizeBytes: 2048, sha256: 'b'.repeat(64) };
const release = {
  schema: 'trixterms.web-downloads.v1', releaseVersion: 'synthetic-beta.1', clientVersion: 'GMS v111.1',
  publishedAt: '2026-09-12T00:00:00Z', publicationStatus: 'published', nativeLogin: true,
  mapleExecutableSha256: APPROVED_MAPLE_EXECUTABLE_SHA256, launcher,
  manifest: { url: 'https://downloads.example.invalid/beta/manifest.json', sequence: 1 },
};

async function renderDownload(withFullClient: boolean) {
  const integrations = getPublicIntegrations({ TRIXTER_RELEASE_DOWNLOADS_JSON: JSON.stringify({ ...release, fullClient: withFullClient ? fullClient : null }) });
  assert.ok(integrations.downloads, 'Synthetic published metadata must pass the actual release validator');
  const modules = new Map<string, unknown>([
    ['react/jsx-runtime', jsxRuntime], ['next/link', { __esModule: true, default: Link }], ['lucide-react', icons],
    ['@/lib/portal/release-downloads', { getReleaseDownloads: async () => integrations.downloads }],
  ]);
  modules.set('@/components/shared/page-hero', compileComponent('../components/shared/page-hero.tsx', modules));
  const page = compileComponent('../app/download/page.tsx', modules);
  const html = renderToStaticMarkup(await (page.default as () => Promise<ReactNode>)());
  const visibleText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  return { html, visibleText, downloads: integrations.downloads };
}

function assertPublicPresentation(html: string, visibleText: string) {
  assert.match(visibleText, /TRIXTERMS/);
  for (const match of visibleText.matchAll(/\btrix(?:ter|ster)\s*ms\b/gi)) assert.equal(match[0], 'TRIXTERMS');
  assert.doesNotMatch(visibleText, /TrixterMS|TRIXTER MS|TRIXSTERMS/);
  assert.doesNotMatch(visibleText, /Synthetic-(?:Launcher|Client)/);
  assert.match(visibleText, /ID and password on MapleStory.s native login screen/);
  assert.match(visibleText, /filename unchanged|original filename|do not rename|without renaming/i);
  assert.ok(html.includes(`href="${launcher.url}"`), 'Download URL must retain its real case and filename');
  assert.ok(html.includes(`href="${release.manifest.url}"`));
  assert.match(visibleText, /SHA-256/);
}

void test('enabled launcher-only download renders bootstrap instructions and exact artifact URL without legacy display branding', async () => {
  const { html, visibleText, downloads } = await renderDownload(false);
  assertPublicPresentation(html, visibleText);
  assert.match(visibleText, /Install with the launcher/);
  assert.match(visibleText, /only file in this folder/);
  assert.match(visibleText, /downloads and verifies the game files/);
  assert.doesNotMatch(visibleText, /Download the full client and extract/);
  assert.equal(downloads.launcher?.filename, launcher.filename);
  assert.equal(downloads.launcher?.url, launcher.url);
  assert.equal(downloads.fullClient, null);
});

void test('both production choices render with launcher first', async () => {
  const { html, visibleText, downloads } = await renderDownload(true);
  assertPublicPresentation(html, visibleText);
  assert.match(visibleText, /DOWNLOAD LAUNCHER/);
  assert.match(visibleText, /Windows x64/);
  assert.match(visibleText, /PLAY stays disabled/);
  assert.match(visibleText, /click UPDATE/);
  assert.match(visibleText, /only file in this folder/);
  assert.ok(html.includes(`href="${fullClient.url}"`));
  assert.equal(downloads.fullClient?.url, fullClient.url, 'Legacy metadata contract remains compatible');
});

void test('production downloads contain no QA or debug content', async () => {
  const { visibleText } = await renderDownload(true);
  assert.doesNotMatch(visibleText, /QA|diagnostic|debug/);
  assert.match(visibleText, /DOWNLOAD FULL CLIENT/);
  assert.match(visibleText, /Complete game package/);
});
