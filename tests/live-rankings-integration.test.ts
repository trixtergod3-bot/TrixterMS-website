import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createBridgeServer } from '../bridge/src/http.mjs';
import { createSnapshotCache } from '../bridge/src/rankings.mjs';
import { createRuntimeCache } from '../bridge/src/telemetry.mjs';
import { createPublicReader } from '../lib/portal/public-data.ts';
import type { RankingsData } from '../lib/portal/contracts.ts';
import type { PublicRankingsData, PublicStatsData, PublicTelemetryData } from '../lib/portal/contracts.ts';

void test('real HTTP bridge to portal adapter propagates fixture creation/progress/deletion with no private fields', async (t) => {
  // Synthetic source only. This test cannot certify the live game database.
  const keys = ['NODE_ENV', 'TRIXTER_READ_API_URL', 'TRIXTER_READ_API_TOKEN'];
  const previous = keys.map(key => process.env[key]);
  t.after(() => keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }));
  const token = randomBytes(32).toString('base64url');
  let now = Date.now(), reads = 0, unavailable = false;
  const first = { internalId: 5, name: 'FixtureHero', level: 20, exp: '12', jobId: 100, fame: 0, world: 0, guildName: 'FixtureGuild', isDemonAvenger: 0 };
  let rows = [first];
  const cache = createSnapshotCache({ source: { readSnapshot: async () => { reads++; if (unavailable) throw new Error('private driver error'); return rows; } }, now: () => now, refreshMs: 10_000 });
  const server = createBridgeServer({ cache, token });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  Object.assign(process.env, { NODE_ENV: 'development' });
  process.env.TRIXTER_READ_API_URL = `http://127.0.0.1:${address.port}`;
  process.env.TRIXTER_READ_API_TOKEN = token;
  const reader = createPublicReader({ now: () => now });
  const get = () => reader.read<RankingsData>('/api/public/rankings');
  assert.equal((await get()).data?.total, 1);
  const created = { ...first, internalId: 6, name: 'FixtureNew', level: 1, exp: '0', jobId: 0, guildName: '', accountid: 999, password: 'private-fixture-only' };
  rows = [first, created];
  now += 10_000;
  const afterCreation = await get();
  assert.equal(afterCreation.data?.total, 2);
  assert.equal(afterCreation.data?.entries[1].level, 1);
  assert.equal(afterCreation.data?.entries[1].guildName, null);
  rows = [first, { ...created, level: 25, exp: '9007199254740993' }];
  now += 10_000;
  const progress = await get();
  assert.equal(progress.data?.entries[0].name, 'FixtureNew');
  assert.equal(progress.data?.entries[0].exp, '9007199254740993');
  const body = JSON.stringify(progress);
  for (const forbidden of ['internalId', 'accountid', 'password', 'world', 'isDemonAvenger', token]) assert.equal(body.includes(forbidden), false);
  const beforeBurst = reads;
  await Promise.all(Array.from({ length: 8 }, (_, i) => reader.read('/api/public/rankings', { page: i + 1 })));
  assert.equal(reads, beforeBurst, 'all browser pages share one snapshot');
  // Logging out does not remove the source row; next snapshot must retain it.
  now += 10_000;
  assert.equal((await get()).data?.total, 2);
  rows = [first]; now += 10_000;
  assert.equal((await get()).data?.total, 1);
  unavailable = true; now += 10_000;
  const stale = await get();
  assert.equal(stale.status, 'stale');
  assert.equal(stale.data?.total, 1);
  now += 120_000;
  const outage = await get();
  assert.equal(outage.status, 'unavailable');
  assert.equal(outage.data, null);
  assert.equal(JSON.stringify(outage).includes('private'), false);
  const unauthorized = await fetch(`${process.env.TRIXTER_READ_API_URL}/api/rankings`);
  assert.equal(unauthorized.status, 401);
});

void test('RC1 real authenticated HTTP projects all four contracts and shares one synthetic DB snapshot', async (t) => {
  // Actual HTTP transport with a synthetic source; this is not authoritative DB evidence.
  let now = Date.now(), reads = 0, runtimeReads = 0;
  const token = randomBytes(32).toString('base64url');
  const sourceRow = { internalId: 1, name: 'FixtureNew', level: 1, exp: '0', jobId: 0, fame: 0, world: 0, guildName: null, isDemonAvenger: 0 };
  const rows = [sourceRow, { ...sourceRow, internalId: 2, name: 'Paladin', jobId: 122 }, { ...sourceRow, internalId: 3, name: 'Avenger', jobId: 122, isDemonAvenger: 1 }, { ...sourceRow, internalId: 4, name: 'Slayer', jobId: 3112 }];
  const cache = createSnapshotCache({ source: { readSnapshot: async () => { reads++; return rows; } }, now: () => now });
  const runtime = createRuntimeCache({ source: { read: async () => { runtimeReads++; return { version: 1, asOf: new Date(now).toISOString(), online: true, playersOnline: 3, channels: [{ channel: 1, status: 'online', playersOnline: 3 }], uptimeSeconds: 900, rates: { exp: 3, meso: 2, drop: 1 } }; } }, now: () => now });
  const server = createBridgeServer({ cache, runtime, token, now: () => now });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const reader = createPublicReader({ now: () => now, config: () => ({ url: `http://127.0.0.1:${address.port}`, token, development: true }) });
  const [rankings, characters, statistics, metrics] = await Promise.all([
    reader.read<PublicRankingsData>('/api/public/rankings'), reader.read<PublicRankingsData>('/api/public/characters', { name: 'Avenger' }),
    reader.read<PublicStatsData>('/api/public/stats'), reader.read<PublicTelemetryData>('/api/public/telemetry'),
  ]);
  assert.equal(reads, 1); assert.equal(runtimeReads, 1);
  assert.equal(rankings.data?.entries[0].level, 1);
  assert.deepEqual(rankings.data?.entries.map(row => row.jobName), ['Beginner', 'Paladin', 'Demon Avenger', 'Demon Slayer']);
  assert.equal(characters.data?.total, 1); assert.equal(characters.data?.entries[0].name, 'Avenger');
  assert.equal(statistics.data?.totalCharacters, 4); assert.equal(statistics.data?.classDistribution.length, 4);
  assert.equal(statistics.data?.rankingSnapshotAt, rankings.asOf);
  assert.equal(metrics.data?.online, true); assert.equal(metrics.data?.playersOnline, 3);
  const output = JSON.stringify([rankings, characters, statistics, metrics]);
  for (const forbidden of ['internalId', 'isDemonAvenger', 'accountid', 'password', 'world', token]) assert.equal(output.includes(forbidden), false);
  now += 10_000;
  const secondPage = await reader.read<PublicRankingsData>('/api/public/rankings', { page: 2, limit: 2 });
  assert.deepEqual(secondPage.data?.entries.map(row => [row.rank, row.name]), [[3, 'Avenger'], [4, 'Slayer']]);
  assert.equal(reads, 2);
});
