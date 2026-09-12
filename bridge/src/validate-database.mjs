import { performance } from 'node:perf_hooks';
import { readConfig } from './config.mjs';
import { createDatabaseSource } from './database.mjs';
import { createSnapshot } from './rankings.mjs';

// Opt-in, read-only validation. Never emits rows, names, IDs, marker text, connection
// metadata, SQL driver exceptions, grants, or configuration. Run only on the verified host.
let source;
try {
  const config = readConfig();
  source = await createDatabaseSource(config.database);
  const boundary = await source.verifyBoundary();
  const started = performance.now();
  const rows = await source.readSnapshot(config.maxRows + 1);
  const elapsedMs = Math.round((performance.now() - started) * 100) / 100;
  const snapshot = createSnapshot(rows, new Date().toISOString(), config);
  const plan = await source.explain();
  process.stdout.write(`${JSON.stringify({
    status: 'read-only-database-check-passed',
    ...boundary,
    asOf: snapshot.asOf,
    total: snapshot.level.length,
    levelOneCount: snapshot.level.filter((row) => row.level === 1).length,
    demonAvengerCount: snapshot.level.filter((row) => row.isDemonAvenger).length,
    unknownJobCount: snapshot.level.filter((row) => row.jobName.startsWith('Unknown job')).length,
    elapsedMs,
    plan: plan.map((row) => ({ accessType: row.type ?? null,
      estimatedRows: Number(row.rows ?? 0), usesIndex: row.key != null,
      filesort: String(row.Extra ?? '').includes('filesort'),
      temporary: String(row.Extra ?? '').includes('temporary') })),
    verifiedEndToEnd: false,
  }, null, 2)}\n`);
} catch {
  process.stderr.write('Read-only database validation failed. No database details emitted.\n');
  process.exitCode = 1;
} finally {
  await source?.close().catch(() => {});
}
