import assert from 'node:assert/strict';
import test from 'node:test';
import { getRegistrationAvailability, handleRegistrationRequest, RegistrationRateLimiter, validateRegistration } from '../lib/portal/registration.ts';
import { APPROVED_MAPLE_EXECUTABLE_SHA256, getPublicIntegrations, validateDiscordInvite, validateReleaseDownloads } from '../lib/portal/integrations.ts';

// Synthetic inputs only; the test transport never reaches a network or database.
const input = { username: 'Fixture42', password: 'Fixture!42', passwordConfirmation: 'Fixture!42', website: '' };
const env = { NODE_ENV: 'test', TRIXTER_SITE_URL: 'http://localhost:4311', TRIXTER_REGISTRATION_URL: 'http://localhost:9999/register',
  TRIXTER_REGISTRATION_ENABLED: 'true', TRIXTER_REGISTRATION_GATEWAY_TOKEN: 'test-only-gateway-'.repeat(3), TRIXTER_REGISTRATION_CSRF_SECRET: 'test-only-csrf-'.repeat(3) };
const now = 1_800_000_000_000;

async function session(overrides: Record<string, string> = {}) {
  const settings = { ...env, ...overrides };
  const limiter = new RegistrationRateLimiter();
  const dependencies = { limiter, now: () => now };
  const result = await handleRegistrationRequest(new Request(`${settings.TRIXTER_SITE_URL}/api/register`), settings, dependencies);
  const body = await result.json();
  const cookie = result.headers.get('set-cookie')?.split(';')[0] ?? '';
  const request = (data: unknown = input, headers: Record<string, string> = {}) => new Request(`${settings.TRIXTER_SITE_URL}/api/register`, {
    method: 'POST', headers: { Origin: settings.TRIXTER_SITE_URL, 'Content-Type': 'application/json',
      'X-CSRF-Token': body.csrfToken ?? '', Cookie: cookie, ...headers }, body: JSON.stringify(data) });
  return { settings, dependencies, request, result, cookie };
}

void test('validation matches native account constraints and rejects privilege or honeypot fields', () => {
  assert.ok(validateRegistration(input));
  for (const username of ['abc', 'a'.repeat(14), 'two words', 'äbcde', 'abc_12', 'abc12\n'])
    assert.equal(validateRegistration({ ...input, username }), null);
  for (const password of ['short', 'a'.repeat(33), 'abc defgh', 'abcdefgh\n', 'abcdefgä'])
    assert.equal(validateRegistration({ ...input, password, passwordConfirmation: password }), null);
  assert.equal(validateRegistration({ ...input, passwordConfirmation: 'different' }), null);
  assert.equal(validateRegistration({ ...input, website: 'bot' }), null);
  assert.equal(validateRegistration({ ...input, gm: 1 }), null);
  assert.equal(validateRegistration({ ...input, email: 'not-supported@example.invalid' }), null);
});

void test('missing configuration and unreviewed production abuse control fail closed', async () => {
  assert.deepEqual(getRegistrationAvailability({}), { enabled: false });
  assert.deepEqual(getRegistrationAvailability({ ...env, NODE_ENV: 'production', TRIXTER_SITE_URL: 'https://trixterms.com', TRIXTER_REGISTRATION_URL: 'https://registration.example.invalid/create' }), { enabled: false });
  const result = await handleRegistrationRequest(new Request('https://trixterms.com/api/register', { method: 'POST' }), {}, { fetch: () => { throw new Error('must not forward'); } });
  assert.equal(result.status, 503);
});

void test('cross-origin, missing origin, and forged/expired CSRF cannot reach the writer', async () => {
  const context = await session();
  const fetch: typeof globalThis.fetch = async () => { throw new Error('must not forward'); };
  const rejectedHeaders: Record<string, string>[] = [{ Origin: 'https://attacker.invalid' }, { 'X-CSRF-Token': 'forged' }, { Cookie: '' }, { 'Sec-Fetch-Site': 'cross-site' }];
  for (const headers of rejectedHeaders) {
    const result = await handleRegistrationRequest(context.request(input, headers), env, { ...context.dependencies, fetch });
    assert.equal(result.status, 403);
  }
  const expired = await session();
  assert.equal((await handleRegistrationRequest(expired.request(), env, { ...expired.dependencies, now: () => now + 1_800_001, fetch })).status, 403);
  const missing = await session(); const request = missing.request(); request.headers.delete('Origin');
  assert.equal((await handleRegistrationRequest(request, env, { ...missing.dependencies, fetch })).status, 403);
});

void test('bounded JSON and content type are enforced before upstream forwarding', async () => {
  const context = await session(); let calls = 0;
  const fetch: typeof globalThis.fetch = async () => { calls++; return Response.json({ code: 'ACCOUNT_CREATED' }, { status: 201 }); };
  for (const request of [context.request({ ...input, website: 'x'.repeat(5000) }), context.request(input, { 'Content-Type': 'text/plain' }), context.request({ ...input, gm: 1 })])
    assert.equal((await handleRegistrationRequest(request, env, { ...context.dependencies, fetch })).status, 400);
  assert.equal(calls, 0);
});

void test('successful and duplicate requests expose only the allowlisted code and never reset limits', async () => {
  const context = await session(); let calls = 0;
  const fetch: typeof globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(typeof init?.body, 'string');
    assert.deepEqual(JSON.parse(init?.body as string), { username: input.username, password: input.password, passwordConfirmation: input.password });
    assert.equal(init?.redirect, 'error');
    return Response.json({ code: calls === 1 ? 'ACCOUNT_CREATED' : 'USERNAME_TAKEN', accountId: 12345, token: 'must-be-discarded' }, { status: calls === 1 ? 201 : 409 });
  };
  const first = await handleRegistrationRequest(context.request(), env, { ...context.dependencies, fetch });
  assert.deepEqual(await first.json(), { code: 'ACCOUNT_CREATED' });
  assert.equal(first.headers.get('cache-control'), 'no-store');
  for (let i = 0; i < 2; i++) assert.equal((await handleRegistrationRequest(context.request(), env, { ...context.dependencies, fetch })).status, 409);
  assert.equal((await handleRegistrationRequest(context.request(), env, { ...context.dependencies, fetch })).status, 429);
  assert.equal(calls, 3);
});

void test('production requires authenticated proxy address and secure CSRF cookie', async () => {
  const settings = { ...env, NODE_ENV: 'production', TRIXTER_SITE_URL: 'https://trixterms.com',
    TRIXTER_REGISTRATION_URL: 'https://registration.example.invalid/create', TRIXTER_REGISTRATION_ABUSE_GUARD: 'reviewed-distributed-gateway',
    TRIXTER_REGISTRATION_PROXY_SECRET: 'test-only-proxy-'.repeat(3) };
  assert.deepEqual(getRegistrationAvailability(settings), { enabled: true });
  const result = await handleRegistrationRequest(new Request('https://trixterms.com/api/register', { headers: { 'X-Forwarded-For': '1.2.3.4' } }), settings);
  assert.equal(result.status, 503);
  const legitimate = await handleRegistrationRequest(new Request('https://trixterms.com/api/register', { headers: {
    'X-Trixter-Edge-Token': settings.TRIXTER_REGISTRATION_PROXY_SECRET, 'X-Trixter-Client-IP': '203.0.113.42' } }), settings);
  assert.equal(legitimate.status, 200);
  assert.match(legitimate.headers.get('set-cookie') ?? '', /^__Host-trixter-registration-csrf=/);
  assert.match(legitimate.headers.get('set-cookie') ?? '', /HttpOnly; SameSite=Strict; Max-Age=1800; Secure/);
});

void test('registration shares canonical origin normalization with metadata and rejects the www request origin', async () => {
  const settings = { ...env, NODE_ENV: 'production', TRIXTER_SITE_URL: 'https://www.trixterms.com/',
    TRIXTER_REGISTRATION_URL: 'https://registration.example.invalid/create',
    TRIXTER_REGISTRATION_ABUSE_GUARD: 'reviewed-distributed-gateway',
    TRIXTER_REGISTRATION_PROXY_SECRET: 'test-only-proxy-'.repeat(3) };
  const headers = { Origin: 'https://trixterms.com',
    'X-Trixter-Edge-Token': settings.TRIXTER_REGISTRATION_PROXY_SECRET,
    'X-Trixter-Client-IP': '203.0.113.43' };
  const dependencies = { limiter: new RegistrationRateLimiter(), now: () => now };
  const start = await handleRegistrationRequest(new Request('https://trixterms.com/api/register', { headers }), settings, dependencies);
  assert.equal(start.status, 200);
  const body = await start.json();
  const cookie = start.headers.get('set-cookie')?.split(';')[0] ?? '';
  let calls = 0;
  const transport = { ...dependencies, fetch: async () => {
    calls++;
    return Response.json({ code: 'ACCOUNT_CREATED' }, { status: 201 });
  } };
  const post = (origin: string) => new Request('https://trixterms.com/api/register', { method: 'POST',
    headers: { ...headers, Origin: origin, 'Content-Type': 'application/json', 'X-CSRF-Token': body.csrfToken, Cookie: cookie },
    body: JSON.stringify(input) });
  assert.equal((await handleRegistrationRequest(post('https://www.trixterms.com'), settings, transport)).status, 403);
  assert.equal(calls, 0);
  assert.equal((await handleRegistrationRequest(post('https://trixterms.com'), settings, transport)).status, 201);
  assert.equal(calls, 1);
});

void test('registration fails closed for missing or invalid production site origins', () => {
  const settings = { ...env, NODE_ENV: 'production',
    TRIXTER_REGISTRATION_URL: 'https://registration.example.invalid/create',
    TRIXTER_REGISTRATION_ABUSE_GUARD: 'reviewed-distributed-gateway',
    TRIXTER_REGISTRATION_PROXY_SECRET: 'test-only-proxy-'.repeat(3) };
  const credentialOrigin = new URL('https://trixterms.com');
  credentialOrigin.username = 'name';
  credentialOrigin.password = 'secret';
  for (const origin of [undefined, '', 'https://localhost', 'https://127.0.0.1',
    'https://trixterms.com/portal', 'https://trixterms.com?', 'https://trixterms.com#',
    'https://trixterms.com:4315', credentialOrigin.href]) {
    assert.deepEqual(getRegistrationAvailability({ ...settings, TRIXTER_SITE_URL: origin }), { enabled: false });
  }
});

void test('upstream failures, unknown status, and mismatched codes are generic and never retried', async () => {
  for (const upstream of [Response.json({ code: 'ACCOUNT_CREATED' }, { status: 200 }), Response.json({ code: 'UNKNOWN' }, { status: 201 })]) {
    const context = await session(); let calls = 0;
    const result = await handleRegistrationRequest(context.request(), env, { ...context.dependencies, fetch: async () => { calls++; return upstream; } });
    assert.equal(result.status, 503); assert.equal(calls, 1);
  }
  const context = await session();
  const failure = await handleRegistrationRequest(context.request(), env, { ...context.dependencies, fetch: async () => { throw new Error('private upstream detail'); } });
  assert.deepEqual(await failure.json(), { code: 'REGISTRATION_UNAVAILABLE' });
});

void test('bounded limiter denies new entries at capacity and expires windows', () => {
  const limiter = new RegistrationRateLimiter(1);
  assert.equal(limiter.consume('a', 1, 1000, now), true);
  assert.equal(limiter.consume('a', 1, 1000, now), false);
  assert.equal(limiter.consume('b', 1, 1000, now), false);
  assert.equal(limiter.consume('b', 1, 1000, now + 1001), true);
});

const release = { schema: 'trixterms.web-downloads.v1', publicationStatus: 'published', nativeLogin: true,
  mapleExecutableSha256: APPROVED_MAPLE_EXECUTABLE_SHA256, clientVersion: 'GMS v111.1', releaseVersion: 'fixture-beta.1', publishedAt: '2026-09-12T00:00:00Z',
  launcher: { filename: 'fixture-launcher.zip', url: 'https://downloads.example.invalid/fixture-launcher.zip', sizeBytes: 123, sha256: 'a'.repeat(64) },
  fullClient: null, manifest: { url: 'https://downloads.example.invalid/beta/manifest.json', sequence: 1 } };
void test('release metadata rejects unsafe links, altered executable pin, and invalid manifests', () => {
  assert.ok(validateReleaseDownloads(release));
  for (const changed of [{ nativeLogin: false }, { mapleExecutableSha256: 'b'.repeat(64) }, { publicationStatus: 'pending' },
    { manifest: { ...release.manifest, sequence: 0 } }, { launcher: { ...release.launcher, sha256: 'invalid' } },
    { launcher: { ...release.launcher, url: 'http://downloads.example.invalid/file.zip' } },
    { launcher: { ...release.launcher, url: 'https://127.0.0.1/file.zip' } },
    { launcher: { ...release.launcher, url: 'https://name:secret@downloads.example.invalid/file.zip' } }])
    assert.equal(validateReleaseDownloads({ ...release, ...changed }), null);
  assert.equal(getPublicIntegrations({ TRIXTER_RELEASE_DOWNLOADS_JSON: '{invalid' }).downloads, null);
});
void test('only explicitly configured Discord invites are linked; commerce providers remain disabled', () => {
  assert.equal(validateDiscordInvite('https://discord.gg/Fixture42'), 'https://discord.gg/Fixture42');
  for (const value of ['https://discord.gg.attacker.invalid/Fixture42', 'https://discord.com/channels/123', 'javascript:alert(1)', 'https://discord.gg/Fixture42?token=bad'])
    assert.equal(validateDiscordInvite(value), null);
  assert.deepEqual(getPublicIntegrations({}), { discordInviteUrl: null, downloads: null, vote: { enabled: false, provider: null }, donation: { enabled: false, provider: null } });
});
