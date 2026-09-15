import { createHash } from 'node:crypto';
import { getPublicIntegrations, validateReleaseDownloads, type ReleaseDownloads } from './integrations.ts';

const officialFeed = 'https://floralwhite-stinkbug-872547.hostingersite.com/beta';
async function boundedText(url: string, limit: number, request: typeof fetch): Promise<string> {
  const response = await request(url, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000) });
  if (!response.ok || !response.body) throw new Error('Release feed unavailable');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error('Release response too large');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}

/** A fixed official origin prevents metadata from selecting arbitrary server fetch targets.
 * During promotion, fail closed if current.json and the signed envelope disagree.
 * Signature authentication remains the launcher's responsibility.
 */
export async function getReleaseDownloads(env: Record<string, string | undefined> = process.env, request: typeof fetch = fetch): Promise<ReleaseDownloads | null> {
  if (!env.TRIXTER_RELEASE_METADATA_URL) return getPublicIntegrations(env).downloads;
  if (env.TRIXTER_RELEASE_METADATA_URL !== `${officialFeed}/releases/current.json`) return null;
  try {
    const raw = JSON.parse(await boundedText(env.TRIXTER_RELEASE_METADATA_URL, 16_384, request));
    const downloads = validateReleaseDownloads(raw);
    if (!downloads?.launcher || !downloads.fullClient || !downloads.manifest
      || downloads.manifest.url !== `${officialFeed}/manifest.json`
      || !/^[A-F0-9]{64}$/.test(raw.manifest.sha256 ?? '')
      || !downloads.launcher.url.startsWith(`${officialFeed}/launcher/`)
      || !downloads.fullClient.url.startsWith(`${officialFeed}/releases/`)) return null;
    const envelopeText = await boundedText(downloads.manifest.url, 1024 * 1024, request);
    if (createHash('sha256').update(envelopeText).digest('hex').toUpperCase() !== raw.manifest.sha256) return null;
    const envelope = JSON.parse(envelopeText);
    const manifest = JSON.parse(Buffer.from(envelope.payload, 'base64').toString('utf8'));
    if (envelope.schema !== 'trixterms.signed-client-update-envelope.v1'
      || manifest.schema !== 'trixterms.client-update.v1' || manifest.channel !== 'beta'
      || manifest.sequence !== downloads.manifest.sequence || manifest.releaseVersion !== downloads.releaseVersion) return null;
    return downloads;
  } catch { return null; }
}
