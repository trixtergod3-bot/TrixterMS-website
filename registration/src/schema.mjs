// Operator applies this only to the confirmed authoritative schema. No account migration.
export const rateTableSql = `CREATE TABLE registration_limits (
  bucket BIGINT UNSIGNED NOT NULL,
  subject CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  attempts INT UNSIGNED NOT NULL,
  PRIMARY KEY (bucket, subject)
) ENGINE=InnoDB`;
