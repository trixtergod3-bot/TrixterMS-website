import { performance } from 'node:perf_hooks';
import { readConfig } from './config.mjs';
import { createDatabaseSource } from './database.mjs';
import { createSnapshot } from './rankings.mjs';
import { inspectQueryPlan } from './query-plan.mjs';

// Opt-in, read-only validation. Never emits rows, names, IDs, marker text, connection
// metadata, SQL driver exceptions, grants, or configuration. Run only on the verified host.
let source;
try {
  const config = readConfig();
  source = await createDatabaseSource(config.database);
  const boundary = await source.verifyBoundary();
  const asOf = new Date().toISOString();
  const started = performance.now();
  const rows = await source.readSnapshot(config.maxRows + 1);
  const elapsedMs = Math.round((performance.now() - started) * 100) / 100;
  const snapshot = createSnapshot(rows, asOf, config);
  const plan = await inspectQueryPlan(source, config.maxRows + 1);
  process.stdout.write(`${JSON.stringify({
    status: 'read-only-database-check-passed',
    ...boundary,
    asOf: snapshot.asOf,
    total: snapshot.level.length,
    levelOneCount: snapshot.level.filter((row) => row.level === 1).length,
    demonAvengerCount: snapshot.level.filter((row) => row.isDemonAvenger).length,
    unknownJobCount: snapshot.level.filter((row) => row.jobName.startsWith('Unknown job')).length,
    elapsedMs,
    queryLimit: config.maxRows + 1,
    statementBudgetMs: 2000,
    ...plan,
    verifiedEndToEnd: false,
  }, null, 2)}\n`);
} catch {
  process.stderr.write('Read-only database validation failed. No database details emitted.\n');
  process.exitCode = 1;
} finally {
  await source?.close().catch(() => {});
}
