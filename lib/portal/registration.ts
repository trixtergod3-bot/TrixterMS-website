import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
type Environment = Record<string, string | undefined>;
export type RegistrationCode = 'ACCOUNT_CREATED' | 'INVALID_REGISTRATION' | 'USERNAME_TAKEN'
  | 'RATE_LIMITED' | 'REGISTRATION_UNAVAILABLE' | 'REQUEST_REJECTED';
interface RegistrationInput { username: string; password: string; passwordConfirmation: string; website: string }
export function validateRegistration(value: unknown): RegistrationInput | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !['username', 'password', 'passwordConfirmation', 'website'].includes(key))
    || typeof input.username !== 'string' || !/^[A-Za-z0-9]{4,13}$/.test(input.username)
    || typeof input.password !== 'string' || !/^[\x21-\x7e]{8,32}$/.test(input.password)
    || input.passwordConfirmation !== input.password || input.website !== '') return null;
  return input as unknown as RegistrationInput;
}
function configuration(env: Environment) {
  if (env.TRIXTER_REGISTRATION_ENABLED !== 'true'
    || (env.TRIXTER_REGISTRATION_GATEWAY_TOKEN?.length ?? 0) < 32
    || (env.TRIXTER_REGISTRATION_CSRF_SECRET?.length ?? 0) < 32) return null;
  try {
    const origin = new URL(env.TRIXTER_SITE_URL ?? '');
    const gateway = new URL(env.TRIXTER_REGISTRATION_URL ?? '');
    const production = env.NODE_ENV === 'production';
    const localHttp = (url: URL) => !production && url.protocol === 'http:'
      && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if ((origin.protocol !== 'https:' && !localHttp(origin))
      || (gateway.protocol !== 'https:' && !localHttp(gateway))
      || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/'
      || gateway.username || gateway.password || gateway.hash || gateway.search) return null;
    if (production && (env.TRIXTER_REGISTRATION_ABUSE_GUARD !== 'reviewed-distributed-gateway'
      || (env.TRIXTER_REGISTRATION_PROXY_SECRET?.length ?? 0) < 32)) return null;
    return { origin: origin.origin, gateway: gateway.href, production, secure: origin.protocol === 'https:',
      token: env.TRIXTER_REGISTRATION_GATEWAY_TOKEN!, csrfSecret: env.TRIXTER_REGISTRATION_CSRF_SECRET!,
      proxySecret: env.TRIXTER_REGISTRATION_PROXY_SECRET };
  } catch { return null; }
}
export function getRegistrationAvailability(env: Environment = process.env) {
  return { enabled: configuration(env) !== null };
}
export class RegistrationRateLimiter {
  private readonly windows = new Map<string, { expires: number; count: number }>();
  private readonly capacity: number;
  constructor(capacity = 5_000) { this.capacity = capacity; }
  consume(key: string, limit: number, duration: number, now: number): boolean {
    for (const [entry, window] of this.windows) if (window.expires <= now) this.windows.delete(entry);
    const current = this.windows.get(key);
    if (current) { current.count += 1; return current.count <= limit; }
    if (this.windows.size >= this.capacity) return false;
    this.windows.set(key, { expires: now + duration, count: 1 }); return true;
  }
}
const limiter = new RegistrationRateLimiter();
const maximumBodyBytes = 4_096;
const csrfLifetime = 30 * 60_000;
function response(status: number, code: RegistrationCode, headers: Record<string, string> = {}) {
  return Response.json({ code }, { status, headers: {
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
}
function equal(left: string, right: string): boolean {
  if (left.length > 512 || right.length > 512) return false;
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
function signature(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url');
}
function validCsrf(token: string, cookie: string, secret: string, now: number): boolean {
  if (!equal(token, cookie)) return false;
  const pieces = token.split('.');
  if (pieces.length !== 3 || !/^[a-f0-9]{64}$/.test(pieces[0]) || !/^\d{13}$/.test(pieces[1])) return false;
  const age = now - Number(pieces[1]);
  return age >= 0 && age < csrfLifetime && equal(pieces[2], signature(`${pieces[0]}.${pieces[1]}`, secret));
}
async function readBoundedJson(body: ReadableStream<Uint8Array> | null): Promise<unknown> {
  if (!body) throw new Error('Missing body');
  const reader = body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  let timedOut = false;
  const deadline = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}); }, 8_000);
  try {
    for (;;) {
      const part = await reader.read();
      if (timedOut) throw new Error('Body read timed out');
      if (part.done) break;
      total += part.value.length;
      if (total > maximumBodyBytes) { await reader.cancel(); throw new Error('Body exceeds limit'); }
      chunks.push(part.value);
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks, total)));
  } finally { clearTimeout(deadline); reader.releaseLock(); }
}
interface Dependencies { fetch?: typeof fetch; now?: () => number; limiter?: RegistrationRateLimiter }
/** Same-origin gateway: no database access, credential persistence/logging, or login token. */
export async function handleRegistrationRequest(request: Request, env: Environment = process.env,
  dependencies: Dependencies = {}): Promise<Response> {
  if (!['GET', 'POST'].includes(request.method)) return response(405, 'REQUEST_REJECTED', { Allow: 'GET, POST' });
  const config = configuration(env);
  if (!config) return response(503, 'REGISTRATION_UNAVAILABLE');
  const origin = request.headers.get('origin'); const fetchSite = request.headers.get('sec-fetch-site');
  if ((origin !== null && origin !== config.origin) || (request.method === 'POST' && origin !== config.origin)
    || (fetchSite !== null && !['same-origin', 'none'].includes(fetchSite))) return response(403, 'REQUEST_REJECTED');
  let clientAddress = '127.0.0.1';
  if (config.production) {
    const edgeSecret = request.headers.get('x-trixter-edge-token') ?? '';
    const suppliedAddress = request.headers.get('x-trixter-client-ip') ?? '';
    if (!equal(edgeSecret, config.proxySecret ?? '') || !isIP(suppliedAddress)) return response(503, 'REGISTRATION_UNAVAILABLE');
    clientAddress = suppliedAddress;
  }
  const now = (dependencies.now ?? Date.now)(); const limits = dependencies.limiter ?? limiter;
  const sourceKey = createHash('sha256').update(clientAddress).digest('hex');
  const cookieName = config.secure ? '__Host-trixter-registration-csrf' : 'trixter-registration-csrf';
  if (request.method === 'GET') {
    if (!limits.consume(`csrf:${sourceKey}`, 30, 10 * 60_000, now)) return response(429, 'RATE_LIMITED', { 'Retry-After': '600' });
    const value = `${randomBytes(32).toString('hex')}.${now}`; const token = `${value}.${signature(value, config.csrfSecret)}`;
    return Response.json({ csrfToken: token }, { headers: {
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Set-Cookie': `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=1800${config.secure ? '; Secure' : ''}` } });
  }
  if (!limits.consume(`request:${sourceKey}`, 5, 60 * 60_000, now)) return response(429, 'RATE_LIMITED', { 'Retry-After': '3600' });
  if ((request.headers.get('content-type') ?? '').toLowerCase().split(';')[0].trim() !== 'application/json'
    || Number(request.headers.get('content-length') ?? '0') > maximumBodyBytes) return response(400, 'INVALID_REGISTRATION');
  const cookie = (request.headers.get('cookie') ?? '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1) ?? '';
  if (!validCsrf(request.headers.get('x-csrf-token') ?? '', cookie, config.csrfSecret, now)) return response(403, 'REQUEST_REJECTED');
  let input: RegistrationInput | null;
  try { input = validateRegistration(await readBoundedJson(request.body)); }
  catch { return response(400, 'INVALID_REGISTRATION'); }
  if (!input) return response(400, 'INVALID_REGISTRATION');
  const usernameKey = createHash('sha256').update(input.username.toLowerCase()).digest('hex');
  if (!limits.consume(`username:${usernameKey}`, 3, 60 * 60_000, now)) return response(429, 'RATE_LIMITED', { 'Retry-After': '3600' });
  try {
    const upstream = await (dependencies.fetch ?? fetch)(config.gateway, {
      method: 'POST', redirect: 'error', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(8_000),
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.token}`,
        'X-Trixter-Client-IP': clientAddress, 'X-Request-ID': randomUUID() },
      body: JSON.stringify({ username: input.username, password: input.password, passwordConfirmation: input.passwordConfirmation }) });
    const result = await readBoundedJson(upstream.body);
    const allowed: Record<number, RegistrationCode> = {
      201: 'ACCOUNT_CREATED', 400: 'INVALID_REGISTRATION', 409: 'USERNAME_TAKEN', 429: 'RATE_LIMITED', 503: 'REGISTRATION_UNAVAILABLE' };
    if (typeof result !== 'object' || result === null || !('code' in result)
      || !allowed[upstream.status] || result.code !== allowed[upstream.status]) return response(503, 'REGISTRATION_UNAVAILABLE');
    return response(upstream.status, allowed[upstream.status], upstream.status === 429 ? { 'Retry-After': '3600' } : {});
  } catch { return response(503, 'REGISTRATION_UNAVAILABLE'); }
}
