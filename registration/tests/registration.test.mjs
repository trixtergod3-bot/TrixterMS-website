import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { connect } from 'node:net';

import { validateAccount, registerAccount } from '../src/account.mjs';
import { accountStore } from '../src/database.mjs';
import { createRegistrationServer } from '../src/http.mjs';

const input = { username: 'Fixture42', password: 'Fixture!42', passwordConfirmation: 'Fixture!42' };
const token = 'test-only-service-token-'.repeat(3);

void test('budgets commit before the Java writer and limiter failures cannot call it', async () => {
  const calls = [];
  const connection = { beginTransaction: async () => {}, rollback: async () => {},
    commit: async () => calls.push('commit'), release: () => calls.push('release'),
    query: async (sql, args) => {
      assert.ok(!sql.includes('INSERT INTO accounts'));
      if (sql.startsWith('SELECT FLOOR')) return [{ bucket: 42 }];
      if (sql.startsWith('SELECT attempts')) return [{ attempts: 1 }];
      if (sql.startsWith('INSERT')) assert.match(args[1], /^[a-f0-9]{64}$/);
      return [];
    } };
  const store = accountStore({ getConnection: async () => connection }, token, async () => {
    calls.push('writer'); throw new Error('private failure');
  });
  await assert.rejects(store.create(input.username, input.password, '192.0.2.1'));
  assert.deepEqual(calls, ['commit', 'writer', 'release']);
  connection.query = async sql => sql.startsWith('SELECT FLOOR') ? [{ bucket: 42 }]
    : sql.startsWith('SELECT attempts') ? [{ attempts: 101 }] : [];
  calls.length = 0;
  assert.equal(await store.create(input.username, input.password, '192.0.2.1'), 'limited');
  assert.deepEqual(calls, ['commit', 'release']);
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
    assert.equal((await post({ authorization: 'invalid' })).status, 503);
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
    const socket = connect(server.address().port, '127.0.0.1');
    await once(socket, 'connect');
    let wire = '';
    socket.on('data', chunk => { wire += chunk.toString(); });
    socket.write('BAD METHOD / HTTP/1.1\r\n\r\n');
    await once(socket, 'close');
    assert.match(wire, /^HTTP\/1\.1 400 /);
    assert.ok(wire.endsWith('{"code":"INVALID_REGISTRATION"}'));
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
