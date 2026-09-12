/** Public metadata only. Import from server components, never a client form. */
export const APPROVED_MAPLE_EXECUTABLE_SHA256 =
  '1281B9F49259EA78162DD00E6BC3A29932EBFF47B1DA9BB3B7DFA2B762B9E7B1';
type Environment = Record<string, string | undefined>;
export interface DownloadArtifact { filename: string; url: string; sizeBytes: number; sha256: string }
export interface ReleaseDownloads {
  schema: 'trixterms.web-downloads.v1'; releaseVersion: string; clientVersion: 'GMS v111.1';
  publishedAt: string; publicationStatus: 'published'; nativeLogin: true; mapleExecutableSha256: string;
  launcher: DownloadArtifact | null; fullClient: DownloadArtifact | null;
  manifest: { url: string; sequence: number } | null;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function publicHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes('.') || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)
      || /^(172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(host)
      || host.endsWith('.local') || host.endsWith('.localhost') || host.includes(':')) return null;
    return url.href;
  } catch { return null; }
}
export function validateDiscordInvite(value: unknown): string | null {
  const safeUrl = publicHttpsUrl(value);
  if (!safeUrl) return null;
  const url = new URL(safeUrl);
  if (url.port) return null;
  if (url.hostname === 'discord.gg' && /^\/[A-Za-z0-9-]{2,64}\/?$/.test(url.pathname)) return url.href;
  if (url.hostname === 'discord.com' && /^\/invite\/[A-Za-z0-9-]{2,64}\/?$/.test(url.pathname)) return url.href;
  return null;
}
function artifact(value: unknown, launcher: boolean): DownloadArtifact | null {
  if (!record(value)) return null;
  const url = publicHttpsUrl(value.url);
  if (!url || typeof value.filename !== 'string'
    || !/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,119}$/.test(value.filename)
    || !(launcher ? /\.(zip|exe)$/i : /\.(zip|7z)$/i).test(value.filename)
    || !Number.isSafeInteger(value.sizeBytes) || Number(value.sizeBytes) <= 0
    || typeof value.sha256 !== 'string' || !/^[A-Fa-f0-9]{64}$/.test(value.sha256)) return null;
  return { filename: value.filename, url, sizeBytes: Number(value.sizeBytes), sha256: value.sha256.toUpperCase() };
}
/** Validates published metadata; does not claim to check the patch signature. */
export function validateReleaseDownloads(value: unknown): ReleaseDownloads | null {
  if (!record(value) || value.schema !== 'trixterms.web-downloads.v1'
    || value.publicationStatus !== 'published' || value.nativeLogin !== true
    || value.mapleExecutableSha256 !== APPROVED_MAPLE_EXECUTABLE_SHA256
    || value.clientVersion !== 'GMS v111.1' || typeof value.releaseVersion !== 'string'
    || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(value.releaseVersion)
    || typeof value.publishedAt !== 'string' || !Number.isFinite(Date.parse(value.publishedAt))) return null;
  const launcher = value.launcher == null ? null : artifact(value.launcher, true);
  const fullClient = value.fullClient == null ? null : artifact(value.fullClient, false);
  if ((value.launcher != null && !launcher) || (value.fullClient != null && !fullClient) || (!launcher && !fullClient)) return null;
  let manifest: ReleaseDownloads['manifest'] = null;
  if (value.manifest != null) {
    if (!record(value.manifest)) return null;
    const url = publicHttpsUrl(value.manifest.url);
    if (!url || !new URL(url).pathname.endsWith('/manifest.json')
      || !Number.isSafeInteger(value.manifest.sequence) || Number(value.manifest.sequence) < 1) return null;
    manifest = { url, sequence: Number(value.manifest.sequence) };
  }
  return { schema: 'trixterms.web-downloads.v1', releaseVersion: value.releaseVersion,
    clientVersion: 'GMS v111.1', publishedAt: value.publishedAt, publicationStatus: 'published',
    nativeLogin: true, mapleExecutableSha256: APPROVED_MAPLE_EXECUTABLE_SHA256, launcher, fullClient, manifest };
}
export interface VoteProviderAdapter {
  id: string;
  createVoteUrl(opaquePlayerReference: string): Promise<URL>;
  verifyCallback(rawBody: Uint8Array, headers: Headers): Promise<{ eventId: string; opaquePlayerReference: string } | null>;
}
export interface DonationProviderAdapter {
  id: string;
  createHostedCheckout(approvedProductId: string, opaquePlayerReference: string): Promise<URL>;
  verifyWebhook(rawBody: Uint8Array, headers: Headers): Promise<{ eventId: string; approvedProductId: string; opaquePlayerReference: string } | null>;
}
export function getPublicIntegrations(env: Environment = process.env) {
  let downloads: ReleaseDownloads | null = null;
  if (env.TRIXTER_RELEASE_DOWNLOADS_JSON && env.TRIXTER_RELEASE_DOWNLOADS_JSON.length <= 16_384) {
    try { downloads = validateReleaseDownloads(JSON.parse(env.TRIXTER_RELEASE_DOWNLOADS_JSON)); } catch { /* Fail closed. */ }
  }
  return { discordInviteUrl: validateDiscordInvite(env.TRIXTER_DISCORD_INVITE_URL), downloads,
    vote: { enabled: false as const, provider: null }, donation: { enabled: false as const, provider: null } };
}
