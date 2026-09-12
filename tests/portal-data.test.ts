import assert from "node:assert/strict";
import test from "node:test";
import { portalRequest, readCharacterAchievementsVerified, readPortal, validatePortalData } from "../lib/portal/data.ts";

const status = { online: true, playersOnline: 12, version: "111.1", rates: { exp: null, meso: null, drop: null } };
const row = { rank: 1, name: "Example", level: 30, jobId: 100, jobName: "Warrior", fame: 0, score: "9223372036854775807" };
const rankingRow = { ...row, exp: "9223372036854775807", guildName: null };
const rankingPage = { entries: [rankingRow], total: 1, page: 1, pageSize: 50 };
const unlockedAt = "2026-09-12T10:00:00.000Z";
const achievementDefinition = { key: "TEST_LEVEL_010", category: "LEVELING", name: "Matched live title", description: "Test-only catalog definition.", eventKey: "progress.level", dimension: "all", aggregation: "SNAPSHOT", threshold: "10", points: 10, displayOrder: 10, enabled: true };
const secondDefinition = { ...achievementDefinition, key: "TEST_LEVEL_030", threshold: "30", points: 20, displayOrder: 20 };
const achievementCatalog = { catalogVersion: 2, catalogKey: "test-only", totalPoints: 30, definitions: [achievementDefinition, secondDefinition] };
const unlockedAchievement = { key: achievementDefinition.key, currentValue: "12", threshold: "10", unlockedAt, pointsAwarded: 10 };
const lockedAchievement = { key: secondDefinition.key, currentValue: "12", threshold: "30", unlockedAt: null, pointsAwarded: 0 };
const achievementCharacter = { name: "Example", catalogVersion: 2, points: 10, totalPoints: 30, achievements: [unlockedAchievement, lockedAchievement], recentUnlocks: [{ key: achievementDefinition.key, unlockedAt, pointsAwarded: 10 }] };

void test("achievement catalog requires positive milestones, unique keys and exact available AP", () => {
  assert.doesNotThrow(() => validatePortalData("achievements", achievementCatalog));
  assert.throws(() => validatePortalData("achievements", { ...achievementCatalog, totalPoints: 999999 }));
  assert.throws(() => validatePortalData("achievements", { ...achievementCatalog, totalPoints: 20, definitions: [achievementDefinition, achievementDefinition] }));
  for (const changed of [{ threshold: "0" }, { points: 0 }]) assert.throws(() => validatePortalData("achievements", { ...achievementCatalog, definitions: [{ ...achievementDefinition, ...changed }, secondDefinition] }));
  assert.doesNotThrow(() => validatePortalData("achievements", { ...achievementCatalog, totalPoints: 10, definitions: [achievementDefinition, { ...secondDefinition, enabled: false }] }));
});

void test("character AP cannot exceed totals, come from locked rows, or contradict progress/unlock records", () => {
  assert.doesNotThrow(() => validatePortalData("characterAchievements", achievementCharacter));
  for (const changed of [
    { points: 999999, totalPoints: 2160 },
    { points: 11 },
    { achievements: [unlockedAchievement, unlockedAchievement] },
    { achievements: [unlockedAchievement, { ...lockedAchievement, pointsAwarded: 20 }], points: 30 },
    { achievements: [{ ...unlockedAchievement, currentValue: "9" }, lockedAchievement] },
    { achievements: [unlockedAchievement, { ...lockedAchievement, currentValue: "30" }] },
    { achievements: [{ ...unlockedAchievement, pointsAwarded: 0 }, lockedAchievement], points: 0 },
    { recentUnlocks: [achievementCharacter.recentUnlocks[0], achievementCharacter.recentUnlocks[0]] },
    { recentUnlocks: [{ ...achievementCharacter.recentUnlocks[0], key: "UNRELATED_KEY" }] },
    { recentUnlocks: [{ ...achievementCharacter.recentUnlocks[0], pointsAwarded: 20 }] },
    { recentUnlocks: [{ ...achievementCharacter.recentUnlocks[0], unlockedAt: "2026-09-11T10:00:00.000Z" }] },
  ]) assert.throws(() => validatePortalData("characterAchievements", { ...achievementCharacter, ...changed }));
});

void test("verified character achievements require the matching live catalog and use its names", async (t) => {
  const originalFetch = globalThis.fetch, oldUrl = process.env.TRIXTER_READ_API_URL;
  t.after(() => { globalThis.fetch = originalFetch; if (oldUrl === undefined) delete process.env.TRIXTER_READ_API_URL; else process.env.TRIXTER_READ_API_URL = oldUrl; });
  process.env.TRIXTER_READ_API_URL = "https://reviewed-backend.invalid";
  let catalogData: unknown = achievementCatalog, characterData: unknown = achievementCharacter;
  let catalogAvailable = true;
  globalThis.fetch = async (input) => {
    const url = input instanceof URL ? input : new URL(typeof input === "string" ? input : input.url);
    const isCatalog = url.pathname === "/api/achievements";
    if (isCatalog && !catalogAvailable) return new Response(null, { status: 503 });
    return Response.json({ status: "live", asOf: new Date().toISOString(), data: isCatalog ? catalogData : characterData });
  };
  const valid = await readCharacterAchievementsVerified("Example");
  assert.equal(valid.status, "live");
  assert.equal(valid.data?.compatibleDefinitions?.[0].name, "Matched live title");
  for (const changed of [
    { catalogVersion: 3 },
    { totalPoints: 31 },
    { achievements: [{ ...unlockedAchievement, threshold: "11" }, lockedAchievement] },
    { points: 20, achievements: [{ ...unlockedAchievement, pointsAwarded: 20 }, lockedAchievement], recentUnlocks: [] },
    { achievements: [{ ...unlockedAchievement, key: "UNRELATED_KEY" }, lockedAchievement], recentUnlocks: [] },
  ]) {
    characterData = { ...achievementCharacter, ...changed };
    assert.equal((await readCharacterAchievementsVerified("Example")).status, "unavailable");
  }
  characterData = { ...achievementCharacter, points: 0, totalPoints: 20, achievements: [lockedAchievement], recentUnlocks: [] };
  catalogData = { ...achievementCatalog, totalPoints: 20, definitions: [{ ...achievementDefinition, enabled: false }, secondDefinition] };
  assert.equal((await readCharacterAchievementsVerified("Example")).status, "live");
  characterData = { ...achievementCharacter, totalPoints: 20 };
  assert.equal((await readCharacterAchievementsVerified("Example")).status, "unavailable");
  catalogData = achievementCatalog; characterData = achievementCharacter; catalogAvailable = false;
  assert.equal((await readCharacterAchievementsVerified("Example")).status, "unavailable");
});

void test("public reader rejects unknown routes and query injection before fetching", () => {
  for (const path of ["https://outside.invalid", "/api/../accounts", "/api/accounts", "/api/characters/a%2fb", "/api/telemetry/Example/achievements"]) assert.throws(() => portalRequest(path));
  assert.throws(() => portalRequest("/api/rankings", { password: "never-forward" }));
  assert.throws(() => portalRequest("/api/rankings", { limit: 101 }));
  assert.throws(() => portalRequest("/api/rankings/daily", { date: "2026-02-30" }));
  assert.throws(() => portalRequest("/api/rankings", { sort: "level; DROP" }));
  assert.equal(portalRequest("/api/characters/Example/achievements").kind, "characterAchievements");
  assert.equal(portalRequest("/api/database/items", { q: "Glass & tools" }).query.get("q"), "Glass & tools");
});

void test("BIGINT strings remain exact and unsafe numeric counters are rejected", () => {
  const result = validatePortalData("rankings", rankingPage) as { entries: { score: string }[] };
  assert.equal(result.entries[0].score, "9223372036854775807");
  for (const score of [9223372036854776000, "9223372036854775808", "-1", "01", "1e10"]) assert.throws(() => validatePortalData("rankings", { ...rankingPage, entries: [{ ...rankingRow, score }] }));
});

void test("backend payloads are projected to public fields only", () => {
  const result = validatePortalData("rankings", { ...rankingPage, entries: [{ ...rankingRow, accountid: 7, password: "private", id: 42, world: 0 }], database: "private" });
  assert.deepEqual(result, rankingPage);
  assert.deepEqual(validatePortalData("status", { ...status, accounts: ["private"] }), status);
});

void test("tournament winners require finalized rank-one evidence", () => {
  const daily = { entries: [row], total: 1, metric: "combat.mobs_killed", date: "2026-09-12", weekStart: null, weekEnd: null, zone: "Europe/Ljubljana", finalized: false, winner: null };
  assert.doesNotThrow(() => validatePortalData("daily", daily));
  assert.throws(() => validatePortalData("daily", { ...daily, winner: "Example" }));
  assert.throws(() => validatePortalData("daily", { ...daily, finalized: true, winner: "WrongName" }));
  assert.throws(() => validatePortalData("daily", { ...daily, date: null }));
  assert.doesNotThrow(() => validatePortalData("daily", { ...daily, finalized: true, winner: "Example" }));
  assert.throws(() => validatePortalData("daily", { ...daily, entries: [{ ...row, rank: 101 }] }));
  assert.throws(() => validatePortalData("rankings", { ...rankingPage, entries: [rankingRow, rankingRow], total: 2 }));
});

void test("upstream character identity and requested historical period must match", async (t) => {
  const originalFetch = globalThis.fetch, oldUrl = process.env.TRIXTER_READ_API_URL, oldDaily = process.env.TRIXTER_DAILY_RANKINGS_ENABLED;
  t.after(() => { globalThis.fetch = originalFetch; if (oldUrl === undefined) delete process.env.TRIXTER_READ_API_URL; else process.env.TRIXTER_READ_API_URL = oldUrl; if (oldDaily === undefined) delete process.env.TRIXTER_DAILY_RANKINGS_ENABLED; else process.env.TRIXTER_DAILY_RANKINGS_ENABLED = oldDaily; });
  process.env.TRIXTER_READ_API_URL = "https://reviewed-backend.invalid";
  process.env.TRIXTER_DAILY_RANKINGS_ENABLED = "true";
  globalThis.fetch = async () => Response.json({ status: "live", asOf: new Date().toISOString(), data: { name: "Other", level: 30, jobId: 100, jobName: "Warrior", fame: 0, world: 0, rank: 1 } });
  assert.equal((await readPortal("/api/characters/Example")).status, "unavailable");
  globalThis.fetch = async () => Response.json({ status: "live", asOf: new Date().toISOString(), data: { entries: [row], total: 1, metric: "MOBS_KILLED", date: "2026-09-12", weekStart: null, weekEnd: null, zone: "Europe/Ljubljana", finalized: false, winner: null } });
  assert.equal((await readPortal("/api/rankings/daily", { metric: "MOBS_KILLED", date: "2026-09-11" })).status, "unavailable");
  assert.equal((await readPortal("/api/rankings/daily", { metric: "NX_EARNED", date: "2026-09-12" })).status, "unavailable");
  assert.equal((await readPortal("/api/rankings/daily", { metric: "MOBS_KILLED", date: "2026-09-12" })).status, "live");
});

void test("missing backend and disabled competitions never produce fake players", async (t) => {
  const keys = ["TRIXTER_READ_API_URL", "TRIXTER_DAILY_RANKINGS_ENABLED", "TRIXTER_WEEKLY_RANKINGS_ENABLED", "TRIXTER_DEV_FIXTURES"];
  const previous = keys.map((key) => process.env[key]);
  t.after(() => keys.forEach((key, index) => { if (previous[index] === undefined) delete process.env[key]; else process.env[key] = previous[index]; }));
  keys.forEach((key) => { delete process.env[key]; });
  process.env.TRIXTER_DEV_FIXTURES = "true";
  assert.equal((await readPortal("/api/status")).data, null);
  assert.equal((await readPortal("/api/rankings/daily")).status, "disabled");
  assert.equal((await readPortal("/api/rankings/weekly")).status, "disabled");
});

void test("transport has bounded requests, no credentials, and sanitized failures", async (t) => {
  const oldUrl = process.env.TRIXTER_READ_API_URL;
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; if (oldUrl === undefined) delete process.env.TRIXTER_READ_API_URL; else process.env.TRIXTER_READ_API_URL = oldUrl; });
  process.env.TRIXTER_READ_API_URL = "https://reviewed-backend.invalid/readonly";
  let calls = 0;
  globalThis.fetch = async (input, options) => {
    calls++;
    assert.equal(input instanceof URL ? input.href : typeof input === "string" ? input : input.url, "https://reviewed-backend.invalid/readonly/api/status?");
    assert.deepEqual(options?.headers, { Accept: "application/json" });
    assert.equal(options?.redirect, "error");
    assert.equal(options?.cache, "no-store");
    assert.ok(options?.signal);
    return Response.json({ status: "live", asOf: new Date().toISOString(), data: { ...status, password: "private" } });
  };
  assert.deepEqual((await readPortal("/api/status")).data, status);
  assert.equal(calls, 1);
  globalThis.fetch = async () => { throw new Error("Sensitive upstream details"); };
  const failure = await readPortal("/api/status");
  assert.equal(failure.status, "unavailable");
  assert.equal(JSON.stringify(failure).includes("Sensitive"), false);
  globalThis.fetch = async () => Response.json({ status: "live", asOf: "2000-01-01T00:00:00Z", data: status });
  assert.equal((await readPortal("/api/status")).status, "unavailable");
  globalThis.fetch = async () => new Response("x".repeat(1024 * 1024 + 1), { headers: { "content-type": "application/json" } });
  assert.equal((await readPortal("/api/status")).status, "unavailable");
  process.env.TRIXTER_READ_API_URL = "https://user:password@reviewed-backend.invalid";
  assert.equal((await readPortal("/api/status")).status, "unavailable");
});
