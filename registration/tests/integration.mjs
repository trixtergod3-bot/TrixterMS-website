// Opt-in integration. Only a new fixture on loopback 14327; never the beta database.
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import mariadb from 'mariadb';
import { accountStore, verifySchema, verifyWriterBoundary } from '../src/database.mjs';
import { javaWriter } from '../src/java-writer.mjs';
import { rateTableSql } from '../src/schema.mjs';
import { createRegistrationServer } from '../src/http.mjs';
import { handleRegistrationRequest, RegistrationRateLimiter } from '../../lib/portal/registration.ts';

let admin, pool, server;
let step = 'fixture identity';
try {
  admin = await mariadb.createConnection({ host: '127.0.0.1', port: 14327, user: 'root', connectTimeout: 2000 });
  const [identity] = await admin.query('SELECT @@port AS port, @@datadir AS directory');
  assert.equal(Number(identity.port), 14327);
  assert.ok(identity.directory.replaceAll('\\', '/').toLowerCase().replace(/\/$/, '')
    .endsWith('/local/open-public-registration-01a0a722/test-db'));
  const db = `registration_fixture_${randomBytes(4).toString('hex')}`;
  await admin.query(`CREATE DATABASE ${db} CHARACTER SET latin1 COLLATE latin1_swedish_ci`);
  await admin.query(`USE ${db}`);
  const source = await readFile(process.env.TRIXTER_ACCOUNT_SCHEMA, 'utf8');
  const schema = source.match(/CREATE TABLE IF NOT EXISTS `accounts`[\s\S]*?ENGINE=InnoDB DEFAULT CHARSET=latin1;/)?.[0];
  assert.ok(schema);
  await admin.query(schema);
  await admin.query('ALTER TABLE accounts ADD PRIMARY KEY (id), ADD UNIQUE KEY name (name), MODIFY id INT NOT NULL AUTO_INCREMENT');
  await admin.query(rateTableSql);
  const secret = randomBytes(32).toString('hex');
  // A new isolated instance is required. Never reset an existing writer identity.
  await admin.query("CREATE USER 'trixter_registration_writer'@'127.0.0.1' IDENTIFIED BY ?", [secret]);
  await admin.query(`GRANT SELECT, INSERT ON ${db}.accounts TO 'trixter_registration_writer'@'127.0.0.1'`);
  await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.registration_limits TO 'trixter_registration_writer'@'127.0.0.1'`);
  pool = mariadb.createPool({ host: '127.0.0.1', port: 14327, user: 'trixter_registration_writer', password: secret,
    database: db, connectionLimit: 4, connectTimeout: 2000, queryTimeout: 5000 });
  step = 'schema and writer privilege validation';
  await verifySchema(pool);
  await verifyWriterBoundary(pool, db);
  const writer = javaWriter({ ...process.env, REGISTRATION_DB_PORT: '14327', REGISTRATION_DB_NAME: db,
    REGISTRATION_DB_USER: 'trixter_registration_writer', REGISTRATION_DB_PASSWORD: secret });
  const rateSecret = randomBytes(32).toString('hex');
  const store = accountStore(pool, rateSecret, writer);
  const input = { username: 'Fixture42', password: 'Fixture!42', passwordConfirmation: 'Fixture!42' };
  step = 'actual Java writer and duplicate protection';
  assert.equal(await store.create(input.username, input.password, '192.0.2.1'), 'created');
  assert.equal(await store.create(input.username.toLowerCase(), input.password, '192.0.2.1'), 'duplicate');
  const [row] = await admin.query('SELECT password,salt,gm,banned,NxCredit,NxPrepaid,PicEnabled FROM accounts WHERE name=?', [input.username]);
  assert.equal(row.password, createHash('sha512').update(input.password + row.salt).digest('hex'));
  assert.match(row.salt, /^[a-f0-9]{32}$/);
  for (const key of ['gm', 'banned', 'NxCredit', 'NxPrepaid', 'PicEnabled']) assert.equal(Number(row[key]), 0);
  step = 'concurrent duplicate races';
  for (let round = 0; round < 5; round++) {
    const results = await Promise.all([0, 1, 2].map(() => store.create(`Race${round}Test`, input.password, `192.0.2.${20 + round}`)));
    assert.equal(results.filter(value => value === 'created').length, 1);
    assert.equal(results.filter(value => value === 'duplicate').length, 2);
  }
  step = 'persistent username and IP rate limits';
  for (let i = 0; i < 3; i++) await store.create('LimitFixture', input.password, '192.0.2.8');
  assert.equal(await accountStore(pool, rateSecret, writer).create('limitfixture', input.password, '192.0.2.9'), 'limited');
  for (let i = 0; i < 5; i++) assert.equal(await store.create(`IpFixture${i}`, input.password, '192.0.2.10'), 'created');
  assert.equal(await accountStore(pool, rateSecret, writer).create('IpFixture6', input.password, '192.0.2.10'), 'limited');
  step = 'website to authenticated gateway to Java writer';
  const token = randomBytes(32).toString('hex');
  const events = [];
  server = createRegistrationServer({ token, enabled: () => true, store, log: event => events.push(event) });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const gateway = `http://127.0.0.1:${server.address().port}/api/register`;
  const settings = { NODE_ENV: 'test', TRIXTER_SITE_URL: 'http://localhost:14328', TRIXTER_REGISTRATION_ENABLED: 'true',
    TRIXTER_REGISTRATION_URL: gateway, TRIXTER_REGISTRATION_GATEWAY_TOKEN: token,
    TRIXTER_REGISTRATION_CSRF_SECRET: randomBytes(32).toString('hex') };
  const deps = { limiter: new RegistrationRateLimiter() };
  const session = await handleRegistrationRequest(new Request('http://localhost:14328/api/register'), settings, deps);
  const csrf = (await session.json()).csrfToken;
  const cookie = session.headers.get('set-cookie').split(';')[0];
  const request = () => new Request('http://localhost:14328/api/register', { method: 'POST', headers: {
    Origin: settings.TRIXTER_SITE_URL, 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrf },
    body: JSON.stringify({ ...input, username: 'EndToEnd42' }) });
  assert.equal((await handleRegistrationRequest(request(), settings, deps)).status, 201);
  assert.equal((await handleRegistrationRequest(request(), settings, deps)).status, 409);
  assert.equal((await handleRegistrationRequest(request(), settings, deps)).status, 409);
  assert.equal((await handleRegistrationRequest(request(), settings, deps)).status, 429);
  assert.equal((await fetch(gateway, { method: 'POST', body: '{}' })).status, 503);
  assert.ok(events.every(event => Object.keys(event).join(',') === 'event,status,code'));
  assert.ok(!JSON.stringify(events).includes(input.password));
  console.info('PASS: real Java writer, normal-player defaults, five duplicate race rounds, persistent IP/name limits, website/gateway/database integration, sanitized logging');
} catch {
  console.error(`FAIL: ${step}; details suppressed to protect fixture credentials`);
  process.exitCode = 1;
} finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (pool) await pool.end();
  if (admin) await admin.end();
}
