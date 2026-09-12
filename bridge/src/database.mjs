import { verifyReaderBoundary } from './privileges.mjs';

// Only this module loads the external driver; fake-source tests have no dependencies.
export const SNAPSHOT_SQL = `SELECT internalId, world, name, level,
  CAST(exp AS CHAR) AS exp, jobId, fame, guildName, isDemonAvenger
  FROM trixter_public_characters_v1
  ORDER BY internalId ASC LIMIT ?`;

export const POOL_LIMITS = Object.freeze({
  connectionLimit: 1,
  minimumIdle: 0,
  idleTimeout: 15,
  acquireTimeout: 3000,
  connectTimeout: 1000,
  socketTimeout: 4000,
  queryTimeout: 2000,
  multipleStatements: false,
  bigIntAsNumber: false,
  decimalAsNumber: false,
  trace: false,
  logParam: false,
  // Account grants are the security boundary. Session flags add defense in depth.
  initSql: ['SET SESSION TRANSACTION READ ONLY', 'SET SESSION max_statement_time=2'],
  resetAfterUse: false,
});

export async function createDatabaseSource(config, driverOverride) {
  const driver = driverOverride ?? (await import('mariadb')).default;
  const pool = driver.createPool({ ...config, ...POOL_LIMITS });
  // MariaDB pool errors may contain connection details; never pass the Error to logs.
  pool.on('error', () => {});
  return Object.freeze({
    readSnapshot: (limit) => {
      if (!Number.isSafeInteger(limit) || limit < 2 || limit > 100_001) throw new Error('Invalid snapshot capacity');
      return pool.query({ sql: SNAPSHOT_SQL, timeout: 2000 }, [limit]);
    },
    explain: () => pool.query({ sql: `EXPLAIN ${SNAPSHOT_SQL}`, timeout: 2000 }, [100_001]),
    verifyBoundary: () => verifyReaderBoundary(pool, config.database),
    close: () => pool.end(),
  });
}
