const ownGrants = "REPLACE(GRANTEE, CHAR(39), '') = CURRENT_USER()";
const view = 'trixter_public_characters_v1';
const expectedColumns = ['internalId', 'world', 'name', 'level', 'exp', 'jobId', 'fame', 'guildName', 'isDemonAvenger'];

function rejected() { throw new Error('Public reader boundary validation failed'); }

export function assertReaderMetadata({ identity, global, schema, table, column, roles, columns }, database) {
  if (Number(identity?.[0]?.validIdentity) !== 1 || Number(identity?.[0]?.validSchema) !== 1 ||
      Number(identity?.[0]?.readOnly) !== 1) rejected();
  if (!Array.isArray(global) || global.some((grant) => grant.privilegeType !== 'USAGE' || grant.isGrantable !== 'NO')) rejected();
  if (!Array.isArray(schema) || schema.length || !Array.isArray(column) || column.length) rejected();
  if (!Array.isArray(table) || table.length !== 1 || table[0].tableSchema !== database ||
      table[0].tableName !== view || table[0].privilegeType !== 'SELECT' || table[0].isGrantable !== 'NO') rejected();
  if (Number(roles?.[0]?.roleCount) !== 0) rejected();
  if (!Array.isArray(columns) || columns.map((c) => c.columnName).join('|') !== expectedColumns.join('|')) rejected();
}

export async function verifyReaderBoundary(pool, database) {
  const query = (sql, values = []) => pool.query({ sql, timeout: 2000 }, values);
  // Metadata is used in memory only. No SHOW GRANTS, mysql grant-table reads,
  // account hashes, names, or character rows are fetched or returned.
  const identity = await query(`SELECT
    CURRENT_USER() IN ('trixter_public_reader@127.0.0.1',
      'trixter_public_reader@localhost', 'trixter_public_reader@::1') AS validIdentity,
    DATABASE() = ? AS validSchema, @@tx_read_only AS readOnly`, [database]);
  const global = await query(`SELECT PRIVILEGE_TYPE AS privilegeType, IS_GRANTABLE AS isGrantable
    FROM information_schema.USER_PRIVILEGES WHERE ${ownGrants} LIMIT 256`);
  const schema = await query(`SELECT PRIVILEGE_TYPE AS privilegeType
    FROM information_schema.SCHEMA_PRIVILEGES WHERE ${ownGrants} LIMIT 1`);
  const table = await query(`SELECT TABLE_SCHEMA AS tableSchema, TABLE_NAME AS tableName,
    PRIVILEGE_TYPE AS privilegeType, IS_GRANTABLE AS isGrantable
    FROM information_schema.TABLE_PRIVILEGES WHERE ${ownGrants} LIMIT 256`);
  const column = await query(`SELECT PRIVILEGE_TYPE AS privilegeType
    FROM information_schema.COLUMN_PRIVILEGES WHERE ${ownGrants} LIMIT 1`);
  const roles = await query('SELECT COUNT(*) AS roleCount FROM information_schema.APPLICABLE_ROLES');
  const columns = await query(`SELECT COLUMN_NAME AS columnName FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`, [database, view]);
  assertReaderMetadata({ identity, global, schema, table, column, roles, columns }, database);
  for (const sql of [
    'SELECT id FROM characters WHERE 1 = 0',
    'SELECT characterid FROM queststatus WHERE 1 = 0',
    'SELECT id FROM accounts WHERE 1 = 0',
  ]) {
    let denied = false;
    try { await query(sql); }
    catch (error) { denied = error?.errno === 1142 || error?.errno === 1143; }
    if (!denied) rejected();
  }
  return Object.freeze({ readerGrantChecksPassed: true, baseTableReadsDenied: true, viewColumnsVerified: true });
}
