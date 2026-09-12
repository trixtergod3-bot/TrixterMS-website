import { DA_CARRIER_JOBS, resolveJobName } from './jobs.mjs';

export class UnavailableError extends Error {
  constructor() { super('Rankings unavailable'); }
}
export class QueryError extends Error {
  constructor() { super('Invalid ranking query'); }
}

function boundedInteger(value, min, max) {
  if (typeof value !== 'number' && typeof value !== 'string' && typeof value !== 'bigint') throw new UnavailableError();
  if (typeof value === 'string' && !/^-?(0|[1-9][0-9]*)$/u.test(value)) throw new UnavailableError();
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw new UnavailableError();
  return n;
}

function publicText(value, maxLength) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maxLength ||
      Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) throw new UnavailableError();
  return value;
}

export function projectSourceRow(row) {
  // Construct every field explicitly: unexpected columns can never leave the bridge.
  if (!row || typeof row !== 'object') throw new UnavailableError();
  const jobId = boundedInteger(row.jobId, 0, 99_999);
  const marker = row.isDemonAvenger === true || row.isDemonAvenger === 1 ||
    row.isDemonAvenger === 1n || row.isDemonAvenger === '1';
  const isDemonAvenger = marker && DA_CARRIER_JOBS.includes(jobId);
  const exp = String(row.exp);
  if (typeof row.exp === 'number' && !Number.isSafeInteger(row.exp)) throw new UnavailableError();
  if (!/^(0|[1-9][0-9]{0,18})$/u.test(exp) || BigInt(exp) > 9_223_372_036_854_775_807n) {
    throw new UnavailableError();
  }
  return Object.freeze({
    internalId: boundedInteger(row.internalId, 1, 2_147_483_647),
    world: boundedInteger(row.world, 0, 127),
    name: publicText(row.name, 13),
    level: boundedInteger(row.level, 1, 1000),
    exp,
    jobId,
    jobName: resolveJobName(jobId, isDemonAvenger),
    fame: boundedInteger(row.fame, -2_147_483_648, 2_147_483_647),
    guildName: row.guildName === null || row.guildName === '' ? null : publicText(row.guildName, 45),
    isDemonAvenger,
  });
}

function compareProgress(a, b) {
  if (a.level !== b.level) return b.level - a.level;
  const first = BigInt(a.exp), second = BigInt(b.exp);
  if (first !== second) return first > second ? -1 : 1;
  return a.internalId - b.internalId;
}

export function createSnapshot(rows, asOf, { maxRows, maxBytes }) {
  if (!Array.isArray(rows) || rows.length > maxRows) throw new UnavailableError();
  const ids = new Set();
  let bytes = 0;
  const projected = rows.map((row) => {
    const safe = projectSourceRow(row);
    if (ids.has(safe.internalId)) throw new UnavailableError();
    ids.add(safe.internalId);
    bytes += Buffer.byteLength(JSON.stringify(safe), 'utf8');
    if (bytes > maxBytes) throw new UnavailableError();
    return safe;
  });
  const level = Object.freeze(projected.sort(compareProgress));
  const fame = Object.freeze([...level].sort((a, b) => b.fame - a.fame || compareProgress(a, b)));
  return Object.freeze({ asOf, level, fame });
}

export function parseRankingQuery(params) {
  const permitted = new Set(['page', 'limit', 'world', 'job', 'class', 'sort']);
  for (const key of params.keys()) {
    if (!permitted.has(key) || params.getAll(key).length !== 1) throw new QueryError();
  }
  const integer = (key, fallback, min, max) => {
    const raw = params.get(key);
    if (raw === null) return fallback;
    if (!/^(0|[1-9][0-9]{0,9})$/u.test(raw)) throw new QueryError();
    const value = Number(raw);
    if (value < min || value > max) throw new QueryError();
    return value;
  };
  const sort = params.get('sort') ?? 'level';
  const className = params.get('class');
  if (!['level', 'fame'].includes(sort) ||
      (className !== null && !['demon-avenger', 'paladin'].includes(className)) ||
      (className !== null && params.has('job'))) throw new QueryError();
  return Object.freeze({
    page: integer('page', 1, 1, 10_000),
    pageSize: integer('limit', 50, 1, 100),
    world: integer('world', null, 0, 127),
    job: integer('job', null, 0, 99_999),
    className, sort,
  });
}

export function pageSnapshot(snapshot, query) {
  const filtered = snapshot[query.sort].filter((row) =>
    (query.world === null || row.world === query.world) &&
    (query.job === null || row.jobId === query.job) &&
    (query.className !== 'demon-avenger' || row.isDemonAvenger) &&
    (query.className !== 'paladin' || (row.jobId === 122 && !row.isDemonAvenger)));
  const offset = (query.page - 1) * query.pageSize;
  const entries = filtered.slice(offset, offset + query.pageSize).map((row, i) => ({
    rank: offset + i + 1,
    name: row.name,
    level: row.level,
    exp: row.exp,
    jobId: row.jobId,
    jobName: row.jobName,
    fame: row.fame,
    guildName: row.guildName,
    score: null,
  }));
  return { status: 'live', asOf: snapshot.asOf,
    data: { entries, total: filtered.length, page: query.page, pageSize: query.pageSize } };
}

export function createSnapshotCache({ source, now = Date.now, refreshMs = 10_000,
  maxRows = 50_000, maxBytes = 16 * 1024 * 1024, onFailure = () => {} }) {
  let snapshot = null, expiresAt = 0, nextAttemptAt = 0, failures = 0, inFlight = null;
  const refresh = async () => {
    const time = now();
    if (snapshot && time < expiresAt) return snapshot;
    if (inFlight) return inFlight;
    if (time < nextAttemptAt) throw new UnavailableError();
    inFlight = Promise.resolve().then(async () => {
      try {
        // Timestamp at query start is conservative about data freshness.
        const startedAt = now();
        const rows = await source.readSnapshot(maxRows + 1);
        const next = createSnapshot(rows, new Date(startedAt).toISOString(), { maxRows, maxBytes });
        if (now() - startedAt >= refreshMs) throw new UnavailableError();
        snapshot = next;
        expiresAt = startedAt + refreshMs;
        failures = 0;
        nextAttemptAt = 0;
        return snapshot;
      } catch {
        snapshot = null; // An outage must never be labelled live using old data.
        expiresAt = 0;
        failures = Math.min(failures + 1, 4);
        nextAttemptAt = now() + Math.min(refreshMs * 2 ** (failures - 1), 60_000);
        onFailure(); // Caller logs a fixed message only, never driver errors or rows.
        throw new UnavailableError();
      }
    }).finally(() => { inFlight = null; });
    return inFlight;
  };
  return Object.freeze({ get: refresh, refresh,
    retryAfterSeconds: () => Math.max(1, Math.ceil((nextAttemptAt - now()) / 1000)) });
}
