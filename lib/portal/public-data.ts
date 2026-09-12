import type { PortalEnvelope, PortalQuery, PublicRankingsData, PublicStatsData, PublicTelemetryData, StatusData } from "./contracts.ts";

// Server Components and Route Handlers only. Credentials never enter DTOs or cache keys.
type Obj = Record<string, unknown>;
type PublicKind = "rankings" | "characters" | "stats" | "telemetry";
type PublicData = PublicRankingsData | PublicStatsData | PublicTelemetryData;
export interface PublicRequest { kind: PublicKind; path: string; query: URLSearchParams; legacyStatus: boolean }
export const PUBLIC_LIMITS = Object.freeze({ cacheMs: 10_000, liveMs: 30_000, staleMs: 120_000, runtimeMs: 30_000, timeoutMs: 4_000, maxBodyBytes: 1_048_576, maxCacheBytes: 4_194_304, maxEntries: 128, maxInflight: 8, requestBurst: 240, requestPerSecond: 120, upstreamBurst: 8, upstreamPerSecond: 2, maxBackoffMs: 30_000 });

function object(value: unknown): Obj { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid object"); return value as Obj; }
function text(value: unknown, max = 120): string {
  if (typeof value !== "string" || value.length < 1 || value.length > max || Array.from(value).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new Error("Invalid text");
  return value;
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new Error("Invalid integer"); return value; }
function boolean(value: unknown): boolean { if (typeof value !== "boolean") throw new Error("Invalid boolean"); return value; }
function nullable<T>(value: unknown, parse: (value: unknown) => T): T | null { return value === null ? null : parse(value); }
function decimal(value: unknown): string { const result = text(value, 19); if (!/^(0|[1-9]\d{0,18})$/u.test(result) || BigInt(result) > 9_223_372_036_854_775_807n) throw new Error("Invalid decimal"); return result; }
function timestamp(value: unknown): string {
  const result = text(value, 24);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString() !== (result.length === 20 ? `${result.slice(0, -1)}.000Z` : result)) throw new Error("Invalid timestamp");
  return result;
}
function array<T>(value: unknown, parse: (value: unknown) => T, max: number): T[] { if (!Array.isArray(value) || value.length > max) throw new Error("Invalid list"); return value.map(parse); }

export function isPublicPath(path: string): boolean { return path === "/api/rankings" || path === "/api/status" || path.startsWith("/api/public/"); }

/** Canonical defaults and parameter order prevent equivalent requests growing the cache. */
export function publicRequest(path: string, query: PortalQuery | URLSearchParams = {}): PublicRequest {
  const legacyStatus = path === "/api/status";
  const canonical = path === "/api/rankings" ? "/api/public/rankings" : legacyStatus ? "/api/public/telemetry" : path;
  const match = /^\/api\/public\/(rankings|characters|stats|telemetry)$/u.exec(canonical);
  if (!match) throw new Error("Unsupported public endpoint");
  const kind = match[1] as PublicKind;
  const source = query instanceof URLSearchParams ? [...query] : Object.entries(query).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]);
  const values = new Map<string, string>();
  const allowed = kind === "rankings" || kind === "characters" ? ["sort", "page", "limit", "job", "class", "world", ...(kind === "characters" ? ["name"] : [])] : [];
  for (const [key, value] of source) {
    if (!allowed.includes(key) || values.has(key)) throw new Error("Invalid query");
    if (["page", "limit", "job", "world"].includes(key)) {
      if (!/^(0|[1-9]\d{0,4})$/u.test(value)) throw new Error("Invalid numeric query");
      integer(Number(value), key === "page" || key === "limit" ? 1 : 0, key === "page" ? 10000 : key === "limit" ? 100 : key === "world" ? 127 : 99999);
    } else if (key === "sort" && !["level", "fame"].includes(value) || key === "class" && !["paladin", "demon-avenger"].includes(value)) throw new Error("Invalid filter");
    else if (key === "name") text(value, 13);
    values.set(key, value);
  }
  if (values.has("job") && values.has("class")) throw new Error("Conflicting filters");
  const parsed = new URLSearchParams();
  if (kind === "rankings" || kind === "characters") {
    for (const [key, value] of [["sort", "level"], ["page", "1"], ["limit", "50"]]) parsed.set(key, values.get(key) ?? value);
    for (const key of ["job", "class", "world", "name"]) if (values.has(key)) parsed.set(key, values.get(key)!);
  }
  return { kind, path: canonical, query: parsed, legacyStatus };
}

function rankings(value: unknown, request: PublicRequest): PublicRankingsData {
  const v = object(value), total = integer(v.total), page = integer(v.page, 1, 10000), pageSize = integer(v.pageSize, 1, 100);
  if (page !== Number(request.query.get("page")) || pageSize !== Number(request.query.get("limit"))) throw new Error("Mismatched pagination");
  const entries = array(v.entries, (item) => {
    const row = object(item);
    if (row.score !== null) throw new Error("Unsupported score");
    return { rank: integer(row.rank, 1), name: text(row.name, 13), level: integer(row.level, 1, 1000), exp: decimal(row.exp), jobId: integer(row.jobId, 0, 99999), jobName: text(row.jobName), fame: integer(row.fame, -2147483648, 2147483647), guildName: nullable(row.guildName, (item) => text(item, 45)), score: null };
  }, 100);
  const offset = (page - 1) * pageSize;
  if (entries.length !== Math.max(0, Math.min(pageSize, total - offset)) || new Set(entries.map(row => row.name.toLowerCase())).size !== entries.length) throw new Error("Inconsistent page");
  entries.forEach((row, index) => {
    if (row.rank !== offset + index + 1 || request.query.has("job") && row.jobId !== Number(request.query.get("job")) || request.query.get("class") === "demon-avenger" && row.jobName !== "Demon Avenger" || request.query.get("class") === "paladin" && row.jobName !== "Paladin" || request.query.has("name") && row.name !== request.query.get("name")) throw new Error("Mismatched standing");
    const prior = entries[index - 1];
    if (prior) {
      const fameDifference = request.query.get("sort") === "fame" ? prior.fame - row.fame : 0;
      if (fameDifference < 0 || fameDifference === 0 && (prior.level < row.level || prior.level === row.level && BigInt(prior.exp) < BigInt(row.exp))) throw new Error("Unsorted standings");
    }
  });
  return { entries, total, page, pageSize };
}

function stats(value: Obj, asOf: string): PublicStatsData {
  const totalCharacters = integer(value.totalCharacters);
  const classDistribution = array(value.classDistribution, (item) => { const row = object(item); return { jobName: text(row.jobName), count: integer(row.count, 1) }; }, 1000);
  const rankingSnapshotAt = timestamp(value.rankingSnapshotAt);
  if (Date.parse(rankingSnapshotAt) !== Date.parse(asOf) || new Set(classDistribution.map(row => row.jobName)).size !== classDistribution.length || classDistribution.reduce((sum, row) => sum + row.count, 0) !== totalCharacters) throw new Error("Inconsistent statistics");
  return { totalCharacters, classDistribution, rankingSnapshotAt };
}

function unknownRuntime() { return { online: null, playersOnline: null, channels: [], uptimeSeconds: null, rates: { exp: null, meso: null, drop: null }, runtimeAsOf: null, runtimeStatus: "unavailable" as const, recentActivity: null }; }

function telemetry(value: Obj, asOf: string, now: number): PublicTelemetryData {
  const summary = stats(value, asOf);
  // Unknown and expired runtime samples never turn DB reachability into an online assertion.
  if (value.runtimeStatus === "unavailable") return { ...summary, ...unknownRuntime() };
  if (value.runtimeStatus !== "live") throw new Error("Invalid runtime status");
  const runtimeAsOf = timestamp(value.runtimeAsOf), age = now - Date.parse(runtimeAsOf);
  if (age < 0 || age >= PUBLIC_LIMITS.runtimeMs) return { ...summary, ...unknownRuntime() };
  const online = nullable(value.online, boolean), playersOnline = nullable(value.playersOnline, (item) => integer(item, 0, 100_000));
  const channels = array(value.channels, (item) => {
    const row = object(item);
    if (!["online", "offline", "unknown"].includes(String(row.status))) throw new Error("Invalid channel status");
    const population = nullable(row.playersOnline, (item) => integer(item, 0, 100_000));
    if (row.status === "unknown" && population !== null || row.status === "offline" && population !== null && population !== 0) throw new Error("Inconsistent channel population");
    return { channel: integer(row.channel, 1, 127), status: row.status as "online" | "offline" | "unknown", playersOnline: population };
  }, 64).sort((a, b) => a.channel - b.channel);
  const uptimeSeconds = nullable(value.uptimeSeconds, (item) => integer(item, 0, 315_360_000));
  if (new Set(channels.map(row => row.channel)).size !== channels.length || playersOnline !== null && channels.reduce((sum, row) => sum + (row.playersOnline ?? 0), 0) > playersOnline || online === false && (playersOnline !== null && playersOnline !== 0 || uptimeSeconds !== null && uptimeSeconds !== 0 || channels.some(row => row.status === "online"))) throw new Error("Inconsistent runtime");
  const rates = object(value.rates);
  const rate = (value: unknown) => { if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > 1_000_000) throw new Error("Invalid rate"); return value; };
  return { ...summary, online, playersOnline, channels, uptimeSeconds, rates: { exp: nullable(rates.exp, rate), meso: nullable(rates.meso, rate), drop: nullable(rates.drop, rate) }, runtimeAsOf, runtimeStatus: "live", recentActivity: null };
}

/** Explicit second projection: no upstream identifiers, marker values or diagnostics survive. */
export function projectPublicData(request: PublicRequest, value: unknown, asOf: string, now: number): PublicData {
  if (request.kind === "rankings" || request.kind === "characters") return rankings(value, request);
  const v = object(value);
  return request.kind === "stats" ? stats(v, asOf) : telemetry(v, asOf, now);
}

export class PublicRateLimitError extends Error { constructor() { super("Public request limit reached"); } }
function unavailable(): PortalEnvelope<never> { return { status: "unavailable", data: null, asOf: null, message: "Live data is temporarily unavailable.", source: "none" }; }
interface ReaderConfig { url?: string; token?: string; development?: boolean }
interface ReaderOptions { now?: () => number; fetcher?: typeof fetch; config?: () => ReaderConfig }
interface Cached { envelope: PortalEnvelope<PublicData>; storedAt: number; bytes: number }

/** One bounded reader per Node process; the bridge also deduplicates all SQL across pages/endpoints. */
export function createPublicReader(options: ReaderOptions = {}) {
  const now = options.now ?? Date.now;
  const fetcher: typeof fetch = options.fetcher ?? ((input, init) => fetch(input, init));
  const config = options.config ?? (() => ({ url: process.env.TRIXTER_READ_API_URL, token: process.env.TRIXTER_READ_API_TOKEN, development: process.env.NODE_ENV === "development" }));
  const cache = new Map<string, Cached>(), inflight = new Map<string, Promise<PortalEnvelope<PublicData>>>();
  let cacheBytes = 0, nextAttemptAt = 0, failures = 0, identity = "", generation = 0;
  let requestTokens: number = PUBLIC_LIMITS.requestBurst, upstreamTokens: number = PUBLIC_LIMITS.upstreamBurst, lastRefill = now();
  function budget(upstream: boolean): boolean {
    const at = now(), elapsed = Math.max(0, at - lastRefill) / 1000;
    requestTokens = Math.min(PUBLIC_LIMITS.requestBurst, requestTokens + elapsed * PUBLIC_LIMITS.requestPerSecond);
    upstreamTokens = Math.min(PUBLIC_LIMITS.upstreamBurst, upstreamTokens + elapsed * PUBLIC_LIMITS.upstreamPerSecond);
    lastRefill = at;
    if (upstream) { if (upstreamTokens < 1) return false; upstreamTokens--; } else { if (requestTokens < 1) return false; requestTokens--; }
    return true;
  }
  function cachedResult(request: PublicRequest, record: Cached | undefined, forceStale = false): PortalEnvelope<PublicData> {
    if (!record?.envelope.data || !record.envelope.asOf) return unavailable();
    const age = now() - Date.parse(record.envelope.asOf);
    if (age < 0 || age >= PUBLIC_LIMITS.staleMs) return unavailable();
    const stale = forceStale || record.envelope.status === "stale" || age > PUBLIC_LIMITS.liveMs;
    return { ...record.envelope, data: projectPublicData(request, record.envelope.data, record.envelope.asOf, now()), status: stale ? "stale" : "live", message: stale ? "Showing a previously verified snapshot; live refresh is unavailable." : "" };
  }
  function put(key: string, envelope: PortalEnvelope<PublicData>) {
    const bytes = Buffer.byteLength(JSON.stringify(envelope));
    const existing = cache.get(key); if (existing) cacheBytes -= existing.bytes;
    cache.delete(key);
    while (cache.size && (cache.size >= PUBLIC_LIMITS.maxEntries || cacheBytes + bytes > PUBLIC_LIMITS.maxCacheBytes)) { const oldest = cache.keys().next().value!; cacheBytes -= cache.get(oldest)!.bytes; cache.delete(oldest); }
    if (bytes <= PUBLIC_LIMITS.maxCacheBytes) { cache.set(key, { envelope, storedAt: now(), bytes }); cacheBytes += bytes; }
  }
  async function readUpstream(request: PublicRequest, key: string, base: URL, token: string, requestGeneration: number): Promise<PortalEnvelope<PublicData>> {
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), PUBLIC_LIMITS.timeoutMs);
    const priorFailures = failures;
    try {
      const url = new URL(`${base.pathname.replace(/\/$/u, "")}${request.path}?${request.query}`, base.origin);
      const response = await fetcher(url, { method: "GET", headers: { Accept: "application/json", Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: controller.signal });
      if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("application/json") || Number(response.headers.get("content-length")) > PUBLIC_LIMITS.maxBodyBytes || !response.body) throw new Error("Unavailable upstream");
      const reader = response.body.getReader(), chunks: Uint8Array[] = []; let bytes = 0;
      for (;;) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > PUBLIC_LIMITS.maxBodyBytes) { await reader.cancel(); throw new Error("Response too large"); } chunks.push(chunk.value); }
      const body = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
      const payload = object(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)));
      if (payload.status !== "live" && payload.status !== "stale") throw new Error("Unavailable upstream");
      const asOf = timestamp(payload.asOf), age = now() - Date.parse(asOf);
      if (age < 0 || age >= PUBLIC_LIMITS.staleMs) throw new Error("Invalid snapshot freshness");
      const data = projectPublicData(request, payload.data, asOf, now());
      const stale = payload.status === "stale" || age > PUBLIC_LIMITS.liveMs;
      const envelope: PortalEnvelope<PublicData> = { status: stale ? "stale" : "live", data, asOf, message: stale ? "Showing a previously verified snapshot; live refresh is unavailable." : "", source: "backend" };
      if (requestGeneration !== generation) return unavailable();
      put(key, envelope);
      if (failures === priorFailures) { failures = 0; nextAttemptAt = 0; }
      return envelope;
    } catch {
      if (requestGeneration !== generation) return unavailable();
      failures = Math.min(6, failures + 1);
      nextAttemptAt = now() + Math.min(PUBLIC_LIMITS.maxBackoffMs, 1000 * 2 ** (failures - 1));
      return cachedResult(request, cache.get(key), true);
    } finally {
      // Also close responses rejected at the header boundary before their body was read.
      controller.abort();
      clearTimeout(timeout);
    }
  }
  async function read<T = PublicData>(path: string, query: PortalQuery | URLSearchParams = {}): Promise<PortalEnvelope<T>> {
    if (typeof window !== "undefined") throw new Error("Public reader requires the server");
    if (!budget(false)) throw new PublicRateLimitError();
    const request = publicRequest(path, query);
    const settings = config();
    // Identity is never logged or returned. Configuration changes invalidate prior authenticated data.
    const nextIdentity = JSON.stringify(settings);
    if (identity !== nextIdentity) { identity = nextIdentity; generation++; cache.clear(); cacheBytes = 0; inflight.clear(); failures = 0; nextAttemptAt = 0; }
    let base: URL;
    try {
      if (!settings.url || !settings.token || !/^[A-Za-z0-9_-]{43,128}$/u.test(settings.token) || new Set(settings.token).size < 12) throw new Error("Missing authentication");
      base = new URL(settings.url);
      if (base.username || base.password || base.search || base.hash || base.protocol !== "https:" && !(settings.development && base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname))) throw new Error("Invalid upstream configuration");
    } catch { return unavailable(); }
    const key = `${request.path}?${request.query}`, record = cache.get(key);
    let result: PortalEnvelope<PublicData>;
    if (record && now() - record.storedAt < PUBLIC_LIMITS.cacheMs) result = cachedResult(request, record);
    else if (inflight.has(key)) result = await inflight.get(key)!;
    else if (now() < nextAttemptAt || inflight.size >= PUBLIC_LIMITS.maxInflight || !budget(true)) result = cachedResult(request, record, true);
    else {
      const pending = readUpstream(request, key, base, settings.token!, generation);
      inflight.set(key, pending);
      try { result = await pending; } finally { if (inflight.get(key) === pending) inflight.delete(key); }
    }
    if (request.legacyStatus) {
      const data = result.data as PublicTelemetryData | null;
      if (!data || data.runtimeStatus !== "live") return unavailable();
      const status: StatusData = { online: data.online, playersOnline: data.playersOnline, rates: data.rates, version: null };
      return { ...result, asOf: data.runtimeAsOf, data: status as T };
    }
    return result as PortalEnvelope<T>;
  }
  return { read, diagnostics: () => ({ cacheEntries: cache.size, cacheBytes, inflight: inflight.size, nextAttemptAt, failures }) };
}

const sharedReader = createPublicReader();
export const readPublic = sharedReader.read;
