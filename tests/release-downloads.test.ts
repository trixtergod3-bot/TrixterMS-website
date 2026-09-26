import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { getReleaseDownloads } from '../lib/portal/release-downloads.ts';
import { APPROVED_MAPLE_EXECUTABLE_SHA256 } from '../lib/portal/integrations.ts';
const base = 'https://floralwhite-stinkbug-872547.hostingersite.com/beta';
const manifest = { schema: 'trixterms.client-update.v1', channel: 'beta', sequence: 5, releaseVersion: 'beta.5' };
const envelope = JSON.stringify({ schema: 'trixterms.signed-client-update-envelope.v1', payload: Buffer.from(JSON.stringify(manifest)).toString('base64') });
const artifact = (folder: string) => ({ filename: 'TRIXTERMS-example.zip', url: `${base}/${folder}/TRIXTERMS-example.zip`, sizeBytes: 100, sha256: 'A'.repeat(64) });
const metadata = { schema: 'trixterms.web-downloads.v1', publicationStatus: 'published', publishedAt: '2026-09-14T00:00:00Z',
  releaseVersion: 'beta.5', clientVersion: 'GMS v111.1', nativeLogin: true, mapleExecutableSha256: APPROVED_MAPLE_EXECUTABLE_SHA256,
  launcher: artifact('launcher'), fullClient: artifact('releases'), manifest: { url: `${base}/manifest.json`, sequence: 5, sha256: createHash('sha256').update(envelope).digest('hex').toUpperCase() } };
const env = { TRIXTER_RELEASE_METADATA_URL: `${base}/releases/current.json` };
function mock(value: unknown = metadata, text = envelope): typeof fetch {
  return (async (url: string | URL | Request) => new Response((url instanceof Request ? url.url : url.toString()).endsWith('current.json') ? JSON.stringify(value) : text)) as typeof fetch;
}
void test('matching promoted metadata provides both artifacts', async () => {
  const result = await getReleaseDownloads(env, mock());
  assert.equal(result?.fullClient?.url, metadata.fullClient.url);
  assert.equal(result?.launcher?.url, metadata.launcher.url);
});
void test('manifest changes during promotion hide stale archives', async () => {
  assert.equal(await getReleaseDownloads(env, mock(metadata, envelope + ' ')), null);
});
void test('candidate, mismatched release, missing full archive and foreign origins fail closed', async () => {
  for (const value of [{ ...metadata, publicationStatus: 'candidate' }, { ...metadata, releaseVersion: 'beta.4' },
    { ...metadata, fullClient: null }, { ...metadata, manifest: { ...metadata.manifest, url: 'https://example.com/manifest.json' } }]) {
    assert.equal(await getReleaseDownloads(env, mock(value)), null);
  }
});
void test('untrusted configured origin never receives a request', async () => {
  let requests = 0;
  assert.equal(await getReleaseDownloads({ TRIXTER_RELEASE_METADATA_URL: 'https://example.com/current.json' },
    (async () => { requests++; throw new Error('unexpected'); }) as typeof fetch), null);
  assert.equal(requests, 0);
});
void test('oversized metadata and network failure hide downloads', async () => {
  assert.equal(await getReleaseDownloads(env, (async () => new Response('x'.repeat(16_385))) as typeof fetch), null);
  assert.equal(await getReleaseDownloads(env, (async () => { throw new Error('offline'); }) as typeof fetch), null);
});
void test('a promoted next manifest selects the next immutable archive without page edits', async () => {
  const previous = await getReleaseDownloads(env, mock());
  const nextEnvelope = JSON.stringify({ schema: 'trixterms.signed-client-update-envelope.v1',
    payload: Buffer.from(JSON.stringify({ ...manifest, sequence: 6, releaseVersion: 'beta.6' })).toString('base64') });
  const nextMetadata = { ...metadata, releaseVersion: 'beta.6',
    fullClient: { ...metadata.fullClient, filename: 'TRIXTERMS-next.zip', url: `${base}/releases/TRIXTERMS-next.zip`, sha256: 'B'.repeat(64) },
    manifest: { ...metadata.manifest, sequence: 6, sha256: createHash('sha256').update(nextEnvelope).digest('hex').toUpperCase() } };
  const next = await getReleaseDownloads(env, mock(nextMetadata, nextEnvelope));
  assert.equal(next?.manifest?.sequence, 6);
  assert.equal(next?.fullClient?.url, nextMetadata.fullClient.url);
  assert.notEqual(next?.fullClient?.sha256, previous?.fullClient?.sha256);
});
