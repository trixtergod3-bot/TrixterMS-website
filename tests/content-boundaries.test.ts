import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { inspectPublicationPath, inspectText, scanProject } from '../tools/check-security.mjs';

void test('scanner detects secrets without returning the secret text', () => {
  const sample = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
  const findings = inspectText('lib/example.ts', sample);
  assert.equal(findings[0]?.rule, 'private-key-material');
  assert.equal(JSON.stringify(findings).includes(sample), false);
  assert.equal(inspectText('lib/example.ts', 'mysql:' + '//account:credential@database.invalid/schema')[0]?.rule, 'credential-bearing-url');
});

void test('source documentation may explain safe placeholders and local provenance', () => {
  assert.deepEqual(inspectText('docs/provenance.md', ['Source path: ', 'C:', '/Users/Example/work'].join('')), []);
  assert.deepEqual(inspectText('.env.example', 'TRIXTER_REGISTRATION_CSRF_SECRET=\nTRIXTER_REGISTRATION_GATEWAY_TOKEN=replace-with-generated-secret\n'), []);
  assert.equal(inspectText('.env.example', 'TRIXTER_REGISTRATION_CSRF_SECRET=' + 'accidentally-committed-secret')[0]?.rule, 'literal-secret-configuration');
});

void test('browser output rejects private paths and server-only environment dependencies', () => {
  const privatePath = ['C:', 'Users', 'Example', 'server'].join('/');
  assert.equal(inspectText('.next/static/chunk.js', privatePath, { browser: true })[0]?.rule, 'private-machine-path');
  const key = ['TRIXTER', 'REGISTRATION', 'GATEWAY_TOKEN'].join('_');
  assert.equal(inspectText('.next/static/chunk.js', key, { browser: true })[0]?.rule, 'server-only-environment-in-browser');
});

void test('publication rejects game binaries and private configuration but accepts original images', () => {
  for (const file of ['public/client.wz', 'public/client.exe', 'backup/database.sql', 'public/archive.7z', '.env.production', 'server/database.ini']) assert.ok(inspectPublicationPath(file));
  for (const file of ['public/art/original.webp', 'public/favicon.svg', '.env.example', 'docs/TRIXTERMS_PUBLIC_API.md']) assert.equal(inspectPublicationPath(file), null);
});

void test('client entrypoints cannot pull server-only modules or legacy fixture providers', () => {
  const source = "'use client';\nimport { readPortal } from '@/lib/portal/data';";
  assert.equal(inspectText('components/unsafe.tsx', source)[0]?.rule, 'server-module-imported-by-client');
  const fixture = "import { publicReadProvider } from '@/lib/data/provider';";
  assert.equal(inspectText('app/unsafe/page.tsx', fixture)[0]?.rule, 'legacy-fixture-provider-reachable');
  assert.deepEqual(inspectText('components/safe.tsx', "'use client';\nimport type { PortalEnvelope } from '@/lib/portal/contracts';"), []);
});

void test('published portal inventory and available browser bundles pass the security boundary', async () => {
  const result = await scanProject();
  assert.deepEqual(result.issues, [], result.issues.map((finding) => `${finding.file}:${finding.line}: ${finding.rule}`).join('\n'));
  assert.ok(result.sources > 10);
});

void test('portal defaults remain unavailable and competition flags are explicit', async () => {
  const reader = await readFile(new URL('../lib/portal/data.ts', import.meta.url), 'utf8');
  assert.ok(reader.includes('TRIXTER_DAILY_RANKINGS_ENABLED'));
  assert.ok(reader.includes('TRIXTER_WEEKLY_RANKINGS_ENABLED'));
  assert.ok(reader.includes('if (!configured) return unavailable'));
  assert.equal(/import[^;]*fixtures/.test(reader), false);
});
