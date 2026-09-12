import { createHash, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { pageSnapshot, parseRankingQuery, QueryError } from './rankings.mjs';
import { createRuntimeCache, statsSnapshot, telemetrySnapshot } from './telemetry.mjs';

export function validToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43,128}$/u.test(value) && new Set(value).size >= 12;
}

export function createBridgeServer({ cache, token, runtime = createRuntimeCache(), now = Date.now,
  requestsPerMinute = 120 }) {
  if (!validToken(token)) throw new Error('A strong bridge service token is required');
  if (!Number.isSafeInteger(requestsPerMinute) || requestsPerMinute < 1 || requestsPerMinute > 600) {
    throw new Error('Invalid bridge request rate limit');
  }
  // One shared token bucket; no client IPs/identifiers are stored. Endpoint/query
  // variation cannot expand memory or multiply the database refresh budget.
  let budget = requestsPerMinute, lastRefill = now();
  const expected = createHash('sha256').update(`Bearer ${token}`).digest();
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 }, async (req, res) => {
    const send = (code, body, extra = {}) => {
      const json = JSON.stringify(body);
      res.writeHead(code, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
        'referrer-policy': 'no-referrer',
        'content-length': Buffer.byteLength(json),
        ...extra,
      });
      res.end(json);
    };
    const time = now();
    budget = Math.min(requestsPerMinute, budget + Math.max(0, time - lastRefill) * requestsPerMinute / 60_000);
    lastRefill = time;
    if (budget < 1) {
      req.resume();
      return send(429, { status: 'unavailable', error: 'Request rate limit exceeded' },
        { 'retry-after': String(Math.max(1, Math.ceil((1 - budget) * 60 / requestsPerMinute))) });
    }
    budget--;
    // Do not trust X-Forwarded-* or emit permissive CORS headers. A server proxy owns this hop.
    const supplied = req.headers.authorization ?? '';
    const actual = createHash('sha256').update(supplied).digest();
    if (!timingSafeEqual(expected, actual)) {
      req.resume();
      return send(401, { status: 'unavailable', error: 'Unauthorized' }, { 'www-authenticate': 'Bearer' });
    }
    if (req.method !== 'GET') {
      req.resume();
      return send(405, { status: 'unavailable', error: 'Method not allowed' }, { allow: 'GET' });
    }
    if (req.headers['transfer-encoding'] || Number(req.headers['content-length'] ?? 0) > 0) {
      req.resume();
      return send(400, { status: 'unavailable', error: 'Request body not allowed' });
    }
    if (!req.url || req.url.length > 2048 || !req.url.startsWith('/')) {
      return send(400, { status: 'unavailable', error: 'Invalid request' });
    }
    let url;
    try { url = new URL(req.url, 'http://bridge.local'); }
    catch { return send(400, { status: 'unavailable', error: 'Invalid request' }); }
    const ranking = ['/api/rankings', '/api/public/rankings', '/api/public/characters'].includes(url.pathname);
    if (!ranking && !['/api/public/stats', '/api/public/telemetry'].includes(url.pathname)) {
      return send(404, { status: 'unavailable', error: 'Not found' });
    }
    try {
      let query;
      if (ranking) query = parseRankingQuery(url.searchParams, { allowName: url.pathname === '/api/public/characters' });
      else if (url.searchParams.size) throw new QueryError();
      const snapshot = await cache.get();
      const body = ranking ? pageSnapshot(snapshot, query) : url.pathname === '/api/public/stats'
        ? statsSnapshot(snapshot) : await telemetrySnapshot(snapshot, runtime);
      return send(200, body, body.status === 'stale' ? { 'retry-after': String(cache.retryAfterSeconds()) } : {});
    } catch (error) {
      if (error instanceof QueryError) return send(400, { status: 'unavailable', error: 'Invalid public data query' });
      return send(503, { status: 'unavailable', error: 'Public data temporarily unavailable' },
        { 'retry-after': String(cache.retryAfterSeconds()) });
    }
  });
  server.maxRequestsPerSocket = 100;
  server.maxConnections = 64;
  server.keepAliveTimeout = 5000;
  return server;
}
