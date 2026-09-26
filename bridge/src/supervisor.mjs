import { fork } from 'node:child_process';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const bridgeRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export function restartDelay(failures) {
  return Number.isInteger(failures) && failures >= 1 && failures <= 5
    ? Math.min(1000 * 2 ** (failures - 1), 30_000) : null;
}

export async function acquireSupervisorLock(directory = resolve(bridgeRoot, 'local')) {
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, 'supervisor.lock');
  const handle = await open(path, 'wx', 0o600); // Existing/orphaned locks fail closed.
  const owner = JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() });
  await handle.writeFile(owner, 'utf8');
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    await handle.close();
    if (await readFile(path, 'utf8').catch(() => '') === owner) await unlink(path);
  };
}

export async function supervise({ forkChild = fork, acquireLock = acquireSupervisorLock,
  signals = process, schedule = setTimeout, cancel = clearTimeout, now = Date.now,
  log = (text) => process.stderr.write(text) } = {}) {
  const release = await acquireLock();
  let child = null, timer = null, killTimer = null, failures = 0, stopping = false, done = false;
  let complete;
  const completion = new Promise((resolveDone) => { complete = resolveDone; });
  const finish = async (code) => {
    if (done) return;
    done = true;
    cancel(timer); cancel(killTimer);
    signals.removeListener('SIGINT', stop);
    signals.removeListener('SIGTERM', stop);
    await release().catch(() => {});
    complete(code);
  };
  const stop = () => {
    if (stopping) return;
    stopping = true;
    cancel(timer);
    if (!child) { void finish(0); return; }
    // IPC also permits graceful shutdown on Windows, where SIGTERM may terminate
    // immediately. The timeout kills only our exact child process.
    const stoppingChild = child;
    killTimer = schedule(() => stoppingChild.kill('SIGKILL'), 5000);
    if (stoppingChild.connected) stoppingChild.send('shutdown', () => {});
    else stoppingChild.kill('SIGTERM');
  };
  const start = () => {
    const startedAt = now();
    let settled = false;
    const exited = (code) => {
      if (settled) return;
      settled = true;
      child = null;
      cancel(killTimer);
      if (stopping || code === 0) { void finish(0); return; }
      if (now() - startedAt >= 600_000) failures = 0;
      const delay = restartDelay(++failures);
      if (delay === null) {
        log('Bridge supervisor stopped after repeated startup failures. Inspect protected local configuration.\n');
        void finish(1); return;
      }
      log('Bridge process unavailable; bounded restart scheduled.\n');
      timer = schedule(start, delay);
    };
    try {
      child = forkChild(resolve(bridgeRoot, 'src/main.mjs'), [], { cwd: bridgeRoot, execArgv: [],
        windowsHide: true, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      child.once('error', () => exited(1));
      child.once('exit', exited);
    } catch { exited(1); }
  };
  signals.once('SIGINT', stop);
  signals.once('SIGTERM', stop);
  start();
  return completion;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  supervise().then((code) => { process.exitCode = code; }).catch(() => {
    process.stderr.write('Bridge supervisor unavailable. Inspect the local lock and configuration before restarting.\n');
    process.exitCode = 1;
  });
}
