import { TELEMETRY_KEYS } from "./contracts.ts";
import type { AchievementsData, CharacterAchievementsData, PortalEnvelope, PortalQuery, StatusData } from "./contracts.ts";

// This module is for Server Components and Route Handlers only. No NEXT_PUBLIC secret or DB connection.
type Obj = Record<string, unknown>;
type Kind = "status" | "rankings" | "daily" | "weekly" | "character" | "achievements" | "characterAchievements" | "telemetry" | "market" | "items" | "mobs";
const MAX_BODY_BYTES = 1024 * 1024;
const TIMEOUT_MS = 4000;
const namePattern = /^[A-Za-z0-9]{1,13}$/;
const metricPattern = /^[A-Za-z][A-Za-z0-9_.]{0,63}$/;
const dimensionPattern = /^[a-z][a-z0-9_]{0,63}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const decimalPattern = /^(0|[1-9]\d{0,18})$/;
const signedBigIntMax = "9223372036854775807";

function object(value: unknown): Obj {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid object");
  return value as Obj;
}
function string(value: unknown, max = 120): string {
  if (typeof value !== "string" || value.length > max) throw new Error("Invalid text");
  for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) < 32 || value.charCodeAt(i) === 127) throw new Error("Invalid text");
  return value;
}
function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) throw new Error("Invalid number");
  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") throw new Error("Invalid boolean");
  return value;
}
function nullable<T>(value: unknown, parse: (v: unknown) => T): T | null { return value === null ? null : parse(value); }
function decimal(value: unknown): string {
  const result = string(value, 19);
  if (!decimalPattern.test(result) || (result.length === 19 && result > signedBigIntMax)) throw new Error("Invalid BIGINT");
  return result;
}
function positiveDecimal(value: unknown): string { const result = decimal(value); if (result === "0") throw new Error("Invalid threshold"); return result; }
function name(value: unknown): string { const result = string(value, 13); if (!namePattern.test(result)) throw new Error("Invalid name"); return result; }
function key(value: unknown): string { const result = string(value, 96); if (!/^[A-Za-z0-9_.-]+$/.test(result)) throw new Error("Invalid key"); return result; }
function date(value: unknown): string { const result = string(value, 10); if (!datePattern.test(result) || new Date(`${result}T00:00:00Z`).toISOString().slice(0, 10) !== result) throw new Error("Invalid date"); return result; }
function timestamp(value: unknown): string { const result = string(value, 35); if (!/^\d{4}-\d{2}-\d{2}T.+Z$/.test(result) || !Number.isFinite(Date.parse(result))) throw new Error("Invalid timestamp"); return result; }
function zone(value: unknown): string { const result = string(value, 64); new Intl.DateTimeFormat("en", { timeZone: result }); return result; }
function list<T>(value: unknown, parse: (v: unknown) => T, max = 100): T[] { if (!Array.isArray(value) || value.length > max) throw new Error("Invalid list"); return value.map(parse); }
function oneOf<T extends string>(value: unknown, values: readonly T[]): T { if (!values.includes(value as T)) throw new Error("Invalid enum"); return value as T; }
function entry(value: unknown) {
  const v = object(value);
  return { rank: integer(v.rank, 1), name: name(v.name), level: integer(v.level, 1, 1000), jobId: integer(v.jobId, 0, 99999), jobName: nullable(v.jobName, string), fame: integer(v.fame, -2147483648, 2147483647), score: nullable(v.score, decimal) };
}
function leaderboard(value: unknown) {
  const entries = list(value, entry);
  if (new Set(entries.map((row) => row.rank)).size !== entries.length || new Set(entries.map((row) => row.name.toLowerCase())).size !== entries.length) throw new Error("Duplicate standing");
  return entries;
}
function character(value: unknown) {
  const v = object(value);
  return { name: name(v.name), level: integer(v.level, 1, 1000), jobId: integer(v.jobId, 0, 99999), jobName: nullable(v.jobName, string), fame: integer(v.fame, -2147483648, 2147483647), world: integer(v.world, 0, 255), rank: nullable(v.rank, (n) => integer(n, 1)) };
}
function definition(value: unknown) {
  const v = object(value);
  return { key: key(v.key), category: key(v.category), name: string(v.name), description: string(v.description, 1000), eventKey: key(v.eventKey), dimension: key(v.dimension), aggregation: oneOf(v.aggregation, ["SNAPSHOT", "DELTA", "UNIQUE"] as const), threshold: positiveDecimal(v.threshold), points: integer(v.points, 1, 1000000), displayOrder: integer(v.displayOrder), enabled: boolean(v.enabled) };
}
function progress(value: unknown) {
  const v = object(value);
  const result = { key: key(v.key), currentValue: decimal(v.currentValue), threshold: positiveDecimal(v.threshold), unlockedAt: nullable(v.unlockedAt, timestamp), pointsAwarded: integer(v.pointsAwarded, 0, 1000000) };
  const thresholdReached = BigInt(result.currentValue) >= BigInt(result.threshold);
  if (result.unlockedAt === null ? result.pointsAwarded !== 0 || thresholdReached : result.pointsAwarded === 0 || !thresholdReached) throw new Error("Inconsistent achievement unlock");
  return result;
}
function unlock(value: unknown) { const v = object(value); return { key: key(v.key), unlockedAt: timestamp(v.unlockedAt), pointsAwarded: integer(v.pointsAwarded, 1, 1000000) }; }
function uniqueKeys(rows: { key: string }[]): void { if (new Set(rows.map((row) => row.key)).size !== rows.length) throw new Error("Duplicate achievement key"); }
function achievementCatalog(value: Obj): AchievementsData {
  const definitions = list(value.definitions, definition, 1000);
  uniqueKeys(definitions);
  const totalPoints = integer(value.totalPoints, 0, 1000000000);
  if (definitions.reduce((total, row) => total + (row.enabled ? row.points : 0), 0) !== totalPoints) throw new Error("Inconsistent catalog points");
  return { catalogVersion: integer(value.catalogVersion, 1), catalogKey: key(value.catalogKey), totalPoints, definitions };
}
function characterAchievements(value: Obj): CharacterAchievementsData {
  const achievements = list(value.achievements, progress, 1000), recentUnlocks = list(value.recentUnlocks, unlock, 20);
  uniqueKeys(achievements); uniqueKeys(recentUnlocks);
  const totalPoints = integer(value.totalPoints, 0, 1000000000), points = integer(value.points, 0, totalPoints);
  if (achievements.reduce((total, row) => total + row.pointsAwarded, 0) !== points) throw new Error("Inconsistent character points");
  const progressByKey = new Map(achievements.map((row) => [row.key, row]));
  for (const recent of recentUnlocks) {
    const row = progressByKey.get(recent.key);
    if (!row || row.unlockedAt === null || Date.parse(row.unlockedAt) !== Date.parse(recent.unlockedAt) || row.pointsAwarded !== recent.pointsAwarded) throw new Error("Unrelated recent unlock");
  }
  return { name: name(value.name), catalogVersion: integer(value.catalogVersion, 1), points, totalPoints, achievements, recentUnlocks };
}

function publicStatus(value: Obj): StatusData {
  const rates = object(value.rates);
  const rate = (input: unknown) => {
    if (typeof input !== "number" || !Number.isFinite(input) || input < 0 || input > 1000000) throw new Error("Invalid rate");
    return input;
  };
  const publicLabel = (input: unknown) => {
    const label = string(input, 64);
    if (!label.trim()) throw new Error("Empty public label");
    return label;
  };
  const result: StatusData = {
    online: nullable(value.online, boolean), playersOnline: nullable(value.playersOnline, integer),
    version: nullable(value.version, (input) => string(input, 40)),
    rates: { exp: nullable(rates.exp, rate), meso: nullable(rates.meso, rate), drop: nullable(rates.drop, rate) },
  };
  // Preserve the original status shape for older read backends. Missing channel observations are never zeroes.
  if (value.world !== undefined) result.world = nullable(value.world, (input) => {
    const world = object(input);
    return { id: integer(world.id, 0, 255), name: nullable(world.name, publicLabel) };
  });
  if (value.channels !== undefined) result.channels = nullable(value.channels, (input) => {
    const channels = list(input, (row) => {
      const channel = object(row);
      return { id: integer(channel.id, 1, 255), name: nullable(channel.name, publicLabel), online: nullable(channel.online, boolean), playersOnline: nullable(channel.playersOnline, integer) };
    }, 100);
    if (new Set(channels.map((channel) => channel.id)).size !== channels.length) throw new Error("Duplicate public channel");
    return channels;
  });
  return result;
}

/** Project every backend response through an explicit public field allowlist. */
export function validatePortalData(kind: Kind, value: unknown): unknown {
  const v = object(value);
  switch (kind) {
    case "status": return publicStatus(v);
    case "rankings": return { entries: leaderboard(v.entries), total: nullable(v.total, integer) };
    case "daily": case "weekly": {
      const entries = leaderboard(v.entries), finalized = boolean(v.finalized), winner = nullable(v.winner, name);
      if (entries.some((row, index) => row.rank !== index + 1 || row.score === null)) throw new Error("Invalid competition positions");
      if (!finalized && winner !== null) throw new Error("Provisional results cannot have a winner");
      if (winner !== null && !entries.some((r) => r.rank === 1 && r.name === winner)) throw new Error("Winner must match rank one");
      const result = { entries, total: nullable(v.total, integer), metric: key(v.metric), date: nullable(v.date, date), weekStart: nullable(v.weekStart, date), weekEnd: nullable(v.weekEnd, date), zone: zone(v.zone), finalized, winner };
      if (kind === "daily" && (result.date === null || result.weekStart !== null || result.weekEnd !== null)) throw new Error("Invalid daily period");
      if (kind === "weekly" && (result.date !== null || result.weekStart === null || result.weekEnd === null || result.weekStart > result.weekEnd)) throw new Error("Invalid weekly period");
      return result;
    }
    case "character": return character(v);
    case "achievements": return achievementCatalog(v);
    case "characterAchievements": return characterAchievements(v);
    case "telemetry": return { name: name(v.name), zone: zone(v.zone), coverage: oneOf(v.coverage, ["partial", "verified"] as const), counters: list(v.counters, (item) => { const c = object(item); return { metric: oneOf(c.metric, TELEMETRY_KEYS), dimension: key(c.dimension), lifetime: nullable(c.lifetime, decimal), daily: nullable(c.daily, decimal), date: nullable(c.date, date), rankingEligible: boolean(c.rankingEligible) }; }, 100) };
    case "market": return { total: nullable(v.total, integer), items: list(v.items, (item) => { const i = object(item); const currency = oneOf(i.currency, ["mesos", "item", "nx"] as const), currencyItemId = nullable(i.currencyItemId, integer); if ((currency === "item") !== (currencyItemId !== null)) throw new Error("Invalid currency"); return { shopId: integer(i.shopId, 1), npcId: integer(i.npcId, 1), npcName: nullable(i.npcName, string), category: string(i.category), itemId: integer(i.itemId, 1), itemName: string(i.itemName), price: decimal(i.price), currency, currencyItemId, stock: nullable(i.stock, integer), rules: list(i.rules, (r) => string(r, 300), 10) }; }) };
    case "items": return { total: nullable(v.total, integer), items: list(v.items, (item) => { const i = object(item); return { id: integer(i.id, 1), name: string(i.name), category: string(i.category), description: nullable(i.description, (x) => string(x, 1000)), requiredLevel: nullable(i.requiredLevel, integer) }; }) };
    case "mobs": return { total: nullable(v.total, integer), mobs: list(v.mobs, (item) => { const i = object(item); return { id: integer(i.id, 1), name: string(i.name), level: integer(i.level, 1), boss: boolean(i.boss), hp: decimal(i.hp), exp: decimal(i.exp) }; }) };
  }
}

export function portalRequest(path: string, query: PortalQuery = {}): { kind: Kind; path: string; query: URLSearchParams } {
  const fixed: Record<string, Kind> = { "/api/status": "status", "/api/rankings": "rankings", "/api/rankings/daily": "daily", "/api/rankings/weekly": "weekly", "/api/achievements": "achievements", "/api/free-market": "market", "/api/database/items": "items", "/api/database/mobs": "mobs" };
  let kind = fixed[path];
  if (!kind) {
    const match = /^\/api\/(characters|telemetry)\/([A-Za-z0-9]{1,13})(\/achievements)?$/.exec(path);
    if (!match || (match[1] === "telemetry" && match[3])) throw new Error("Unsupported portal endpoint");
    kind = match[1] === "telemetry" ? "telemetry" : match[3] ? "characterAchievements" : "character";
  }
  const allowed: Partial<Record<Kind, string[]>> = { rankings: ["sort", "job", "world", "page", "limit"], daily: ["metric", "date", "limit"], weekly: ["metric", "weekStart", "limit"], telemetry: ["date", "metric", "dimension"], market: ["q", "shopId", "category", "page", "limit"], items: ["q", "category", "page", "limit"], mobs: ["q", "boss", "page", "limit"] };
  const parsed = new URLSearchParams();
  for (const [param, raw] of Object.entries(query)) {
    if (raw === undefined) continue;
    if (!allowed[kind]?.includes(param)) throw new Error("Unsupported query parameter");
    const value = String(raw);
    if (["page", "limit", "job", "world", "shopId"].includes(param)) { if (!/^\d{1,7}$/.test(value)) throw new Error("Invalid numeric query"); const n = Number(value); if (param === "limit" && (n < 1 || n > 100) || param === "page" && (n < 1 || n > 10000)) throw new Error("Query out of range"); }
    else if (["date", "weekStart"].includes(param)) date(value);
    else if (param === "metric" && !metricPattern.test(value) || param === "dimension" && !dimensionPattern.test(value)) throw new Error("Invalid metric");
    else if (param === "sort" && !["level", "fame"].includes(value) || param === "boss" && !["true", "false"].includes(value)) throw new Error("Invalid filter");
    else string(value, param === "q" ? 80 : 96);
    parsed.set(param, value);
  }
  return { kind, path, query: parsed };
}
function unavailable<T>(message = "Live data is not available yet."): PortalEnvelope<T> { return { status: "unavailable", data: null, asOf: null, message, source: "none" }; }

/** Server-only reader, also used by the same-origin GET proxy. No user cookies or credentials forwarded. */
export async function readPortal<T>(path: string, query: PortalQuery = {}): Promise<PortalEnvelope<T>> {
  if (typeof window !== "undefined") throw new Error("Portal reader requires the server");
  const request = portalRequest(path, query);
  if (request.kind === "daily" && process.env.TRIXTER_DAILY_RANKINGS_ENABLED !== "true" || request.kind === "weekly" && process.env.TRIXTER_WEEKLY_RANKINGS_ENABLED !== "true") return { ...unavailable<T>("Competition standings will open after server validation."), status: "disabled" };
  const configured = process.env.TRIXTER_READ_API_URL;
  if (!configured) return unavailable<T>();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const base = new URL(configured);
    if (base.username || base.password || base.search || base.hash || (base.protocol !== "https:" && !(process.env.NODE_ENV === "development" && base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)))) throw new Error("Invalid backend origin");
    // Preserve an optional administrator-configured base prefix. User input never changes the origin.
    const url = new URL(`${base.pathname.replace(/\/$/, "")}${request.path}?${request.query}`, base.origin);
    const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store", redirect: "error", signal: controller.signal });
    if (!response.ok || !response.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("Unavailable backend");
    if (Number(response.headers.get("content-length")) > MAX_BODY_BYTES) throw new Error("Oversized response");
    if (!response.body) throw new Error("Missing response");
    const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
    for (;;) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > MAX_BODY_BYTES) { await reader.cancel(); throw new Error("Oversized response"); } chunks.push(chunk.value); }
    const body = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length; }
    const payload = object(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)));
    if (payload.status !== "live") return unavailable<T>();
    const asOf = timestamp(payload.asOf);
    const age = Date.now() - Date.parse(asOf);
    if (age < -60000 || (request.kind === "status" && age > 120000)) throw new Error("Invalid freshness");
    const data = object(validatePortalData(request.kind, payload.data));
    if (["character", "characterAchievements", "telemetry"].includes(request.kind)) {
      const requestedName = request.path.split("/")[3];
      if (name(data.name).toLowerCase() !== requestedName.toLowerCase()) throw new Error("Mismatched response subject");
    }
    if (request.kind === "daily" || request.kind === "weekly") {
      for (const filter of ["metric", "date", "weekStart"]) if (request.query.has(filter) && data[filter] !== request.query.get(filter)) throw new Error("Mismatched competition period or metric");
    }
    if (request.kind === "telemetry") {
      for (const counter of data.counters as Obj[]) {
        for (const filter of ["metric", "dimension", "date"]) if (request.query.has(filter) && counter[filter] !== request.query.get(filter)) throw new Error("Mismatched telemetry filter");
      }
    }
    return { status: "live", data: data as T, asOf, message: "", source: "backend" };
  } catch { return unavailable<T>("Live data is temporarily unavailable."); }
  finally { clearTimeout(timeout); }
}

/** Fail closed if the live character achievement payload cannot be reconciled with its live catalog. */
export async function readCharacterAchievementsVerified(characterName: string): Promise<PortalEnvelope<CharacterAchievementsData>> {
  const requestedName = name(characterName);
  const [catalog, character] = await Promise.all([
    readPortal<AchievementsData>("/api/achievements"),
    readPortal<CharacterAchievementsData>(`/api/characters/${requestedName}/achievements`),
  ]);
  if (catalog.status !== "live" || character.status !== "live" || !catalog.data || !character.data) return unavailable("Verified character achievements are not available yet.");
  try {
    const definitions = new Map(catalog.data.definitions.filter((row) => row.enabled).map((row) => [row.key, row]));
    if (character.data.catalogVersion !== catalog.data.catalogVersion || character.data.totalPoints !== catalog.data.totalPoints) throw new Error("Mismatched catalog");
    for (const row of character.data.achievements) {
      const expected = definitions.get(row.key);
      if (!expected || row.threshold !== expected.threshold || row.pointsAwarded !== (row.unlockedAt === null ? 0 : expected.points)) throw new Error("Mismatched achievement definition");
    }
    return { ...character, data: { ...character.data, compatibleDefinitions: [...definitions.values()] } };
  } catch { return unavailable("Verified character achievements are temporarily unavailable."); }
}
