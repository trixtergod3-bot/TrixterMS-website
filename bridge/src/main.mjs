import { readConfig } from './config.mjs';
import { createDatabaseSource } from './database.mjs';
import { createBridgeServer } from './http.mjs';
import { createSnapshotCache } from './rankings.mjs';
import { createRuntimeCache, createRuntimeFileSource } from './telemetry.mjs';

async function main() {
  let stopService = null;
  // A killed supervisor must not orphan a child during asynchronous startup.
  process.once('disconnect', () => { if (stopService) stopService(); else process.exit(0); });
  const config = readConfig();
  const source = await createDatabaseSource(config.database);
  try { await source.verifyBoundary(); }
  catch {
    await source.close().catch(() => {});
    throw new Error('Public reader boundary validation failed');
  }
  const cache = createSnapshotCache({ source, ...config,
    onFailure: () => process.stderr.write('Public rankings refresh unavailable; retry scheduled.\n') });
  const runtime = createRuntimeCache({ source: config.runtimeFile ? createRuntimeFileSource(config.runtimeFile) : null });
  const server = createBridgeServer({ cache, token: config.token, runtime });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(config.port, config.host, resolve);
    });
  } catch {
    server.closeAllConnections();
    server.close(() => {});
    await source.close().catch(() => {});
    throw new Error('Bridge listener unavailable');
  }
  process.stdout.write('Public telemetry bridge listening on loopback.\n');
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    server.close(() => { void source.close().catch(() => {}).finally(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 5000).unref();
  };
  stopService = stop;
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  process.on('message', (message) => { if (message === 'shutdown') stop(); });
}

main().catch(() => {
  // Configuration and driver errors can contain secrets. Log no raw exception.
  process.stderr.write('Public telemetry bridge failed to start. Check local configuration and provisioning.\n');
  process.exitCode = 1;
});
