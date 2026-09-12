import assert from 'node:assert/strict';
import test from 'node:test';
import { portalRequest, readPortal, validatePortalData } from '../lib/portal/data.ts';
import { inspectText, inspectPublicationPath } from '../tools/check-security.mjs';

const row = { rank: 1, name: 'NewLevelOne', level: 1, exp: '0', jobId: 0, jobName: 'Beginner', fame: 0, guildName: null, score: null };
const data = { entries: [row], total: 1, page: 1, pageSize: 50 };

void test('rankings require complete metadata and include level one with exact persisted EXP', () => {
  assert.deepEqual(validatePortalData('rankings', data), data);
  assert.doesNotThrow(() => validatePortalData('rankings', { ...data, entries: [{ ...row, name: '[GM]Test' }] }));
  assert.throws(() => validatePortalData('rankings', { ...data, entries: [{ ...row, name: 'bad\nname' }] }));
  for (const exp of [1, '-1', '01', '9223372036854775808']) assert.throws(() => validatePortalData('rankings', { ...data, entries: [{ ...row, exp }] }));
  for (const changed of [{ page: 0 }, { pageSize: 101 }, { total: null }, { total: 2 }, { page: 2 }, { entries: [{ ...row, rank: 2 }] }, { entries: [{ ...row, guildName: 'x'.repeat(46) }] }]) assert.throws(() => validatePortalData('rankings', { ...data, ...changed }));
  assert.deepEqual(validatePortalData('rankings', { entries: [], total: 0, page: 1, pageSize: 50 }), { entries: [], total: 0, page: 1, pageSize: 50 });
  assert.doesNotThrow(() => validatePortalData('rankings', { entries: [], total: 1, page: 2, pageSize: 50 }));
});

void test('class filters preserve carrier distinction without changing numeric jobs', () => {
  assert.equal(portalRequest('/api/rankings', { class: 'demon-avenger' }).query.get('class'), 'demon-avenger');
  assert.equal(portalRequest('/api/rankings', { class: 'paladin' }).query.get('class'), 'paladin');
  for (const query of [{ class: 'paladin', job: 122 }, { class: 'unknown' }, { world: 256 }, { job: 100000 }]) assert.throws(() => portalRequest('/api/rankings', query));
});

void test('authenticated reader bounds freshness and rejects wrong pages and classes', async (t) => {
  const originalFetch = globalThis.fetch;
  const keys = ['TRIXTER_READ_API_URL', 'TRIXTER_READ_API_TOKEN'];
  const previous = keys.map(key => process.env[key]);
  t.after(() => { globalThis.fetch = originalFetch; keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }); });
  process.env.TRIXTER_READ_API_URL = 'https://reviewed-backend.invalid';
  process.env.TRIXTER_READ_API_TOKEN = 'test_'.repeat(10);
  let payload = { status: 'live', asOf: new Date().toISOString(), data };
  globalThis.fetch = async (_input, options) => {
    assert.deepEqual(options?.headers, { Accept: 'application/json', Authorization: `Bearer ${process.env.TRIXTER_READ_API_TOKEN}` });
    return Response.json(payload);
  };
  const success = await readPortal('/api/rankings');
  assert.equal(success.status, 'live');
  assert.equal(JSON.stringify(success).includes(process.env.TRIXTER_READ_API_TOKEN), false);
  assert.equal((await readPortal('/api/rankings', { page: 2 })).status, 'unavailable');
  assert.equal((await readPortal('/api/rankings', { limit: 25 })).status, 'unavailable');
  assert.equal((await readPortal('/api/rankings', { class: 'demon-avenger' })).status, 'unavailable');
  payload = { ...payload, asOf: new Date(Date.now() - 31000).toISOString() };
  assert.equal((await readPortal('/api/rankings')).status, 'unavailable');
  process.env.TRIXTER_READ_API_TOKEN = 'bad\nheader';
  assert.equal((await readPortal('/api/rankings')).status, 'unavailable');
});

void test('publication permits only reviewed view source and browser excludes bridge secrets', () => {
  assert.equal(inspectPublicationPath('bridge/schema.sql'), null);
  assert.ok(inspectPublicationPath('bridge/data.sql'));
  for (const key of ['TRIXTER_READ_API_TOKEN', 'TRIXTER_BRIDGE_DB_PASSWORD']) assert.ok(inspectText('.next/static/test.js', key, { browser: true }).length);
});
