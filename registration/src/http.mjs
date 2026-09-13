import { createServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { registerAccount } from './account.mjs';

export function createRegistrationServer({ token, enabled = () => false, store, log = () => {}, now = Date.now }) {
  if (typeof token !== 'string' || token.length < 32) throw new Error('Service token required');
  const expected = createHash('sha256').update(`Bearer ${token}`).digest();
  let budget = 60, last = now();
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: 10_000, headersTimeout: 10_000 }, async (req, res) => {
    const send = (status, code) => {
      if (res.writableEnded || res.destroyed) return;
      // Fixed fields only. Never log request bodies, headers, addresses or SQL errors.
      log({ event: 'registration_result', status, code });
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store',
        'x-content-type-options': 'nosniff', ...(status === 429 ? { 'retry-after': '3600' } : {}) });
      res.end(JSON.stringify({ code }));
    };
    const actual = createHash('sha256').update(req.headers.authorization ?? '').digest();
    if (!timingSafeEqual(expected, actual)) { req.resume(); return send(401, 'REQUEST_REJECTED'); }
    if (req.method !== 'POST' || req.url !== '/api/register') { req.resume(); return send(404, 'REQUEST_REJECTED'); }
    if (!enabled()) { req.resume(); return send(503, 'REGISTRATION_UNAVAILABLE'); }
    const time = now(); budget = Math.min(60, budget + Math.max(0, time - last) / 1000); last = time;
    if (budget < 1) { req.resume(); return send(429, 'RATE_LIMITED'); }
    budget--;
    // The authenticated website is the only caller allowed to assert this address.
    const address = req.headers['x-trixter-client-ip'];
    if (typeof address !== 'string' || !isIP(address) || req.headers.origin
      || req.headers['content-encoding'] || (req.headers['content-type'] ?? '').split(';')[0].trim() !== 'application/json'
      || Number(req.headers['content-length'] ?? 0) > 4096) { req.resume(); return send(400, 'INVALID_REGISTRATION'); }
    const deadline = setTimeout(() => { send(400, 'INVALID_REGISTRATION'); req.destroy(); }, 8000);
    let input;
    try {
      const chunks = []; let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 4096) { send(400, 'INVALID_REGISTRATION'); req.destroy(); return; }
        chunks.push(chunk);
      }
      input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    } catch { return send(400, 'INVALID_REGISTRATION'); }
    finally { clearTimeout(deadline); }
    const result = await registerAccount(input, store, address);
    send(result.status, result.code);
  });
  server.maxConnections = 32;
  server.keepAliveTimeout = 5000;
  return server;
}
