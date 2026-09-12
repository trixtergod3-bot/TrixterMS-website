import assert from "node:assert/strict";
import test from "node:test";
import { createPublicReader, projectPublicData, publicRequest, PUBLIC_LIMITS, PublicRateLimitError } from "../lib/portal/public-data.ts";
import { GET } from "../app/api/[...path]/route.ts";
import { readPortal } from "../lib/portal/data.ts";
import type { PublicRankingsData, PublicTelemetryData } from "../lib/portal/contracts.ts";

const at = Date.parse("2026-09-13T10:00:00.000Z");
const asOf = new Date(at).toISOString();
const config = { url: "https://protected-bridge.invalid/reader", token: "synthetic-only-token_abcdefghijklmnopqrstuvwxyz0123456789" };
const row = { rank: 1, name: "LevelOne", level: 1, exp: "0", jobId: 0, jobName: "Beginner", fame: 0, guildName: null, score: null };
const page = { entries: [row], total: 1, page: 1, pageSize: 50 };
const stats = { totalCharacters: 1, classDistribution: [{ jobName: "Beginner", count: 1 }], rankingSnapshotAt: asOf };
const runtime = { online: true, playersOnline: 2, channels: [{ channel: 1, status: "online", playersOnline: 2 }], uptimeSeconds: 3600, rates: { exp: 3, meso: 2, drop: 1 }, runtimeAsOf: asOf, runtimeStatus: "live", recentActivity: null };
const telemetry = { ...stats, ...runtime };
const envelope = (data: unknown = page, timestamp = asOf, status = "live") => ({ status, asOf: timestamp, data });
const makeReader = (data: unknown = page) => createPublicReader({ now: () => at, config: () => config, fetcher: async () => Response.json(envelope(data)) });

void test("public query allowlist rejects injection, duplicates, unsafe pagination and arbitrary filters", () => {
  for (const path of ["/api/public/accounts", "/api/public/characters/Name", "https://outside.invalid", "/api/public/../rankings"]) assert.throws(() => publicRequest(path));
  for (const query of [{ page: 0 }, { page: "01" }, { limit: 101 }, { page: 10001 }, { world: 128 }, { job: 100000 }, { sql: "select" }, { sort: "level desc" }, { class: "paladin", job: 122 }, { name: "LevelOne" }]) assert.throws(() => publicRequest("/api/public/rankings", query));
  assert.throws(() => publicRequest("/api/public/rankings", new URLSearchParams("page=1&page=2")));
  for (const endpoint of ["stats", "telemetry"]) assert.throws(() => publicRequest(`/api/public/${endpoint}`, { page: 1 }));
  for (const name of ["", "x".repeat(14), "bad\nname"]) assert.throws(() => publicRequest("/api/public/characters", { name }));
  assert.equal(publicRequest("/api/public/characters", { name: "[GM]Test" }).query.get("name"), "[GM]Test");
  assert.equal(publicRequest("/api/rankings").query.toString(), publicRequest("/api/public/rankings", { limit: 50, sort: "level", page: 1 }).query.toString());
});

void test("RC1 projection includes Level 1 and exact EXP, stripping all private fields at every level", async () => {
  const privateFields = { accountid: 44, id: 111, internalId: 222, password: "synthetic-secret", passwordHash: "synthetic-hash", email: "private.invalid", ip: "127.0.0.1", hardwareId: "private-device", isDemonAvenger: 1, daMarker: "private-marker", gm: 1, world: 0 };
  const read = createPublicReader({ now: () => at, config: () => config, fetcher: async () => Response.json({ ...envelope({ ...page, ...privateFields, entries: [{ ...row, ...privateFields, exp: "9007199254740993" }] }), ...privateFields, message: "private-diagnostics" }) });
  const result = await read.read<PublicRankingsData>("/api/public/rankings");
  assert.equal(result.data?.entries[0].level, 1);
  assert.equal(result.data?.entries[0].exp, "9007199254740993");
  for (const key of Object.keys(privateFields)) assert.equal(JSON.stringify(result).includes(`"${key}"`), false, key);
  assert.equal(JSON.stringify(result).includes("private"), false);
  const projected = projectPublicData(publicRequest("/api/public/telemetry"), { ...telemetry, ...privateFields, channels: [{ ...runtime.channels[0], ...privateFields }], rates: { ...runtime.rates, ...privateFields } }, asOf, at);
  assert.deepEqual(projected, telemetry);
});

void test("exact characters filter and pagination must match upstream; sorting remains monotonic", async () => {
  assert.equal((await makeReader().read("/api/public/characters", { name: "LevelOne" })).status, "live");
  assert.equal((await makeReader().read("/api/public/characters", { name: "levelone" })).status, "unavailable");
  for (const query of [{ page: 2 }, { limit: 25 }, { job: 122 }, { class: "paladin" }]) assert.equal((await makeReader().read("/api/public/rankings", query)).status, "unavailable");
  for (const change of [{ rank: 2 }, { exp: 9007199254740992 }, { exp: "01" }, { score: "1" }]) assert.equal((await makeReader({ ...page, entries: [{ ...row, ...change }] }).read("/api/public/rankings")).status, "unavailable");
  const disordered = { entries: [row, { ...row, rank: 2, name: "HigherLevel", level: 2 }], total: 2, page: 1, pageSize: 50 };
  assert.equal((await makeReader(disordered).read("/api/public/rankings")).status, "unavailable");
  const fame = { entries: [{ ...row, fame: 5 }, { ...row, rank: 2, name: "HigherLevel", level: 2, fame: 1 }], total: 2, page: 1, pageSize: 50 };
  assert.equal((await makeReader(fame).read("/api/public/rankings", { sort: "fame" })).status, "live");
});

void test("statistics reject inconsistent totals, classes and snapshot timestamps", async () => {
  assert.deepEqual((await makeReader(stats).read("/api/public/stats")).data, stats);
  for (const change of [{ totalCharacters: 2 }, { classDistribution: [{ jobName: "Beginner", count: 0 }] }, { totalCharacters: 2, classDistribution: [stats.classDistribution[0], stats.classDistribution[0]] }, { rankingSnapshotAt: "2026-09-13T09:59:59Z" }]) assert.equal((await makeReader({ ...stats, ...change }).read("/api/public/stats")).status, "unavailable");
});

void test("runtime expiration clears online population, rates and channels without losing verified DB statistics", async () => {
  let clock = at;
  const reader = createPublicReader({ now: () => clock, config: () => config, fetcher: async () => Response.json(envelope(telemetry)) });
  assert.deepEqual((await reader.read("/api/public/telemetry")).data, telemetry);
  clock += 30_001;
  const expired = await reader.read<PublicTelemetryData>("/api/public/telemetry");
  assert.equal(expired.status, "stale");
  assert.equal(expired.data?.totalCharacters, 1);
  assert.equal(expired.data?.runtimeStatus, "unavailable");
  assert.equal(expired.data?.online, null);
  assert.equal(expired.data?.playersOnline, null);
  assert.deepEqual(expired.data?.channels, []);
  assert.equal(expired.data?.rates.exp, null);
  assert.equal((await reader.read("/api/status")).data, null);
  const unknown = await makeReader({ ...telemetry, runtimeStatus: "unavailable", online: true, playersOnline: 9999 }).read<PublicTelemetryData>("/api/public/telemetry");
  assert.equal(unknown.data?.playersOnline, null);
  assert.equal(unknown.data?.online, null);
});

void test("verified offline is distinct from absent runtime and inconsistent populations fail closed", async () => {
  const offline = { ...telemetry, online: false, playersOnline: 0, uptimeSeconds: 0, channels: [{ channel: 1, status: "offline", playersOnline: 0 }] };
  assert.equal((await makeReader(offline).read<PublicTelemetryData>("/api/public/telemetry")).data?.online, false);
  for (const change of [{ online: false }, { channels: [runtime.channels[0], runtime.channels[0]] }, { channels: [{ channel: 1, status: "unknown", playersOnline: 2 }] }]) assert.equal((await makeReader({ ...telemetry, ...change }).read("/api/public/telemetry")).status, "unavailable");
});

void test("token is mandatory; HTTPS restrictions, bounded fetch and prefix preservation are enforced", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async (input, options) => {
    calls++;
    assert.equal(input instanceof URL ? input.href : typeof input === "string" ? input : input.url, "https://protected-bridge.invalid/reader/api/public/rankings?sort=level&page=1&limit=50");
    assert.deepEqual(options?.headers, { Accept: "application/json", Authorization: `Bearer ${config.token}` });
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return Response.json(envelope());
  };
  assert.equal((await createPublicReader({ now: () => at, config: () => config, fetcher }).read("/api/public/rankings")).status, "live");
  for (const settings of [{ url: config.url }, { ...config, token: "bad\nheader" }, { ...config, url: "https://user:pass@host.invalid" }, { ...config, url: "http://bridge.invalid", development: true }, { ...config, url: "http://127.0.0.1", development: false }, { ...config, url: `${config.url}?key=secret` }]) assert.equal((await createPublicReader({ now: () => at, config: () => settings, fetcher }).read("/api/public/rankings")).data, null);
  assert.equal(calls, 1);
});

void test("freshness rejects future and expired timestamps and explicitly labels bounded stale snapshots", async () => {
  for (const age of [-1, 120_001]) {
    const reader = createPublicReader({ now: () => at, config: () => config, fetcher: async () => Response.json(envelope(page, new Date(at - age).toISOString())) });
    assert.equal((await reader.read("/api/public/rankings")).status, "unavailable");
  }
  for (const [age, upstreamStatus] of [[30_001, "live"], [1, "stale"]] as const) {
    const reader = createPublicReader({ now: () => at, config: () => config, fetcher: async () => Response.json(envelope(page, new Date(at - age).toISOString(), upstreamStatus)) });
    const result = await reader.read("/api/public/rankings");
    assert.equal(result.status, "stale");
    assert.match(result.message, /previously verified/u);
    assert.ok(result.data);
  }
});

void test("503 has no invented rows; retained snapshots become stale and expire after120s", async () => {
  let clock = at, failed = false, calls = 0;
  const reader = createPublicReader({ now: () => clock, config: () => config, fetcher: async () => { calls++; return failed ? Response.json({ password: "private-driver-error" }, { status: 503 }) : Response.json(envelope()); } });
  assert.equal((await reader.read("/api/public/rankings")).status, "live");
  failed = true; clock += 10_001;
  const stale = await reader.read("/api/public/rankings");
  assert.equal(stale.status, "stale");
  assert.deepEqual(stale.data, page);
  clock = at + 120_001;
  const unavailable = await reader.read("/api/public/rankings");
  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.data, null);
  assert.equal(unavailable.asOf, null);
  assert.equal(JSON.stringify(unavailable).includes("private"), false);
  assert.equal(calls, 3);
});

void test("all equivalent pages and legacy ranking alias deduplicate in flight and cache", async () => {
  let calls = 0;
  const reader = createPublicReader({ now: () => at, config: () => config, fetcher: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); return Response.json(envelope()); } });
  const results = await Promise.all(Array.from({ length: 80 }, (_, index) => reader.read(index % 2 ? "/api/rankings" : "/api/public/rankings", index % 3 ? {} : { limit: 50, page: 1, sort: "level" })));
  assert.equal(calls, 1);
  assert.equal(results.every(result => result.status === "live"), true);
  assert.equal(reader.diagnostics().cacheEntries, 1);
});

void test("random query traffic cannot evade global backoff or grow concurrent fetches without bound", async () => {
  let calls = 0;
  const reader = createPublicReader({ now: () => at, config: () => config, fetcher: async () => { calls++; await new Promise(resolve => setTimeout(resolve, 5)); throw new Error("private failure"); } });
  const results = await Promise.all(Array.from({ length: 200 }, (_, index) => reader.read("/api/public/rankings", { page: index + 1 })));
  assert.equal(calls, PUBLIC_LIMITS.maxInflight);
  assert.equal(results.every(result => result.status === "unavailable" && result.data === null), true);
  await reader.read("/api/public/telemetry");
  assert.equal(calls, PUBLIC_LIMITS.maxInflight, "a different endpoint shares outage backoff");
  assert.equal(reader.diagnostics().inflight, 0);
  assert.ok(reader.diagnostics().nextAttemptAt > at);
});

void test("request token bucket, cache entry cap and total cache bytes remain bounded", async () => {
  let clock = at, calls = 0;
  const reader = createPublicReader({ now: () => clock, config: () => config, fetcher: async input => {
    calls++; const url = new URL(input instanceof URL ? input.href : typeof input === "string" ? input : input.url);
    return Response.json(envelope({ ...page, entries: [], total: 0, page: Number(url.searchParams.get("page")) }, new Date(clock).toISOString()));
  } });
  for (let pageNumber = 1; pageNumber <= 180; pageNumber++) { clock += 1000; await reader.read("/api/public/rankings", { page: pageNumber }); }
  assert.equal(reader.diagnostics().cacheEntries, PUBLIC_LIMITS.maxEntries);
  assert.ok(reader.diagnostics().cacheBytes <= PUBLIC_LIMITS.maxCacheBytes);
  const outcomes = await Promise.allSettled(Array.from({ length: 300 }, () => reader.read("/api/public/rankings", { page: 180 })));
  assert.ok(outcomes.some(result => result.status === "rejected" && result.reason instanceof PublicRateLimitError));
  assert.equal(calls, 180);
});

void test("transport rejects non-JSON, malformed UTF8 and oversized responses without leaking diagnostics", async () => {
  for (const response of [new Response("private error"), new Response(new Uint8Array([0xff]), { headers: { "content-type": "application/json" } }), new Response("x".repeat(PUBLIC_LIMITS.maxBodyBytes + 1), { headers: { "content-type": "application/json" } })]) {
    const result = await createPublicReader({ now: () => at, config: () => config, fetcher: async () => response }).read("/api/public/rankings");
    assert.equal(result.data, null);
    assert.equal(JSON.stringify(result).includes("private"), false);
  }
});

void test("early rejected response headers abort transport without leaving a streaming error body open", async () => {
  for (const [status, headers] of [[503, { "content-type": "application/json" }], [200, { "content-type": "text/plain" }], [200, { "content-type": "application/json", "content-length": String(PUBLIC_LIMITS.maxBodyBytes + 1) }]] as const) {
    let signal: AbortSignal | null | undefined;
    const reader = createPublicReader({ now: () => at, config: () => config, fetcher: async (_input, options) => {
      signal = options?.signal;
      // Deliberately never completes; header validation must abort immediately.
      return new Response(new ReadableStream({ start() {} }), { status, headers });
    } });
    assert.equal((await reader.read("/api/public/rankings")).data, null);
    assert.equal(signal?.aborted, true);
  }
});

void test("sustained randomized successful polling stays within the shared120/min upstream budget", async () => {
  let clock = at, calls = 0;
  const reader = createPublicReader({ now: () => clock, config: () => config, fetcher: async input => {
    calls++;
    const url = new URL(input instanceof URL ? input.href : typeof input === "string" ? input : input.url);
    return Response.json(envelope({ entries: [], total: 0, page: Number(url.searchParams.get("page")), pageSize: 50 }, new Date(clock).toISOString()));
  } });
  for (let second = 0; second < 60; second++) {
    await Promise.all(Array.from({ length: 20 }, (_, index) => reader.read("/api/public/rankings", { page: second * 20 + index + 1 })));
    clock += 1000;
  }
  assert.equal(calls, PUBLIC_LIMITS.upstreamBurst + 59 * PUBLIC_LIMITS.upstreamPerSecond);
  assert.ok(reader.diagnostics().cacheEntries <= PUBLIC_LIMITS.maxEntries);
});

void test("same-origin GET returns503 with no fake data and400 for invalid requests with safe headers", async (t) => {
  const previousUrl = process.env.TRIXTER_READ_API_URL, previousToken = process.env.TRIXTER_READ_API_TOKEN;
  delete process.env.TRIXTER_READ_API_URL; delete process.env.TRIXTER_READ_API_TOKEN;
  t.after(() => { if (previousUrl === undefined) delete process.env.TRIXTER_READ_API_URL; else process.env.TRIXTER_READ_API_URL = previousUrl; if (previousToken === undefined) delete process.env.TRIXTER_READ_API_TOKEN; else process.env.TRIXTER_READ_API_TOKEN = previousToken; });
  for (const endpoint of ["rankings", "characters", "telemetry", "stats"]) {
    const result = await GET(new Request(`https://portal.invalid/api/public/${endpoint}`));
    assert.equal(result.status, 503);
    assert.equal((await result.json()).data, null);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.equal(result.headers.get("x-content-type-options"), "nosniff");
  }
  for (const query of ["page=1&page=2", "accountid=1", "limit=1000", "__proto__=x", "__proto__=x&__proto__=y"]) assert.equal((await GET(new Request(`https://portal.invalid/api/public/rankings?${query}`))).status, 400);
});

void test("same-origin request limits return429 while server rendering degrades to unavailable", async (t) => {
  const oldUrl = process.env.TRIXTER_READ_API_URL;
  delete process.env.TRIXTER_READ_API_URL;
  t.after(() => { if (oldUrl === undefined) delete process.env.TRIXTER_READ_API_URL; else process.env.TRIXTER_READ_API_URL = oldUrl; });
  const responses = await Promise.all(Array.from({ length: 300 }, () => GET(new Request("https://portal.invalid/api/public/telemetry"))));
  const limited = responses.find(response => response.status === 429);
  assert.ok(limited);
  assert.equal(limited.headers.get("retry-after"), "1");
  assert.equal((await limited.json()).data, null);
  const rendered = await readPortal("/api/status");
  assert.equal(rendered.status, "unavailable");
  assert.equal(rendered.data, null);
});
