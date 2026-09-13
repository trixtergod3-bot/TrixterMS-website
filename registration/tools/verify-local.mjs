// Explicit opt-in integration harness. Creates synthetic data ONLY in the isolated
// MariaDB instance on port 14317 with a matching task-local datadir.
import mariadb from 'mariadb';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { execFileSync, spawn } from 'node:child_process';
import { accountStore, verifySchema, verifyWriterBoundary } from '../src/database.mjs';
import { rateTableSql } from '../src/schema.mjs';
import { createRegistrationServer } from '../src/http.mjs';
import { handleRegistrationRequest, RegistrationRateLimiter } from '../../lib/portal/registration.ts';

let admin, pool, server, preview, browser, poolClosed = false;
let step = 'isolation';
try {
  const expectedDirectory = resolve('local/test-db').replaceAll('\\', '/').toLowerCase().replace(/\/$/, '');
  assert.ok(expectedDirectory.endsWith('/website-registration-v1-01a09c08/registration/local/test-db'));
  admin = await mariadb.createConnection({ host: '127.0.0.1', port: 14317, user: 'root', connectTimeout: 2000 });
  const [identity] = await admin.query('SELECT @@port AS port, @@datadir AS directory');
  assert.equal(Number(identity.port), 14317);
  assert.equal(identity.directory.replaceAll('\\', '/').toLowerCase().replace(/\/$/, ''), expectedDirectory);
  const db = 'registration_fixture';
  // This harness refuses an existing schema, so it never deletes prior data.
  await admin.query(`CREATE DATABASE ${db} CHARACTER SET latin1 COLLATE latin1_swedish_ci`);
  await admin.query(`USE ${db}`);
  const source = await readFile(process.env.TRIXTER_ACCOUNT_SCHEMA, 'utf8');
  const schema = source.match(/CREATE TABLE IF NOT EXISTS `accounts`[\s\S]*?ENGINE=InnoDB DEFAULT CHARSET=latin1;/)?.[0];
  assert.ok(schema);
  await admin.query(schema);
  await admin.query('ALTER TABLE accounts ADD PRIMARY KEY (id), ADD UNIQUE KEY name (name), MODIFY id INT NOT NULL AUTO_INCREMENT');
  await admin.query(rateTableSql);
  const password = randomBytes(32).toString('hex');
  await admin.query("CREATE USER 'trixter_registration_writer'@'127.0.0.1' IDENTIFIED BY ?", [password]);
  await admin.query(`GRANT SELECT, INSERT ON ${db}.accounts TO 'trixter_registration_writer'@'127.0.0.1'`);
  await admin.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.registration_limits TO 'trixter_registration_writer'@'127.0.0.1'`);
  pool = mariadb.createPool({ host: '127.0.0.1', port: 14317, user: 'trixter_registration_writer', password,
    database: db, connectionLimit: 4, queryTimeout: 3000 });
  step = 'schema and least privilege';
  await verifySchema(pool);
  await verifyWriterBoundary(pool, db);
  await admin.query('ALTER TABLE registration_limits DROP PRIMARY KEY');
  await assert.rejects(verifySchema(pool));
  await admin.query('ALTER TABLE registration_limits ADD PRIMARY KEY (bucket, subject)');
  await verifySchema(pool);
  await assert.rejects(pool.query('UPDATE accounts SET gm = 1 WHERE id = -1'), error => error.errno === 1142);
  await assert.rejects(pool.query('DELETE FROM accounts WHERE id = -1'), error => error.errno === 1142);
  await assert.rejects(verifyWriterBoundary(admin, db));
  const token = randomBytes(32).toString('base64url');
  const store = accountStore(pool, randomBytes(32).toString('hex'));
  server = createRegistrationServer({ token, enabled: () => true, store });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const env = { NODE_ENV: 'test', TRIXTER_SITE_URL: 'http://localhost:4311', TRIXTER_REGISTRATION_ENABLED: 'true',
    TRIXTER_REGISTRATION_URL: `http://127.0.0.1:${server.address().port}/api/register`,
    TRIXTER_REGISTRATION_GATEWAY_TOKEN: token, TRIXTER_REGISTRATION_CSRF_SECRET: randomBytes(32).toString('hex') };
  const dependencies = { limiter: new RegistrationRateLimiter() };
  const csrf = await handleRegistrationRequest(new Request('http://localhost:4311/api/register'), env, dependencies);
  const cookie = csrf.headers.get('set-cookie').split(';')[0];
  const { csrfToken } = await csrf.json();
  const input = { username: 'Fixture42', password: 'Fixture!42', passwordConfirmation: 'Fixture!42', website: '' };
  const post = body => handleRegistrationRequest(new Request('http://localhost:4311/api/register', { method: 'POST',
    headers: { origin: env.TRIXTER_SITE_URL, 'content-type': 'application/json', cookie, 'x-csrf-token': csrfToken },
    body: JSON.stringify(body) }), env, dependencies);
  step = 'website proxy through HTTP backend into database';
  assert.equal((await post(input)).status, 201);
  const [row] = await admin.query('SELECT * FROM accounts WHERE name = ?', [input.username]);
  assert.equal(row.gm, 0); assert.equal(row.banned, 0); assert.equal(row.loggedin, 0);
  assert.equal(row.PicEnabled, 0); assert.equal(row.NxCredit, 0); assert.equal(row.NxPrepaid, 0);
  assert.equal(row['2ndpassword'], null); assert.equal(row.salt2, null);
  assert.equal(row.SessionIP, null); assert.equal(row.tempban, null);
  assert.ok(row.createdat); assert.ok(row.birthday);
  assert.equal((await post({ ...input, username: input.username.toLowerCase() })).status, 409);
  step = 'native Java verifier';
  // Synthetic password only, sent over stdin; no command-line or file credentials.
  const native = execFileSync(process.env.TRIXTER_TEST_JAVA, ['-cp', process.env.TRIXTER_TEST_CLASSPATH, 'RegistrationPasswordProbe'],
    { input: JSON.stringify({ password: input.password, hash: row.password, salt: row.salt }), encoding: 'utf8' });
  assert.equal(native.trim(), 'NATIVE_PASSWORD_COMPATIBLE');
  step = 'concurrency and persistent limits';
  const { passwordRecord } = await import('../src/account.mjs');
  const results = await Promise.all([0, 1, 2].map(() => store.create('RaceFixture', passwordRecord('Fixture!42'), '192.0.2.7')));
  assert.equal(results.filter(result => result === 'created').length, 1);
  assert.equal(results.filter(result => result === 'duplicate').length, 2);
  assert.equal(await store.create('RaceFixture', passwordRecord('Fixture!42'), '192.0.2.7'), 'limited');
  for (let round = 0; round < 10; round++) {
    const outcomes = await Promise.all([0, 1, 2].map(() => store.create(`Race${round}Test`, passwordRecord('Fixture!42'), `192.0.2.${20 + round}`)));
    assert.equal(outcomes.filter(result => result === 'created').length, 1);
    assert.equal(outcomes.filter(result => result === 'duplicate').length, 2);
  }
  // Confirm backend budgets persist for a fresh store with the same production key.
  const persistentOne = accountStore(pool, 'test-persistent-secret');
  for (let i = 0; i < 3; i++) await persistentOne.create('LimitFixture', passwordRecord('Fixture!42'), '192.0.2.8');
  assert.equal(await accountStore(pool, 'test-persistent-secret').create('LimitFixture', passwordRecord('Fixture!42'), '192.0.2.8'), 'limited');
  step = 'browser through Next.js, HTTP service and MariaDB';
  const { chromium } = await import('@playwright/test');
  const origin = 'http://127.0.0.1:14318';
  preview = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '14318'],
    { cwd: resolve('..'), windowsHide: true, stdio: 'ignore', env: { ...process.env, ...env, NODE_ENV: 'development', TRIXTER_SITE_URL: origin } });
  // Next path is resolved from the parent website working directory.
  for (let attempt = 0; attempt < 60; attempt++) {
    if (preview.exitCode !== null) throw new Error('Preview exited');
    try { if ((await fetch(`${origin}/api/register`)).status === 200) break; } catch {}
    if (attempt === 59) throw new Error('Preview not ready');
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${origin}/register`);
  const fill = async (name, confirmation = input.password) => {
    await page.getByLabel('Account ID', { exact: true }).fill(name);
    await page.getByLabel('Password', { exact: true }).fill(input.password);
    await page.getByLabel('Confirm password', { exact: true }).fill(confirmation);
  };
  await fill('Browser42', 'Mismatch!42');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText('The two passwords do not match.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '');
  assert.equal(await page.getByLabel('Confirm password', { exact: true }).inputValue(), '');
  await fill('Browser42');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('button', { name: 'Account created', exact: true }).waitFor();
  const [browserRow] = await admin.query('SELECT password, salt, gm, banned FROM accounts WHERE name = ?', ['Browser42']);
  assert.equal(browserRow.gm, 0); assert.equal(browserRow.banned, 0);
  assert.equal(execFileSync(process.env.TRIXTER_TEST_JAVA, ['-cp', process.env.TRIXTER_TEST_CLASSPATH, 'RegistrationPasswordProbe'],
    { input: JSON.stringify({ password: input.password, hash: browserRow.password, salt: browserRow.salt }), encoding: 'utf8' }).trim(), 'NATIVE_PASSWORD_COMPATIBLE');
  await page.reload();
  await fill('Browser42');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText('That account ID is already in use. Choose another ID.', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '');
  assert.equal(await page.getByLabel('Confirm password', { exact: true }).inputValue(), '');
  await page.screenshot({ path: 'local/registration-mobile-duplicate.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  for (const [code, status, message] of [
    ['RATE_LIMITED', 429, 'Too many attempts. Please wait before trying again.'],
    ['REGISTRATION_UNAVAILABLE', 503, 'Registration is not available right now. Please check back soon.'],
    ['UNKNOWN', 500, 'An unexpected response prevented confirmation. Please try again later.'],
  ]) {
    let requests = 0;
    await page.route('**/api/register', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      requests++;
      await new Promise(resolve => setTimeout(resolve, 100));
      await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ code }) });
    });
    await fill('Browser42');
    await page.locator('form.registration-form').evaluate(form => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.getByText(message, { exact: true }).waitFor();
    assert.equal(requests, 1);
    assert.equal(await page.getByLabel('Password', { exact: true }).inputValue(), '');
    assert.equal(await page.getByLabel('Confirm password', { exact: true }).inputValue(), '');
    await page.unroute('**/api/register');
  }
  await browser.close(); browser = null;
  preview.kill(); preview = null;
  step = 'database unavailable';
  await pool.end();
  poolClosed = true;
  const response = await post({ ...input, username: 'Failure42' });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { code: 'REGISTRATION_UNAVAILABLE' });
  console.log('PASS: browser -> Next.js -> HTTP registration -> isolated MariaDB -> native Java password verifier; duplicate UI, cleared passwords, concurrency, defaults, grants, persistent limits, failure sanitization');
} catch (error) {
  console.error(`FAIL: local integration stage: ${step}; category: ${error?.code ?? 'assertion'}; errno: ${Number(error?.errno) || 0}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (preview) preview.kill();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  if (pool && !poolClosed) await pool.end();
  if (admin) await admin.end();
}
