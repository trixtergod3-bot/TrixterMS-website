import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createBridgeServer } from '../src/http.mjs';
import { createSnapshotCache, UnavailableError } from '../src/rankings.mjs';
import { createRuntimeCache, createRuntimeFileSource, projectRuntimeAggregate } from '../src/telemetry.mjs';
import { acquireSupervisorLock, restartDelay, supervise } from '../src/supervisor.mjs';
import { inspectQueryPlan } from '../src/query-plan.mjs';

const token = 'test-only-fake-ServiceTokenForHttpChecks_123456789';
const auth = { authorization: `Bearer ${token}` };
const row = (id, patch = {}) => ({ internalId: id, world: 0, name: `Player${id}`,
  level: 1, exp: '0', jobId: 0, fame: 0, guildName: null, isDemonAvenger: 0, ...patch });
const initial = Date.parse('2026-09-13T00:00:00.000Z');
const endpoints = ['/api/public/rankings', '/api/public/characters', '/api/public/stats', '/api/public/telemetry'];
const aggregate = (patch = {}) => ({ version: 1, asOf: new Date(initial).toISOString(),
  online: true, playersOnline: 4,
  channels: [{ channel: 2, status: 'online', playersOnline: 1 }, { channel: 1, status: 'online', playersOnline: 2 }],
  uptimeSeconds: 120, rates: { exp: 1, meso: 1.5, drop: null }, ...patch });

async function withServer(options, fn) {
  const server = createBridgeServer({ token, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
}

test('all RC1 endpoints share one source refresh and strictly project class-aware public DTOs', async () => {
  let reads = 0;
  const rows = [row(1, { jobId: 122 }), row(2, { jobId: 122, isDemonAvenger: 1 }),
    row(3, { jobId: 3112 }), row(4, { password: 'private-fixture', hardwareId: 'private-fixture' })];
  const cache = createSnapshotCache({ source: { readSnapshot: async () => { reads++; return rows; } } });
  await withServer({ cache }, async (base) => {
    const responses = await Promise.all(Array.from({ length: 60 }, (_, i) =>
      fetch(`${base}${endpoints[i % 4]}${i % 4 < 2 ? `?page=${i + 1}` : ''}`, { headers: auth })));
    assert.ok(responses.every((response) => response.status === 200));
    assert.equal(reads, 1);
    const stats = await (await fetch(`${base}/api/public/stats`, { headers: auth })).json();
    assert.deepEqual(stats.data.classDistribution, [
      { jobName: 'Beginner', count: 1 }, { jobName: 'Demon Avenger', count: 1 },
      { jobName: 'Demon Slayer', count: 1 }, { jobName: 'Paladin', count: 1 }]);
    assert.equal(stats.data.totalCharacters, 4);
    assert.equal(stats.data.rankingSnapshotAt, stats.asOf);
    const telemetry = await (await fetch(`${base}/api/public/telemetry`, { headers: auth })).json();
    assert.equal(telemetry.status, 'live');
    assert.equal(telemetry.data.runtimeStatus, 'unavailable');
    assert.equal(telemetry.data.playersOnline, null);
    assert.equal(telemetry.data.online, null);
    assert.equal(telemetry.data.uptimeSeconds, null);
    assert.equal(telemetry.data.recentActivity, null);
    assert.equal(telemetry.data.runtimeAsOf, null);
    assert.deepEqual(telemetry.data.channels, []);
    assert.deepEqual(telemetry.data.rates, { exp: null, meso: null, drop: null });
    for (const response of responses) {
      const text = await response.text();
      for (const secret of ['internalId', 'accountid', 'password', 'hardwareId', 'isDemonAvenger', 'world', 'private-fixture']) {
        assert.equal(text.includes(secret), false, secret);
      }
    }
  });
});

test('characters allows exact bounded name lookup; aggregate endpoints reject query expansion', async () => {
  let reads = 0;
  const cache = createSnapshotCache({ source: { readSnapshot: async () => { reads++; return [row(1), row(2)]; } } });
  await withServer({ cache }, async (base) => {
    for (const [path, status] of [
      ['/api/public/characters?name=Player2', 200], ['/api/public/characters?name=player2', 200],
      ['/api/public/characters?name=', 400], ['/api/public/characters?name=abcdefghijklmn', 400],
      ['/api/public/characters?name=bad%0Aname', 400], ['/api/public/characters?name=A&name=B', 400],
      ['/api/public/rankings?name=Player2', 400], ['/api/public/stats?page=1', 400],
      ['/api/public/telemetry?account=1', 400],
    ]) {
      const response = await fetch(`${base}${path}`, { headers: auth });
      assert.equal(response.status, status, path);
      if (status === 200) {
        const result = await response.json();
        assert.equal(result.data.total, path.includes('name=player2') ? 0 : 1);
      }
    }
    assert.equal(reads, 1);
  });
});

test('physical deletion disappears from rankings, characters and aggregate count after shared refresh', async () => {
  let now = initial;
  let rows = [row(1), row(2)];
  const cache = createSnapshotCache({ now: () => now, source: { readSnapshot: async () => rows } });
  await withServer({ cache }, async (base) => {
    assert.equal((await (await fetch(`${base}/api/public/stats`, { headers: auth })).json()).data.totalCharacters, 2);
    rows = [row(2)]; now += 10_000;
    for (const path of endpoints) {
      const body = await (await fetch(`${base}${path}`, { headers: auth })).json();
      assert.equal(JSON.stringify(body).includes('Player1'), false);
      assert.equal(body.data.total ?? body.data.totalCharacters, 1);
    }
  });
});

test('stale snapshot is visibly labelled on every endpoint, expires at120s and never fabricates data', async () => {
  let now = initial, failed = false, reads = 0;
  const cache = createSnapshotCache({ now: () => now, source: { readSnapshot: async () => {
    reads++; if (failed) throw new Error('private database failure'); return [row(1)];
  } } });
  await cache.get(); failed = true; now += 10_000;
  await withServer({ cache }, async (base) => {
    for (const path of endpoints) {
      const response = await fetch(`${base}${path}`, { headers: auth });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.status, 'stale');
      assert.equal(body.asOf, new Date(initial).toISOString());
    }
    assert.equal(reads, 2);
    now = initial + 120_000;
    for (const path of endpoints) {
      const response = await fetch(`${base}${path}`, { headers: auth });
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.equal(body.status, 'unavailable');
      assert.equal(Object.hasOwn(body, 'data'), false);
      assert.equal(JSON.stringify(body).includes('private'), false);
    }
    assert.equal(reads, 3);
  });
});

test('cold source outage stays503 without empty or invented player records', async () => {
  let reads = 0;
  const cache = createSnapshotCache({ source: { readSnapshot: async () => { reads++; throw new Error('private'); } } });
  await withServer({ cache }, async (base) => {
    for (const path of endpoints) {
      const response = await fetch(`${base}${path}`, { headers: auth });
      assert.equal(response.status, 503);
      const body = await response.json();
      assert.deepEqual(Object.keys(body), ['status', 'error']);
    }
    assert.equal(reads, 1);
  });
});

test('shared token bucket bounds all endpoint/query variants, cached scans and untrusted requests', async () => {
  let now = initial, reads = 0;
  const cache = createSnapshotCache({ now: () => now, source: { readSnapshot: async () => { reads++; return [row(1)]; } } });
  await withServer({ cache, now: () => now, requestsPerMinute: 4 }, async (base) => {
    for (const path of endpoints) assert.equal((await fetch(`${base}${path}`, { headers: auth })).status, 200);
    for (let n = 0; n < 20; n++) {
      const response = await fetch(`${base}${endpoints[n % 4]}?page=${n}`, { headers: auth });
      assert.equal(response.status, 429);
      assert.equal(response.headers.get('retry-after'), '15');
    }
    assert.equal(reads, 1);
    now += 15_000;
    assert.equal((await fetch(`${base}/api/public/stats`, { headers: auth })).status, 200);
    assert.equal(reads, 2);
    assert.equal((await fetch(`${base}/api/public/stats`)).status, 429);
  });
});

test('sustained polling/outages cannot exceed one DB read per10s and bounded failure backoff', async () => {
  let now = initial, reads = 0, failed = false;
  const cache = createSnapshotCache({ now: () => now, source: { readSnapshot: async () => {
    reads++; if (failed) throw new Error('private'); return [row(1)];
  } } });
  for (let second = 0; second < 60; second++) {
    await Promise.all(Array.from({ length: 100 }, () => cache.get()));
    now += 1000;
  }
  assert.equal(reads, 6);
  failed = true;
  for (let second = 0; second < 240; second++) {
    await Promise.all(Array.from({ length: 10 }, () => cache.get().catch((error) => assert.ok(error instanceof UnavailableError))));
    now += 1000;
  }
  assert.equal(reads, 12, 'outage attempts at0,10,30,70,130,190 seconds');
});

test('runtime projection accepts truthful offline and known aggregates without inferring availability', () => {
  const online = projectRuntimeAggregate(aggregate(), initial);
  assert.equal(online.runtimeStatus, 'live');
  assert.deepEqual(online.channels.map((channel) => channel.channel), [1, 2]);
  assert.equal(online.rates.meso, 1.5);
  const offline = projectRuntimeAggregate(aggregate({ online: false, playersOnline: 0, channels: [], uptimeSeconds: 0 }), initial);
  assert.equal(offline.online, false);
  assert.equal(offline.playersOnline, 0);
  assert.equal(offline.runtimeStatus, 'live');
});

test('runtime rejects private fields, stale/future timestamps, inconsistent populations and invalid rates', () => {
  for (const patch of [
    { accountid: 1 }, { version: 2 }, { asOf: new Date(initial - 30_000).toISOString() },
    { asOf: new Date(initial + 1).toISOString() }, { asOf: 'invalid' }, { online: 'online' },
    { playersOnline: -1 }, { playersOnline: 100001 }, { playersOnline: 2 },
    { online: false }, { uptimeSeconds: -1 }, { rates: { exp: 0, meso: 1, drop: 1 } },
    { rates: { exp: 1, meso: 1, drop: 1, private: 1 } },
    { channels: [{ channel: 1, status: 'online', playersOnline: 1, ip: 'private' }] },
    { channels: [{ channel: 1, status: 'unknown', playersOnline: 1 }] },
    { channels: [{ channel: 1, status: 'offline', playersOnline: 1 }] },
    { channels: [{ channel: 1, status: 'online', playersOnline: 0 }, { channel: 1, status: 'online', playersOnline: 0 }] },
  ]) assert.throws(() => projectRuntimeAggregate(aggregate(patch), initial), /unavailable/u);
});

test('runtime cache deduplicates IO, backs off, expires and never retains failed/stale runtime claims', async () => {
  let now = initial, reads = 0, failed = false;
  const cache = createRuntimeCache({ now: () => now, source: { read: async () => {
    reads++; if (failed) throw new Error('private'); return aggregate();
  } } });
  await Promise.all(Array.from({ length: 100 }, () => cache.get()));
  assert.equal(reads, 1);
  now += 5000; failed = true;
  assert.equal((await cache.get()).runtimeStatus, 'unavailable');
  assert.equal((await cache.get()).online, null);
  assert.equal(reads, 2);
  now += 5000; failed = false;
  assert.equal((await cache.get()).runtimeStatus, 'live');
  now += 20_000;
  assert.equal((await cache.get()).runtimeStatus, 'unavailable');
  assert.equal((await createRuntimeCache().get()).online, null);
});

test('runtime file reader enforces a real finite local JSON file and byte cap', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'trixter-runtime-test-'));
  try {
    const path = join(directory, 'aggregate.json');
    await writeFile(path, JSON.stringify(aggregate()));
    assert.deepEqual(await createRuntimeFileSource(path).read(), aggregate());
    await writeFile(path, 'x'.repeat(16 * 1024 + 1));
    await assert.rejects(createRuntimeFileSource(path).read());
    await assert.rejects(createRuntimeFileSource(directory).read());
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('supervisor bounded restart policy and exclusive lock prevent competing bridge supervisors', async () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(restartDelay), [null, 1000, 2000, 4000, 8000, 16000, null]);
  const directory = await mkdtemp(join(tmpdir(), 'trixter-supervisor-test-'));
  try {
    const release = await acquireSupervisorLock(directory);
    await assert.rejects(acquireSupervisorLock(directory), { code: 'EEXIST' });
    await release(); await release();
    await (await acquireSupervisorLock(directory))();
  } finally { await rm(directory, { recursive: true, force: true }); }
});

function supervisorFixture({ graceful = true } = {}) {
  const signals = new EventEmitter(), children = [], timers = new Set();
  let releases = 0;
  const options = { signals, log: () => {},
    acquireLock: async () => async () => { releases++; },
    schedule: (fn, delay) => { const timer = { fn, delay }; timers.add(timer); return timer; },
    cancel: (timer) => { timers.delete(timer); },
    forkChild: (path, args, options) => {
      assert.ok(path.endsWith('main.mjs'));
      assert.deepEqual(args, []);
      assert.equal(options.windowsHide, true);
      assert.deepEqual(options.execArgv, []);
      const child = new EventEmitter();
      child.connected = true;
      child.messages = [];
      child.kills = [];
      child.send = (message) => { child.messages.push(message); if (graceful) child.emit('exit', 0); };
      child.kill = (signal) => { child.kills.push(signal); child.emit('exit', 1); };
      children.push(child);
      return child;
    },
  };
  return { options, signals, children, timers, releases: () => releases,
    runTimer: () => { const timer = [...timers][0]; assert.ok(timer); timers.delete(timer); timer.fn(); return timer.delay; } };
}

test('supervisor SIGTERM gracefully stops only its child, releases lock and cancels timers', async () => {
  const fixture = supervisorFixture();
  const complete = supervise(fixture.options);
  await Promise.resolve();
  assert.equal(fixture.children.length, 1);
  fixture.signals.emit('SIGTERM');
  assert.equal(await complete, 0);
  assert.deepEqual(fixture.children[0].messages, ['shutdown']);
  assert.deepEqual(fixture.children[0].kills, []);
  assert.equal(fixture.releases(), 1);
  assert.equal(fixture.timers.size, 0);
  assert.equal(fixture.signals.listenerCount('SIGTERM'), 0);
});

test('supervisor forces only its unresponsive child after5s and exits without restart', async () => {
  const fixture = supervisorFixture({ graceful: false });
  const complete = supervise(fixture.options);
  await Promise.resolve();
  fixture.signals.emit('SIGINT');
  assert.equal(fixture.runTimer(), 5000);
  assert.equal(await complete, 0);
  assert.deepEqual(fixture.children[0].kills, ['SIGKILL']);
  assert.equal(fixture.children.length, 1);
  assert.equal(fixture.releases(), 1);
});

test('supervisor limits crash restarts and preserves lock until the last child exits', async () => {
  const fixture = supervisorFixture();
  const complete = supervise(fixture.options);
  await Promise.resolve();
  for (let n = 1; n <= 5; n++) {
    fixture.children.at(-1).emit('exit', 1);
    assert.equal(fixture.releases(), 0);
    assert.equal(fixture.runTimer(), restartDelay(n));
  }
  assert.equal(fixture.children.length, 6);
  fixture.children.at(-1).emit('exit', 1);
  assert.equal(await complete, 1);
  assert.equal(fixture.releases(), 1);
  assert.equal(fixture.timers.size, 0);
});

test('supervisor stopping during backoff cancels the next launch', async () => {
  const fixture = supervisorFixture();
  const complete = supervise(fixture.options);
  await Promise.resolve();
  fixture.children[0].emit('exit', 1);
  fixture.signals.emit('SIGTERM');
  assert.equal(await complete, 0);
  assert.equal(fixture.children.length, 1);
  assert.equal(fixture.timers.size, 0);
});

test('SELECT-only view reader EXPLAIN denial1345 defers only plan verification without extra grants', async () => {
  let calls = 0;
  const source = { explain: async (limit) => {
    calls++;
    assert.equal(limit, 50001);
    throw Object.assign(new Error('private SQL metadata'), { errno: 1345 });
  } };
  const result = await inspectQueryPlan(source, 50001);
  assert.deepEqual(result, { queryPlanVerified: false, explainRequiresAdministrator: true, plan: null });
  assert.equal(calls, 1, 'no fallback query, grant change or privilege escalation occurs');
  assert.equal(JSON.stringify(result).includes('private'), false);
});

test('other EXPLAIN failures fail closed; approved plans emit only sanitized flags', async () => {
  for (const errno of [1045, 1142, 1143, 2002, undefined, '1345']) {
    await assert.rejects(inspectQueryPlan({ explain: async () => {
      throw Object.assign(new Error('private failure'), { errno });
    } }, 50001), { message: 'Read-only query plan validation failed' });
  }
  const result = await inspectQueryPlan({ explain: async () => [
    { type: 'ref', rows: '30', key: 'private-index', table: 'private-table', Extra: 'Using filesort; Using temporary' },
  ] }, 50001);
  assert.deepEqual(result, { queryPlanVerified: true, explainRequiresAdministrator: false,
    plan: [{ accessType: 'ref', estimatedRows: 30, usesIndex: true, filesort: true, temporary: true }] });
  assert.equal(JSON.stringify(result).includes('private'), false);
});
