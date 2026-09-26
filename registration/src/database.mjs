import { createHmac } from 'node:crypto';

export function accountStore(pool, rateSecret, writer) {
  return {
    async create(username, password, address) {
      const connection = await pool.getConnection();
      try {
        // Avoid range/gap locks from expired-budget cleanup conflicting with
        // concurrent new subjects; explicit counter rows still serialize writes.
        await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
        await connection.beginTransaction();
        // Database time and row locks make limits shared across processes/restarts.
        const [{ bucket }] = await connection.query('SELECT FLOOR(UNIX_TIMESTAMP() / 3600) AS bucket');
        const key = value => createHmac('sha256', rateSecret).update(value).digest('hex');
        const budgets = [['global', 100], [`ip:${address}`, 5], [`name:${username.toLowerCase()}`, 3]];
        for (const [identity, limit] of budgets) {
          const digest = key(identity);
          await connection.query('INSERT INTO registration_limits (bucket, subject, attempts) VALUES (?, ?, 1) '
            + 'ON DUPLICATE KEY UPDATE attempts = LEAST(attempts + 1, 1000000)', [bucket, digest]);
          const [row] = await connection.query('SELECT attempts FROM registration_limits WHERE bucket = ? AND subject = ?', [bucket, digest]);
          if (row.attempts > limit) {
            await connection.commit();
            return 'limited';
          }
        }
        // Cleanup is bounded and runs only after the shared global admission gate.
        await connection.query('DELETE FROM registration_limits WHERE bucket < ? LIMIT 1000', [Number(bucket) - 24]);
        await connection.commit();
        // Reserve durable budgets before the separate Java writer; failures consume attempts.
        return await writer(username, password);
      } catch (error) {
        await connection.rollback().catch(() => {});
        throw error;
      } finally { connection.release(); }
    },
  };
}

export async function verifySchema(pool) {
  const engines = await pool.query("SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('accounts', 'registration_limits')");
  if (engines.length !== 2 || engines.some(row => row.engine !== 'InnoDB')) throw new Error('Transactional tables required');
  const columns = await pool.query("SELECT COLUMN_NAME AS name, COLUMN_TYPE AS type, EXTRA AS extra, COLUMN_DEFAULT AS defaultValue, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts'");
  const byName = new Map(columns.map(column => [column.name.toLowerCase(), column]));
  if (!byName.get('id')?.extra.includes('auto_increment') || byName.get('name')?.type !== 'varchar(13)'
    || byName.get('password')?.type !== 'varchar(128)' || byName.get('salt')?.type !== 'varchar(32)') {
    throw new Error('Account schema does not match native login contract');
  }
  const indices = await pool.query("SELECT INDEX_NAME AS name, COLUMN_NAME AS col, NON_UNIQUE AS nonUnique FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'accounts'");
  if (!indices.some(index => index.col === 'name' && Number(index.nonUnique) === 0
    && indices.filter(other => other.name === index.name).length === 1)) throw new Error('Unique account name index required');
  const limiterKey = await pool.query("SELECT COLUMN_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'registration_limits' AND INDEX_NAME = 'PRIMARY' ORDER BY SEQ_IN_INDEX");
  if (limiterKey.map(row => row.name).join(',') !== 'bucket,subject') throw new Error('Shared limiter primary key required');
  for (const name of ['loggedin', 'gender', 'monthvotes', 'totalvotes', 'lastvote', 'lastvote2']) {
    if (String(byName.get(name)?.defaultValue).replaceAll("'", '') !== '0') throw new Error('Unsafe account defaults');
  }
  for (const name of ['2ndpassword', 'salt2', 'tempban', 'sessionip']) {
    const col = byName.get(name);
    if (!col || col.nullable !== 'YES' || ![null, 'NULL'].includes(col.defaultValue)) throw new Error('Unsafe account defaults');
  }
  await pool.query('SELECT bucket, subject, attempts FROM registration_limits LIMIT 0');
}

export async function verifyWriterBoundary(pool, database) {
  const own = "REPLACE(GRANTEE, CHAR(39), '') = CURRENT_USER()";
  const global = await pool.query(`SELECT PRIVILEGE_TYPE AS privilege, IS_GRANTABLE AS grantable FROM information_schema.USER_PRIVILEGES WHERE ${own}`);
  const schema = await pool.query(`SELECT PRIVILEGE_TYPE FROM information_schema.SCHEMA_PRIVILEGES WHERE ${own}`);
  const columns = await pool.query(`SELECT PRIVILEGE_TYPE FROM information_schema.COLUMN_PRIVILEGES WHERE ${own}`);
  const roles = await pool.query('SELECT COUNT(*) AS count FROM information_schema.APPLICABLE_ROLES');
  const grants = await pool.query(`SELECT TABLE_SCHEMA AS db, TABLE_NAME AS name, PRIVILEGE_TYPE AS privilege, IS_GRANTABLE AS grantable FROM information_schema.TABLE_PRIVILEGES WHERE ${own}`);
  const allowed = new Set(['accounts:SELECT', 'accounts:INSERT', 'registration_limits:SELECT',
    'registration_limits:INSERT', 'registration_limits:UPDATE', 'registration_limits:DELETE']);
  if (global.some(row => row.privilege !== 'USAGE' || row.grantable !== 'NO') || schema.length || columns.length
    || Number(roles[0].count) !== 0 || grants.length !== allowed.size
    || grants.some(row => row.db !== database || row.grantable !== 'NO' || !allowed.has(`${row.name}:${row.privilege}`))) {
    throw new Error('Dedicated registration grants required');
  }
}
