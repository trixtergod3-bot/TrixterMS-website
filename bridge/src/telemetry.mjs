import { open } from 'node:fs/promises';

export const RUNTIME_MAX_AGE_MS = 30_000;
const MAX_RUNTIME_BYTES = 16 * 1024;
const MAX_CHANNELS = 64;
const unavailable = Object.freeze({ online: null, playersOnline: null, channels: Object.freeze([]),
  uptimeSeconds: null, rates: Object.freeze({ exp: null, meso: null, drop: null }),
  runtimeAsOf: null, runtimeStatus: 'unavailable', recentActivity: null });

function invalid() { throw new Error('Runtime aggregate unavailable'); }
function object(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || Object.keys(value).some((key) => !keys.includes(key))) invalid();
}
function integer(value, max, min = 0) {
  if (!Number.isSafeInteger(value) || value < min || value > max) invalid();
  return value;
}
function nullableInteger(value, max) { return value === null ? null : integer(value, max); }

// This accepts only a separately reviewed aggregate producer. It never reads game
// login flags, raw event receipts, character/account IDs, or network identities.
export function projectRuntimeAggregate(value, now = Date.now()) {
  object(value, ['version', 'asOf', 'online', 'playersOnline', 'channels', 'uptimeSeconds', 'rates']);
  if (value.version !== 1 || typeof value.asOf !== 'string') invalid();
  const time = Date.parse(value.asOf);
  if (!Number.isFinite(time) || new Date(time).toISOString() !== value.asOf ||
      time > now || now - time >= RUNTIME_MAX_AGE_MS) invalid();
  if (typeof value.online !== 'boolean') invalid();
  const playersOnline = nullableInteger(value.playersOnline, 100_000);
  const uptimeSeconds = nullableInteger(value.uptimeSeconds, 315_360_000);
  if (!Array.isArray(value.channels) || value.channels.length > MAX_CHANNELS) invalid();
  const seen = new Set();
  const channels = value.channels.map((entry) => {
    object(entry, ['channel', 'status', 'playersOnline']);
    const channel = integer(entry.channel, 127, 1);
    if (seen.has(channel) || !['online', 'offline', 'unknown'].includes(entry.status)) invalid();
    seen.add(channel);
    const population = nullableInteger(entry.playersOnline, 100_000);
    if ((entry.status === 'offline' && population !== null && population !== 0) ||
        (entry.status === 'unknown' && population !== null) ||
        (!value.online && entry.status === 'online')) invalid();
    return Object.freeze({ channel, status: entry.status, playersOnline: population });
  }).sort((a, b) => a.channel - b.channel);
  if (!value.online && ((playersOnline !== null && playersOnline !== 0) ||
      (uptimeSeconds !== null && uptimeSeconds !== 0))) invalid();
  const channelTotal = channels.reduce((sum, channel) => sum + (channel.playersOnline ?? 0), 0);
  if (channelTotal > 100_000 || (playersOnline !== null && channelTotal > playersOnline)) invalid();
  object(value.rates, ['exp', 'meso', 'drop']);
  const rate = (key) => {
    const n = value.rates[key];
    if (n !== null && (typeof n !== 'number' || !Number.isFinite(n) || n <= 0 || n > 1_000_000)) invalid();
    return n;
  };
  return Object.freeze({ online: value.online, playersOnline, channels: Object.freeze(channels), uptimeSeconds,
    rates: Object.freeze({ exp: rate('exp'), meso: rate('meso'), drop: rate('drop') }),
    runtimeAsOf: value.asOf, runtimeStatus: 'live', recentActivity: null });
}

export function createRuntimeFileSource(filePath) {
  return Object.freeze({ read: async () => {
    // A fixed local path comes from protected service configuration, never a request.
    // Read at most one byte beyond the cap, even if an atomic producer update races.
    const handle = await open(filePath, 'r');
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_RUNTIME_BYTES) invalid();
      const buffer = Buffer.alloc(MAX_RUNTIME_BYTES + 1);
      let length = 0;
      while (length < buffer.length) {
        const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length);
        if (bytesRead === 0) break;
        length += bytesRead;
      }
      if (length > MAX_RUNTIME_BYTES) invalid();
      return JSON.parse(buffer.subarray(0, length).toString('utf8'));
    } finally { await handle.close(); }
  } });
}

/** @param {{source?: null | {read: () => Promise<unknown>}, now?: () => number}} options */
export function createRuntimeCache({ source = null, now = Date.now } = {}) {
  let current = unavailable, nextReadAt = 0, failures = 0, inFlight = null;
  const visible = () => {
    if (current.runtimeAsOf && now() - Date.parse(current.runtimeAsOf) >= RUNTIME_MAX_AGE_MS) current = unavailable;
    return current;
  };
  return Object.freeze({ get: async () => {
    if (!source) return unavailable;
    if (inFlight) return inFlight;
    if (now() < nextReadAt) return visible();
    inFlight = Promise.resolve().then(async () => {
      try {
        current = projectRuntimeAggregate(await source.read(), now());
        failures = 0;
        nextReadAt = now() + 5000;
      } catch {
        current = unavailable;
        failures = Math.min(failures + 1, 4);
        nextReadAt = now() + Math.min(5000 * 2 ** (failures - 1), 30_000);
      }
      return visible();
    }).finally(() => { inFlight = null; });
    return inFlight;
  } });
}

export function statsSnapshot(snapshot) {
  return { status: snapshot.status, asOf: snapshot.asOf, data: snapshot.stats };
}

export async function telemetrySnapshot(snapshot, runtime) {
  return { status: snapshot.status, asOf: snapshot.asOf,
    data: { ...snapshot.stats, ...await runtime.get() } };
}
