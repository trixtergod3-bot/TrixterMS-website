import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { createSnapshotCache, createSnapshot, pageSnapshot, parseRankingQuery,
  projectSourceRow, QueryError, UnavailableError } from '../src/rankings.mjs';
import { resolveJobName } from '../src/jobs.mjs';
import { createBridgeServer, validToken } from '../src/http.mjs';
import { readConfig } from '../src/config.mjs';
import { createDatabaseSource, POOL_LIMITS, SNAPSHOT_SQL } from '../src/database.mjs';
import { assertReaderMetadata, verifyReaderBoundary } from '../src/privileges.mjs';

const token = 'test-only-fake-ServiceTokenForHttpChecks_123456789';
const options = { maxRows: 100, maxBytes: 16_000 };
const timestamp = '2026-09-13T00:00:00.000Z';
const row = (id, patch = {}) => ({ internalId: id, world: 0, name: `Player${id}`,
  level: 1, exp: '0', jobId: 0, fame: 0, guildName: null, isDemonAvenger: 0, ...patch });
const query = (text = '') => parseRankingQuery(new URLSearchParams(text));
const snapshot = (rows) => createSnapshot(rows, timestamp, options);

test('every newly created level-one character and unknown job remains eligible', () => {
  const result = pageSnapshot(snapshot([row(1), row(2, { jobId: 99001 })]), query());
  assert.equal(result.data.total, 2);
  assert.equal(result.data.entries[0].level, 1);
  assert.equal(result.data.entries[1].jobName, 'Unknown job (99001)');
});

test('level then exact BIGINT EXP then internal ID determine stable ranks', () => {
  const result = pageSnapshot(snapshot([
    row(9, { level: 4 }), row(3, { level: 3, exp: '9007199254740993', fame: 900 }),
    row(1, { level: 3, exp: '9007199254740993', fame: -3 }),
    row(2, { level: 3, exp: '9007199254740992' }),
  ]), query());
  assert.deepEqual(result.data.entries.map((entry) => entry.name), ['Player9', 'Player1', 'Player3', 'Player2']);
  assert.deepEqual(result.data.entries.map((entry) => entry.rank), [1, 2, 3, 4]);
  assert.equal(result.data.entries[1].exp, '9007199254740993');
});

test('fame sort uses progression and stable ID for ties', () => {
  const result = pageSnapshot(snapshot([row(1, { level: 50 }), row(2, { fame: 10 }), row(3, { fame: 10, level: 10 })]), query('sort=fame'));
  assert.deepEqual(result.data.entries.map((entry) => entry.name), ['Player3', 'Player2', 'Player1']);
});

test('DA uses supported marked carrier; actual Paladin and Demon Slayer retain identity', () => {
  for (const job of [100, 120, 121, 122]) assert.equal(resolveJobName(job, true), 'Demon Avenger');
  assert.equal(resolveJobName(122, false), 'Paladin');
  for (const job of [3001, 3100, 3110, 3111, 3112]) assert.equal(resolveJobName(job, true), 'Demon Slayer');
  assert.equal(resolveJobName(0, true), 'Beginner');
  const records = [row(1, { jobId: 122, isDemonAvenger: 1 }), row(2, { jobId: 122 }), row(3, { jobId: 3100, isDemonAvenger: 1 })];
  assert.deepEqual(pageSnapshot(snapshot(records), query('class=demon-avenger')).data.entries.map((e) => e.name), ['Player1']);
  assert.deepEqual(pageSnapshot(snapshot(records), query('class=paladin')).data.entries.map((e) => e.name), ['Player2']);
});

test('normal v111 classes and regional labels are maintained without eligibility allowlists', () => {
  for (const [id, name] of [[112, 'Hero'], [232, 'Bishop'], [322, 'Marksman'], [434, 'Blade Master'],
    [532, 'Cannon Master'], [1112, 'Dawn Warrior'], [1312, 'Wind Archer'], [1512, 'Thunder Breaker'],
    [2218, 'Evan'], [2312, 'Mercedes'], [3212, 'Battle Mage'], [3312, 'Wild Hunter'], [3512, 'Mechanic']]) {
    assert.equal(resolveJobName(id, false), name);
  }
});

test('world and raw job filter combine; pagination rank is relative to filtered ordering', () => {
  const records = [row(1), row(2, { world: 1, jobId: 122 }), row(3, { world: 1, jobId: 122 })];
  const result = pageSnapshot(snapshot(records), query('world=1&job=122&page=2&limit=1'));
  assert.equal(result.data.total, 2);
  assert.equal(result.data.page, 2);
  assert.equal(result.data.pageSize, 1);
  assert.equal(result.data.entries[0].rank, 2);
  assert.equal(result.data.entries[0].name, 'Player3');
  assert.equal(pageSnapshot(snapshot(records), query('page=10000')).data.entries.length, 0);
});

test('empty source is successful live empty data', () => {
  assert.deepEqual(pageSnapshot(snapshot([]), query()), { status: 'live', asOf: timestamp,
    data: { entries: [], total: 0, page: 1, pageSize: 50 } });
});

test('public DTO strips all unknown columns and internal metadata', () => {
  const result = pageSnapshot(snapshot([row(1, { guildName: 'PublicGuild', accountid: 5,
    password: 'fake-sensitive-value', email: 'test.invalid', session: 'fake-session', world: 2 })]), query());
  assert.deepEqual(Object.keys(result.data.entries[0]), ['rank', 'name', 'level', 'exp', 'jobId', 'jobName', 'fame', 'guildName', 'score']);
  const text = JSON.stringify(result);
  for (const forbidden of ['internalId', 'accountid', 'password', 'email', 'session', 'isDemonAvenger', 'world', 'fake-sensitive']) {
    assert.ok(!text.includes(forbidden), forbidden);
  }
  assert.equal(result.data.entries[0].guildName, 'PublicGuild');
  assert.equal(result.data.entries[0].score, null);
});

test('capacity, byte budget, duplicate IDs and invalid source values fail closed', () => {
  assert.throws(() => createSnapshot([row(1), row(2)], timestamp, { ...options, maxRows: 1 }), UnavailableError);
  assert.throws(() => createSnapshot([row(1)], timestamp, { ...options, maxBytes: 1 }), UnavailableError);
  assert.throws(() => snapshot([row(1), row(1)]), UnavailableError);
  for (const patch of [{ exp: '-1' }, { exp: '1.1' }, { exp: '9223372036854775808' },
    { exp: 9007199254740992 }, { name: '' }, { name: 'bad\nname' }, { name: 'abcdefghijklmn' },
    { world: null }, { internalId: 0 }, { fame: NaN }, { guildName: 'x'.repeat(46) }]) {
    assert.throws(() => projectSourceRow(row(1, patch)), UnavailableError);
  }
});

test('invalid, duplicate, conflicting and injection-like query parameters are rejected', () => {
  for (const text of ['page=0', 'page=10001', 'limit=101', 'limit=0', 'page=1e2', 'page=01', 'page=1.5',
    'world=-1', 'world=128', 'job=2147483648', 'job=122%20OR%201=1', 'limit=1&limit=2',
    'class=paladin&job=122', 'class=anything', 'sort=exp', 'accountid=1']) {
    assert.throws(() => query(text), QueryError, text);
  }
});

test('one in-flight refresh serves concurrent clients; changes and deletions refresh without deployment', async () => {
  let clock = Date.parse(timestamp), reads = 0, release;
  let currentRows = [row(1)];
  const source = { readSnapshot: async (limit) => {
    reads++;
    assert.equal(limit, 101);
    await new Promise((resolve) => { release = resolve; });
    return currentRows;
  } };
  const cache = createSnapshotCache({ source, now: () => clock, ...options });
  const pending = Array.from({ length: 20 }, () => cache.get());
  await Promise.resolve();
  assert.equal(reads, 1);
  release();
  const results = await Promise.all(pending);
  assert.ok(results.every((r) => r === results[0]));
  await cache.get();
  assert.equal(reads, 1);
  clock += 10_000;
  currentRows = [row(2, { level: 12, exp: '50' })];
  const updated = cache.get();
  await Promise.resolve();
  release();
  const result = await updated;
  assert.equal(reads, 2);
  assert.equal(result.level[0].name, 'Player2');
  assert.equal(result.level[0].level, 12);
});

test('outage explicitly labels cached snapshot stale, applies exponential backoff, then recovers', async () => {
  let clock = Date.parse(timestamp), reads = 0, fail = false;
  const cache = createSnapshotCache({ now: () => clock, ...options,
    source: { readSnapshot: async () => { reads++; if (fail) throw new Error('FAKE_SECRET'); return [row(1)]; } } });
  await cache.get();
  clock += 10_000; fail = true;
  assert.equal((await cache.get()).status, 'stale');
  assert.equal((await cache.get()).status, 'stale');
  assert.equal(reads, 2);
  assert.equal(cache.retryAfterSeconds(), 10);
  clock += 10_000;
  assert.equal((await cache.get()).status, 'stale');
  assert.equal(cache.retryAfterSeconds(), 20);
  clock += 20_000; fail = false;
  const restored = await cache.get();
  assert.equal(restored.level.length, 1);
  assert.equal(restored.status, 'live');
});

test('synchronous driver failure releases single-flight so retry can recover', async () => {
  let clock = Date.parse(timestamp), fail = true;
  const cache = createSnapshotCache({ now: () => clock, ...options,
    source: { readSnapshot: () => { if (fail) throw new Error('fake'); return [row(1)]; } } });
  await assert.rejects(cache.get(), UnavailableError);
  clock += 10_000; fail = false;
  assert.equal((await cache.get()).level.length, 1);
});

test('slow refresh is not labelled fresh and repeated failures have bounded backoff', async () => {
  let clock = Date.parse(timestamp);
  const cache = createSnapshotCache({ now: () => clock, ...options,
    source: { readSnapshot: async () => { clock += 10_000; return []; } } });
  for (let n = 0; n < 8; n++) {
    await assert.rejects(cache.get(), UnavailableError);
    assert.ok(cache.retryAfterSeconds() <= 60);
    clock += 60_000;
  }
});

async function withServer(cache, fn) {
  const server = createBridgeServer({ cache, token });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}

test('HTTP auth, routing, bounds, methods, safe headers and default public response', async () => {
  let gets = 0;
  await withServer({ get: async () => { gets++; return snapshot([row(1)]); }, retryAfterSeconds: () => 10 }, async (base) => {
    let response = await fetch(`${base}/api/rankings`);
    assert.equal(response.status, 401);
    assert.equal(gets, 0);
    response = await fetch(`${base}/api/rankings`, { headers: { authorization: `Bearer wrong-${token}` } });
    assert.equal(response.status, 401);
    const auth = { authorization: `Bearer ${token}` };
    response = await fetch(`${base}/api/rankings?limit=101`, { headers: auth });
    assert.equal(response.status, 400);
    assert.equal(gets, 0);
    response = await fetch(`${base}/api/rankings`, { headers: auth, method: 'POST', body: 'not accepted' });
    assert.equal(response.status, 405);
    response = await fetch(`${base}/api/private`, { headers: auth });
    assert.equal(response.status, 404);
    response = await fetch(`${base}/api/rankings`, { headers: auth });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('access-control-allow-origin'), null);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const body = await response.json();
    assert.equal(body.status, 'live');
    assert.equal(body.data.entries[0].level, 1);
    assert.equal(JSON.stringify(body).includes(token), false);
  });
});

test('HTTP unavailable response never exposes driver errors or stale data', async () => {
  await withServer({ get: async () => { throw new Error('FAKE_DB_PASSWORD is private'); }, retryAfterSeconds: () => 20 }, async (base) => {
    const response = await fetch(`${base}/api/rankings`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('retry-after'), '20');
    const text = await response.text();
    assert.ok(!text.includes('FAKE_DB_PASSWORD'));
    assert.ok(!text.includes('"live"'));
    assert.ok(!text.includes('entries'));
  });
});

test('configuration rejects public listeners, admin/game accounts, weak tokens and limits', () => {
  const env = { TRIXTER_BRIDGE_TOKEN: token, TRIXTER_BRIDGE_DB_USER: 'trixter_public_reader',
    TRIXTER_BRIDGE_DB_PASSWORD: 'fake-test-only-password-no-real-secret', TRIXTER_BRIDGE_DB_NAME: 'trixterms_test' };
  const config = readConfig(env);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.database.host, '127.0.0.1');
  assert.equal(config.maxRows, 50_000);
  for (const patch of [{ TRIXTER_BRIDGE_HOST: '0.0.0.0' }, { TRIXTER_BRIDGE_DB_HOST: 'example.com' },
    { TRIXTER_BRIDGE_TOKEN: 'a'.repeat(48) }, { TRIXTER_BRIDGE_DB_USER: 'root' },
    { TRIXTER_BRIDGE_DB_PASSWORD: '' }, { TRIXTER_BRIDGE_MAX_ROWS: '100001' },
    { TRIXTER_BRIDGE_PORT: '1e3' }, { TRIXTER_BRIDGE_DB_NAME: 'schema;DROP' }]) {
    assert.throws(() => readConfig({ ...env, ...patch }));
  }
  assert.equal(validToken(token), true);
  assert.equal(validToken('short'), false);
});

test('driver requests a single bounded read from the safe view with timeouts', async () => {
  const calls = [], config = { host: '127.0.0.1' };
  let actualOptions, closed = false;
  const pool = { on: () => {}, query: async (...args) => { calls.push(args); return []; }, end: async () => { closed = true; } };
  const source = await createDatabaseSource(config, { createPool: (value) => { actualOptions = value; return pool; } });
  await source.readSnapshot(101);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0].sql, SNAPSHOT_SQL);
  assert.deepEqual(calls[0][1], [101]);
  assert.equal(actualOptions.connectionLimit, 1);
  assert.equal(actualOptions.multipleStatements, false);
  assert.equal(actualOptions.queryTimeout, 2000);
  assert.ok(POOL_LIMITS.initSql.includes('SET SESSION TRANSACTION READ ONLY'));
  assert.throws(() => source.readSnapshot('1;DROP'), /capacity/u);
  await source.close(); assert.equal(closed, true);
});

test('SQL view preserves exact DA semantics and has no private projections or eligibility filters', async () => {
  const sql = (await readFile(new URL('../schema.sql', import.meta.url), 'utf8'))
    .split('\n').filter((line) => !line.trimStart().startsWith('--')).join('\n');
  assert.match(sql, /SQL SECURITY DEFINER/u);
  assert.match(sql, /c\.job IN \(100, 120, 121, 122\)/u);
  assert.match(sql, /q\.quest = 999132900/u);
  assert.match(sql, /q\.status = 0/u);
  assert.match(sql, /BINARY q\.customData = BINARY 'TRIXTER_DA_WARRIOR_CARRIER_V1'/u);
  assert.match(sql, /AND EXISTS \(/u);
  assert.match(sql, /LEFT JOIN guilds AS g ON g\.guildid = c\.guildid/u);
  assert.doesNotMatch(sql, /\b(accounts|accountid|password|email|gm|banned)\b/iu);
  assert.doesNotMatch(sql, /c\.level\s*[><=]/u);
  assert.doesNotMatch(sql, /CREATE OR REPLACE/u);
});

const readerMetadata = () => ({
  identity: [{ validIdentity: 1, validSchema: 1, readOnly: 1 }],
  global: [{ privilegeType: 'USAGE', isGrantable: 'NO' }],
  schema: [], column: [], roles: [{ roleCount: 0 }],
  table: [{ tableSchema: 'trixterms_test', tableName: 'trixter_public_characters_v1', privilegeType: 'SELECT', isGrantable: 'NO' }],
  columns: ['internalId', 'world', 'name', 'level', 'exp', 'jobId', 'fame', 'guildName', 'isDemonAvenger'].map((columnName) => ({ columnName })),
});

test('grant metadata rejects broad access, inherited roles, wrong source and expanded view', () => {
  assert.doesNotThrow(() => assertReaderMetadata(readerMetadata(), 'trixterms_test'));
  for (const patch of [
    { identity: [{ validIdentity: 0, validSchema: 1, readOnly: 1 }] },
    { identity: [{ validIdentity: 1, validSchema: 0, readOnly: 1 }] },
    { identity: [{ validIdentity: 1, validSchema: 1, readOnly: 0 }] },
    { global: [{ privilegeType: 'SELECT', isGrantable: 'NO' }] },
    { global: [{ privilegeType: 'USAGE', isGrantable: 'YES' }] },
    { schema: [{ privilegeType: 'SELECT' }] },
    { column: [{ privilegeType: 'SELECT' }] },
    { table: [{ tableSchema: 'trixterms_test', tableName: 'characters', privilegeType: 'SELECT', isGrantable: 'NO' }] },
    { table: [{ tableSchema: 'trixterms_test', tableName: 'trixter_public_characters_v1', privilegeType: 'UPDATE', isGrantable: 'NO' }] },
    { roles: [{ roleCount: 1 }] }, { columns: [...readerMetadata().columns, { columnName: 'private' }] },
  ]) assert.throws(() => assertReaderMetadata({ ...readerMetadata(), ...patch }, 'trixterms_test'), /boundary/u);
});

test('read-only boundary checker probes denied base reads without reading rows or grant secrets', async () => {
  const keys = ['identity', 'global', 'schema', 'table', 'column', 'roles', 'columns'];
  const metadata = readerMetadata(), calls = [];
  let index = 0;
  const pool = { query: async ({ sql }) => {
    calls.push(sql);
    if (index < keys.length) return metadata[keys[index++]];
    throw Object.assign(new Error('FAKE driver error never forwarded'), { errno: 1142 });
  } };
  assert.deepEqual(await verifyReaderBoundary(pool, 'trixterms_test'),
    { readerGrantChecksPassed: true, baseTableReadsDenied: true, viewColumnsVerified: true });
  assert.equal(calls.length, 10);
  assert.ok(calls.slice(7).every((sql) => sql.includes('WHERE 1 = 0')));
  assert.ok(calls.every((sql) => !/SHOW GRANTS|mysql\.|SELECT \*/iu.test(sql)));
  index = 0;
  const broadPool = { query: async () => index < keys.length ? metadata[keys[index++]] : [] };
  await assert.rejects(verifyReaderBoundary(broadPool, 'trixterms_test'), /boundary/u);
});
