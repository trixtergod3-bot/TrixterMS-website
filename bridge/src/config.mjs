import { validToken } from './http.mjs';

export function readConfig(env = process.env) {
  const integer = (key, fallback, min, max) => {
    const raw = env[key] ?? String(fallback);
    if (!/^[0-9]+$/u.test(raw)) throw new Error('Invalid numeric bridge configuration');
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error('Invalid numeric bridge configuration');
    return value;
  };
  const host = env.TRIXTER_BRIDGE_HOST ?? '127.0.0.1';
  const dbHost = env.TRIXTER_BRIDGE_DB_HOST ?? '127.0.0.1';
  if (!['127.0.0.1', '::1'].includes(host) || !['127.0.0.1', '::1'].includes(dbHost)) {
    throw new Error('Bridge and database must use loopback; publish through an authenticated HTTPS proxy');
  }
  if (!validToken(env.TRIXTER_BRIDGE_TOKEN)) throw new Error('A strong bridge service token is required');
  const user = env.TRIXTER_BRIDGE_DB_USER;
  // A dedicated account is mandatory. Game runtime/admin credentials fail closed.
  if (user !== 'trixter_public_reader') throw new Error('The dedicated public view reader account is required');
  const password = env.TRIXTER_BRIDGE_DB_PASSWORD;
  if (!password || password.length < 24) throw new Error('A dedicated database reader password is required');
  const database = env.TRIXTER_BRIDGE_DB_NAME;
  if (!database || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(database)) throw new Error('A database schema is required');
  return Object.freeze({
    host, port: integer('TRIXTER_BRIDGE_PORT', 4316, 1024, 65535),
    token: env.TRIXTER_BRIDGE_TOKEN,
    maxRows: integer('TRIXTER_BRIDGE_MAX_ROWS', 50_000, 1, 100_000),
    maxBytes: 16 * 1024 * 1024,
    refreshMs: 10_000,
    database: Object.freeze({ host: dbHost, port: integer('TRIXTER_BRIDGE_DB_PORT', 3306, 1024, 65535),
      user, password, database }),
  });
}
