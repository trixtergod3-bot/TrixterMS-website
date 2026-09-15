import mariadb from 'mariadb';
import { accountStore, verifySchema, verifyWriterBoundary } from './database.mjs';
import { createRegistrationServer } from './http.mjs';
import { javaWriter } from './java-writer.mjs';

const env = process.env;
let pool;
try {
  if (env.REGISTRATION_DB_USER !== 'trixter_registration_writer'
    || !env.REGISTRATION_DB_NAME || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(env.REGISTRATION_DB_NAME)
    || (env.REGISTRATION_DB_PASSWORD?.length ?? 0) < 24
    || (env.REGISTRATION_RATE_SECRET?.length ?? 0) < 32
    || (env.REGISTRATION_GATEWAY_TOKEN?.length ?? 0) < 32) throw new Error('Configuration required');
  pool = mariadb.createPool({ host: '127.0.0.1', port: 3306, user: env.REGISTRATION_DB_USER,
    password: env.REGISTRATION_DB_PASSWORD, database: env.REGISTRATION_DB_NAME,
    connectionLimit: 4, acquireTimeout: 3000, connectTimeout: 3000, queryTimeout: 5000,
    multipleStatements: false, trace: false });
  await verifyWriterBoundary(pool, env.REGISTRATION_DB_NAME);
  await verifySchema(pool);
  const server = createRegistrationServer({ token: env.REGISTRATION_GATEWAY_TOKEN,
    enabled: () => env.REGISTRATION_ENABLED === 'true',
    store: accountStore(pool, env.REGISTRATION_RATE_SECRET, javaWriter({ ...env, REGISTRATION_DB_PORT: '3306' })),
    log: event => console.info(JSON.stringify(event)) });
  server.on('error', () => { console.error('Registration listener unavailable'); process.exit(1); });
  server.listen(4317, '127.0.0.1');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
    server.close(() => { void pool.end().then(() => process.exit(0)); });
  });
} catch {
  console.error('Registration startup refused: verify private configuration, database privileges and schema');
  if (pool) await pool.end();
  process.exitCode = 1;
}
