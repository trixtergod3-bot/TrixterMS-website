import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { validateAccount, passwordRecord, registerAccount } from '../src/account.mjs';
import { accountStore, insertAccountSql } from '../src/database.mjs';
import { createRegistrationServer } from '../src/http.mjs';

const input = { username: 'Fixture42', password: 'Fixture!42', passwordConfirmation: 'Fixture!42' };
const token = 'test-only-service-token-'.repeat(3);

void test('normal account hashing matches native SHA512 contract and has random salts', async () => {
  const result = await registerAccount(input, { create: async (name, record) => {
    assert.equal(name, input.username);
    assert.match(record.salt, /^[a-f0-9]{32}$/);
    assert.equal(record.hash, createHash('sha512').update(input.password + record.salt).digest('hex'));
    assert.notEqual(record.salt, passwordRecord(input.password).salt);
    return 'created';
  } }, '127.0.0.1');
  assert.deepEqual(result, { status: 201, code: 'ACCOUNT_CREATED' });
});

void test('invalid IDs, password lengths, Unicode, mismatch, injection and privileges never reach store', async () => {
  const invalid = [null, [], {}, { ...input, gm: 1 }, { ...input, banned: 0 }, { ...input, passwordConfirmation: 'other' },
    ...['abc', 'a'.repeat(14), "x' OR 1=1--", 'white space', 'Äbcdef', 'user\n'].map(username => ({ ...input, username })),
    ...['short', 'a'.repeat(33), 'has space!', 'pässword!', 'newline!\n'].map(password => ({ ...input, password, passwordConfirmation: password }))];
  for (const value of invalid) {
    assert.equal(Boolean(validateAccount(value)), false);
    assert.equal((await registerAccount(value, { create: () => assert.fail('store called') }, '')).status, 400);
  }
});

void test('duplicate, rate limit and private database failure are sanitized', async () => {
  for (const [outcome, status] of [['duplicate', 409], ['limited', 429]]) {
    assert.equal((await registerAccount(input, { create: async () => outcome }, '')).status, status);
  }
  assert.deepEqual(await registerAccount(input, { create: async () => { throw new Error('private SQL failure'); } }, ''),
    { status: 503, code: 'REGISTRATION_UNAVAILABLE' });
});

function fakeConnection({ duplicate = false, errno = 0, attempts = 1 } = {}) {
  const calls = [];
  return { calls, beginTransaction: async () => calls.push('begin'), commit: async () => calls.push('commit'),
    rollback: async () => calls.push('rollback'), release: () => calls.push('release'),
    query: async (sql, args) => {
      calls.push({ sql, args });
      if (sql.startsWith('SELECT FLOOR')) return [{ bucket: 42 }];
      if (sql.startsWith('SELECT attempts')) return [{ attempts }];
      if (sql.startsWith('SELECT id')) return duplicate ? [{ id: 1 }] : [];
      if (sql === insertAccountSql && errno) throw Object.assign(new Error('private'), { errno });
      return { affectedRows: 1 };
    } };
}

void test('transactional writer parameterizes input and hardcodes all privilege/currency defaults', async () => {
  const connection = fakeConnection();
  const store = accountStore({ getConnection: async () => connection }, token);
  const record = passwordRecord(input.password);
  assert.equal(await store.create(input.username, record, '127.0.0.1'), 'created');
  const insert = connection.calls.find(call => call.sql === insertAccountSql);
  assert.deepEqual(insert.args, [input.username, record.hash, record.salt]);
  assert.match(insert.sql, /banned, gm, greason/);
  assert.match(insert.sql, /VALUES \(\?, \?, \?, 0, 0, 1, 0, 0, 0, 0, 0, 0\)/);
  assert.deepEqual(connection.calls.slice(-2), ['commit', 'release']);
});

void test('race duplicates commit consumed budgets; other failures rollback and release', async () => {
  for (const scenario of [{ duplicate: true }, { errno: 1062 }, { errno: 1048 }, { attempts: 101 }]) {
    const connection = fakeConnection(scenario);
    const promise = accountStore({ getConnection: async () => connection }, token).create(input.username, passwordRecord(input.password), '127.0.0.1');
    if (scenario.errno === 1048) { await assert.rejects(promise); assert.ok(connection.calls.includes('rollback')); }
    else assert.equal(await promise, scenario.attempts ? 'limited' : 'duplicate');
    assert.equal(connection.calls.at(-1), 'release');
  }
});

void test('real HTTP service enforces authentication, kill switch, size, origin, JSON and admission limits', async () => {
  let enabled = false, calls = 0;
  const events = [];
  const server = createRegistrationServer({ token, enabled: () => enabled,
    store: { create: async () => { calls++; return 'created'; } }, log: event => events.push(event), now: () => 1000 });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const url = `http://127.0.0.1:${server.address().port}/api/register`;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-trixter-client-ip': '127.0.0.1' };
  const post = (extra = {}, body = input) => fetch(url, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({ authorization: 'invalid' })).status, 401);
    assert.equal((await post()).status, 503);
    enabled = true;
    assert.equal((await post({ origin: 'https://evil.invalid' })).status, 400);
    assert.equal((await post({ 'x-trixter-client-ip': 'invalid' })).status, 400);
    assert.equal((await post({}, { ...input, password: 'x'.repeat(5000) })).status, 400);
    assert.equal((await post()).status, 201);
    assert.equal(calls, 1);
    for (let index = 0; index < 60; index++) await post({}, {});
    assert.equal((await post()).status, 429);
    assert.equal(calls, 1);
    assert.ok(events.every(event => Object.keys(event).join() === 'event,status,code'));
    assert.ok(!JSON.stringify(events).includes(input.password));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

