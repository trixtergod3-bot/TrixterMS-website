# Public telemetry bridge

This is a standalone Node service for the existing website. It reads a restricted SQL view on the verified game database host and serves only public ranking DTOs to the website's server-side provider. It does not start or restart the game, write player data, alter gameplay, connect a browser to MariaDB, or require a website rebuild when characters change.

Code and fake-source tests are implemented. **No view, database account, index, host process, proxy, or deployment is created by installing this package.** Real database and website verification remain separate required steps. Follow the repository's current host authority and process-path rules before host operations; historical SINGLE_PC notes do not override the current owner instruction naming `trixterms-beta-host`.

## Contract

Authenticated `GET /api/public/rankings?page=1&limit=50` returns (`/api/rankings` remains a compatibility alias):

```json
{
  "status": "live",
  "asOf": "2026-09-13T00:00:00.000Z",
  "data": {
    "entries": [],
    "total": 0,
    "page": 1,
    "pageSize": 50
  }
}
```

Each entry contains exactly `rank`, `name`, `level`, `exp` (decimal string), `jobId`, `jobName`, `fame`, `guildName` (nullable), and `score` (null for character rankings). Internal character IDs, world values, and the DA classification boolean never enter the public entry. No account table is read. No private character ownership, credentials, or quest data enters the view output.

- `page`: 1–10000; `limit`: 1–100, default 50. An out-of-range page is an empty page with the correct total.
- `sort=level` (default): level descending, exact EXP descending, internal ID ascending.
- `sort=fame`: fame descending, then the same progression/tie ordering.
- Optional `world=0..127` and `job=0..99999` apply in memory to the same snapshot.
- `class=demon-avenger` selects all marked supported DA carriers. `class=paladin` selects unmarked job 122. `class` and `job` cannot be combined.
- `total` counts the filtered population; `rank` is the position within the filtered ordering, including page offset.
- `/api/public/characters` returns the same paginated standing collection and permits an optional exact, case-sensitive `name` filter (1–13 characters, no control characters). A missing name returns an empty collection; it never reveals a private lookup identifier. The rankings endpoint rejects `name`.
- `/api/public/stats` accepts no query parameters. Its `data` is exactly `{totalCharacters, classDistribution:[{jobName,count}], rankingSnapshotAt}`. Class names use the same DA-aware presentation as rankings; counts cover every eligible character. Distribution is sorted by public job name, and its counts sum to the unfiltered total.
- `/api/public/telemetry` accepts no query parameters. It contains the stats fields plus `{online, playersOnline, channels:[{channel,status,playersOnline}], uptimeSeconds, rates:{exp,meso,drop}, runtimeAsOf, runtimeStatus, recentActivity}`. Runtime fields require a separate trustworthy aggregate source described below. Unconfigured, invalid, expired or unavailable runtime input produces `online:null`, `playersOnline:null`, `channels:[]`, `uptimeSeconds:null`, all rates null, `runtimeAsOf:null`, `runtimeStatus:"unavailable"`, and `recentActivity:null`. A reachable DB or bridge does not prove that the game is online.
- All four endpoints use `{status:"live"|"stale",asOf,data}`. Here `asOf` and `rankingSnapshotAt` are the ranking query-start timestamp. A stale response retains that timestamp; `runtimeAsOf` and `runtimeStatus` separately express the runtime observation. A fresh DB snapshot can therefore carry unavailable runtime data, and a stale DB snapshot can carry fresh runtime observations.
- Unknown or duplicate query keys, malformed values, and conflicting filters return 400. Missing/wrong authentication returns 401; other methods 405; source failure with no still-usable snapshot/capacity failure returns 503 with a safe message and `Retry-After`. An HTTP 503 has no `data` or invented player counts. A real empty database returns live data with zero characters.
- A single process-wide token bucket allows 120 requests per minute with an initial burst of 120 across all endpoints, query variants, authentication failures and cached reads. Exhaustion returns 429 with `Retry-After`. It stores no client IPs or identities. This local limit supplements the HTTPS proxy's access policy and edge limits.
- All responses are `no-store`. Errors omit raw driver messages. The service does not log requests, authorization headers, rows, connection configuration, or raw exceptions.

## Database facts and class identity

The source schema is documented in `server/sql/seperate/12-characters.sql`, `31-guilds.sql`, and `65-queststatus.sql`; those are alternate schema documentation, **not additive migrations to import**. The baseline import authority remains `server/sql/aio/lidium.sql` plus reviewed applied migrations.

The view in [schema.sql](schema.sql) projects `characters.id/world/name/level/exp/job/fame`, and joins `characters.guildid` to `guilds.guildid/name`. `MapleClient.deleteCharacter` physically deletes `characters`; there is no `deleted` or `active` flag. Eligibility is row existence: every persisted non-deleted character is included, including level one, staff, and unfamiliar job IDs. There is no account, GM, ban, minimum-level, recent-login, or online filter. A bad row fails the whole snapshot visibly rather than silently dropping a character.

`MapleCharacter.getDefault` starts normal creation at level 1. `saveNewCharToDB` inserts the character and commits the transaction before successful creation is acknowledged. Logout leaves the character row intact. The old `RankingWorker` is deliberately not used: its level-30 threshold, job allowlist, rank writes, and fame tiebreaker conflict with this contract.

The DA predicate is copied from the current `server/src/server/TrixterDemonAvenger.java`, without modifying it:

1. Carrier job is 100, 120, 121, or 122.
2. A `queststatus` row has `quest=999132900`, `status=0`, and **byte-exact** `customData=TRIXTER_DA_WARRIOR_CARRIER_V1`.

The SQL uses `BINARY` equality, matching Java's exact string comparison including case/trailing spaces. `EXISTS` prevents duplicate quest rows from multiplying characters. Only a boolean leaves this SQL predicate. Supported marked carriers display **Demon Avenger**; unmarked job 122 remains **Paladin**; native 3001/3100/3110/3111/3112 remains **Demon Slayer** even if an invalid marker is present. The deprecated `isDemonAvenger` method is intentionally not used.

[src/jobs.mjs](src/jobs.mjs) is the presentation mapping layer, sourced from `MapleCarnivalChallenge.java` and `LoginInformationProvider.java`, using GMS display names. Unknown jobs display `Unknown job (ID)` and remain eligible. No character job, marker, skill, WZ, or gameplay value is written. Coordinate predicate changes with the DA/DS lane before updating the view.

## Cache and query cost

All requests share one immutable snapshot and two pre-sorted arrays. The first request after 10 seconds starts one refresh; concurrent callers await the same promise. Idle time causes no database traffic. The query uses one bounded, parameterized SELECT over the view with the existing character primary key ordering; ranks and filter totals are computed in memory. There is no per-character database request, no per-browser SQL query while cached, and no N+1 guild fetch.

The default maximum is 50000 characters; the hard configuration ceiling is 100000. Fetching one extra row detects over-capacity, and a 16 MiB serialized projection budget provides a second bound. Exceeding either never publishes an incomplete snapshot. Raw rows are also bounded by SQL `LIMIT` and fixed schema column widths. The one-connection pool uses 2-second statement limits, a 3-second acquire timeout, and a 4-second socket timeout. An unsuccessful refresh backs off at 10/20/40/60 seconds. A previously complete snapshot remains available with explicit `status:"stale"` only while it is less than 120 seconds old; at 120 seconds it is discarded and the endpoint returns 503. Old data is never returned as `live` after expiry/failure. An over-capacity refresh follows the same rule: temporarily retain the labelled previous complete snapshot, then become unavailable.

All ranking pages, character lookups, stats and telemetry share this one cache and one in-flight read. Class distribution is computed once per refresh. Polling 100 callers each second for a minute causes six SELECTs in deterministic tests. An unavailable source receives at most one new attempt after its bounded backoff; query/endpoint variation cannot create new source caches. These are per-process bounds: activate one supervised bridge, rather than multiplying bridge instances.

Existing source indexes are `characters.PRIMARY(id)`, `guilds.PRIMARY(guildid)`, and `queststatus.characterid`. There is no proven ranking composite index. Since this implementation sorts each shared snapshot in memory, it needs no speculative level/EXP index. The marker subquery can use `queststatus.characterid`; a `(characterid, quest, status)` index is a possible measured follow-up only. Inspect actual indexes and `EXPLAIN`, row counts, and query latency on the verified host before traffic. Benchmark a disposable copy and back up before any approved index change; this package applies none.

`asOf` is query-start time, conservatively reporting freshness. A 10-second source cache plus a 20-second website poll targets roughly 10–30 seconds **after the change commits to the database**. Current game source `Start.java` autosaves online characters every **five minutes**. Creation commits immediately; in-memory level/EXP gains may wait for normal save/logout, then appear at the next refresh. This lane does not shorten autosave or add gameplay persistence writes. Do not claim a 30-second in-game leveling SLA or verified integration without the real owner test.

## Host provisioning, performed separately

1. On the currently authorized game host, confirm repository root, game/MariaDB executable paths, process identity, schema, MariaDB version, and loopback-only 3306 listener. Preserve active player state and existing configuration. Never start a replacement local game/database to simulate the authoritative source. Record only safe paths, counts, hashes, and aggregate evidence.
2. Inspect `SHOW COLUMNS` and `SHOW INDEX` for the three tables locally. Do not print player rows or account data. Check that the view/account names below do not already exist; this source intentionally has no `CREATE OR REPLACE`. Inspect existing conflicting definitions before any change.
3. Take a protected backup through the host's existing authorized backup procedure. Keep SQL backups and credential-bearing files local and ignored. Use the project's existing protected MariaDB option file for administrator access; never put passwords on the command line or in Git. Existing secret mechanisms are ignored `local/secrets.env`, `local/server.properties`, and client option files generated by `tools/common.ps1`. Do not reuse the game application's login in the bridge.
4. Create `trixter_public_definer@localhost` as a dedicated locked account through protected administrator input. Give it only the following column grants (use the verified schema name if it differs):

```sql
GRANT SELECT (id, world, name, level, exp, job, fame, guildid)
  ON trixterms_dev.characters TO 'trixter_public_definer'@'localhost';
GRANT SELECT (guildid, name)
  ON trixterms_dev.guilds TO 'trixter_public_definer'@'localhost';
GRANT SELECT (characterid, quest, status, customData)
  ON trixterms_dev.queststatus TO 'trixter_public_definer'@'localhost';
```

5. As the authorized administrator, execute the reviewed [schema.sql](schema.sql) against that schema. The fixed definer is the locked column reader, **never root**. Create `trixter_public_reader@127.0.0.1` with a newly generated strong password via a protected local provisioning mechanism. If the host's MariaDB resolves loopback users as localhost, provision that exact host account instead after inspection, never a wildcard host. Grant only:

```sql
GRANT SELECT ON trixterms_dev.trixter_public_characters_v1
  TO 'trixter_public_reader'@'127.0.0.1';
```

6. Confirm locally that reader privileges are **only SELECT on this view**, with no grant option, global/schema/table base privileges, inherited role access, or write privileges. Confirm direct reads of `characters`, `queststatus`, and `accounts` are denied using zero-row SELECTs. Confirm `EXPLAIN` for the bridge query and the real bounds. Do not copy credential-bearing `SHOW GRANTS`/user definitions into evidence. The view is the least-privilege boundary; connection read-only flags are additional defense, not a replacement for the grants.
7. In this bridge directory run `npm ci --ignore-scripts` from the reviewed lockfile. Prepare ignored `local/bridge.env` with file access restricted to the service owner. The package's `npm start` uses Node's `--env-file=local/bridge.env` and the included supervisor to avoid shell arguments containing secrets. Never create `NEXT_PUBLIC_` versions. Use these keys (the bracketed values are instructions, not working defaults):

```text
TRIXTER_BRIDGE_TOKEN=<32 random bytes encoded as base64url; share only with website server>
TRIXTER_BRIDGE_DB_HOST=127.0.0.1
TRIXTER_BRIDGE_DB_PORT=3306
TRIXTER_BRIDGE_DB_NAME=trixterms_dev
TRIXTER_BRIDGE_DB_USER=trixter_public_reader
TRIXTER_BRIDGE_DB_PASSWORD=<new dedicated reader password, at least 24 characters>
TRIXTER_BRIDGE_HOST=127.0.0.1
TRIXTER_BRIDGE_PORT=4316
TRIXTER_BRIDGE_MAX_ROWS=50000
```

The service token must have at least 43 base64url characters and adequate character diversity; generate it from cryptographically random bytes. The process refuses non-loopback bridge/DB hosts, the game/root DB username, weak tokens, and missing secrets. IPv6 `::1` is supported only when corresponding DB/user/proxy bindings have been inspected.

8. Run `npm run validate:database` only on the verified host, then inspect its sanitized counts/latency/plan flags. This command executes SELECT/EXPLAIN only and does not print character names, IDs, marker data, credentials, raw SQL errors, or connection metadata. Startup and this command check the current dedicated loopback account, schema, read-only session, direct global/schema/table/column grants, absence of applicable roles, and exact view columns through information-schema metadata. They require zero-row direct base-table probes to fail with access-denied errors. Neither uses `SHOW GRANTS` or reads account hashes. The validator explicitly reports `verifiedEndToEnd:false`. MariaDB can return error 1345 for EXPLAIN on a definer view while permitting its SELECT. Only that exact error leaves the successful reader/grants/SELECT/latency checks intact while reporting `queryPlanVerified:false`, `explainRequiresAdministrator:true`, and `plan:null`. Every other EXPLAIN error fails validation. Do not add SHOW VIEW or base-table privileges to make the reader explain succeed; perform the separate protected administrator check below. A passing reader check does not replace administrator inspection of the locked definer, routine/proxy grants, live query plans, public network exposure, the website, or owner acceptance; retain evidence for the separate checks above.
9. Start one included supervisor as described below. Publish only an authenticated HTTPS reverse-proxy route to loopback 4316. Keep the route private to the website server where possible (private tunnel/network or access policy), preserve TLS verification, and require `Authorization: Bearer <service token>` at the bridge. Configure proxy rate limits, no request/authorization-body logs, no caching of failures, and request timeouts. Do not open 3306, disable TLS verification, expose the plain-HTTP bridge port, or place the token in browser JavaScript. The website server-side provider receives its HTTPS base URL and token through existing server environment secrets. Route the four `/api/public/*` paths and optional `/api/rankings` alias to the bridge; leave the existing website routing, DNS and `/beta` patch feed untouched.
10. Verify the public website endpoint, browser polling, and native in-game creation flow against the real database. Compare locally without copying private rows. Check new level-one appearance, committed EXP/level update, logout persistence, correct guild/job labels, pagination, mobile layout, outage/recovery, public DTO allowlist, token absence in browser bundle, and loopback-only DB listener. Record implemented/tested/verified/ownerAccepted separately.

Rollback is scoped: stop only this bridge, remove its HTTPS route and website bridge configuration, revoke/drop only these dedicated view accounts, and drop only `trixter_public_characters_v1` after checking dependencies. No game restart, character/database restore, WZ change, or global firewall change is required.

### Separate administrator query-plan check

If the reader receipt reports `explainRequiresAdministrator:true`, use the host's **existing protected administrator option file** solely for this fixed read-only EXPLAIN. Keep that option file separate from the bridge environment and never configure the bridge with its identity. Confirm the current host/schema and actual client path first. In the template below, substitute the reviewed schema, protected option-file path and the configured maximum plus one (50001 for the default limit). `--defaults-extra-file` must be the first client option. Do not print the option file or put a password in a command argument.

```powershell
$planClient = (Get-Command mariadb -CommandType Application -ErrorAction Stop).Source
$planOptions = '<existing protected administrator option-file path>'
$planSchema = '<verified game schema>'
$planQuery = 'EXPLAIN SELECT internalId, world, name, level, CAST(exp AS CHAR) AS exp, jobId, fame, guildName, isDemonAvenger FROM trixter_public_characters_v1 ORDER BY internalId ASC LIMIT 50001'
& $planClient "--defaults-extra-file=$planOptions" "--database=$planSchema" '--batch' '--raw' '--execute' $planQuery
```

Some Windows installs name that same client `mysql.exe`; use the verified installed path in that case. Inspect the result locally. Publish only access types, estimated row counts, whether an index is used, filesort/temporary flags, the configured limit and separately measured reader SELECT latency; do not publish raw plan metadata, connection settings or option files. This check executes no DDL, GRANT, INSERT, UPDATE or DELETE. Record administrator plan verification as a separate receipt; it does not silently change the reader validator's flags or establish end-to-end website verification. No extra reader grants are required.

## Included service supervision

`npm start` launches [src/supervisor.mjs](src/supervisor.mjs), which acquires the exclusive ignored `local/supervisor.lock` before forking the fixed bridge entrypoint with the existing protected environment. It starts no shell or game process, opens no visible helper window, and accepts no user-selected child command. A second supervisor fails closed. A child crash gets at most five retries at 1/2/4/8/16 seconds; ten minutes of stable operation resets that budget. Repeated startup failure stops the supervisor visibly with exit code 1. Source outages use the bridge cache backoff, without repeatedly restarting the process.

SIGINT/SIGTERM requests child shutdown over private IPC, waits up to five seconds, then stops only that child if necessary. The bridge closes its DB pool on listener/startup failure. Parent IPC disconnect shuts down the bridge even when the supervisor is terminated externally. The supervisor removes only its own lock on graceful completion. After abrupt power/process termination, an orphaned lock intentionally prevents a blind restart: inspect the lock PID and actual executable/module paths, verify that neither the recorded supervisor nor its bridge child is alive, and only then remove the exact `bridge/local/supervisor.lock` file. Never remove it while another instance is running or kill a Node process merely because it uses Node.

For the first host activation, finish the provisioning and `npm run validate:database` steps above, run `npm test`, then start **one** `npm start` from the reviewed bridge directory. Inspect the loopback listener and authenticated responses locally with the token read from the protected file; do not echo tokens or use literal credentials in commands. Keep the foreground supervisor attached during that initial validation, then stop it before registering persistent supervision. This is bridge activation only; do not build/start/stop the game to satisfy this check.

For a verified Windows host, the following is an exact Task Scheduler registration template. Run it in the intended service owner's existing host session only after checking the actual Node/bridge paths and granting that account read access to `local/bridge.env`. Supply `$bridgeDirectory` as the verified absolute bridge directory; no owner/game credential belongs in this script. S4U requires the host's permitted batch-logon policy; if registration fails, resolve that policy in the host session rather than placing a password into this file. Do not overwrite an existing task of this name.

```powershell
$bridgeDirectory = (Resolve-Path -LiteralPath '<verified website checkout>/bridge').Path
$bridgeNode = (Get-Command node -CommandType Application -ErrorAction Stop).Source
$bridgeAction = New-ScheduledTaskAction -Execute $bridgeNode `
  -Argument '--env-file=local/bridge.env src/supervisor.mjs' `
  -WorkingDirectory $bridgeDirectory
$bridgePrincipal = New-ScheduledTaskPrincipal `
  -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
  -LogonType S4U -RunLevel Limited
$bridgeSettings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
$bridgeTrigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName 'TrixterMS Public Telemetry RC1' `
  -Action $bridgeAction -Principal $bridgePrincipal -Settings $bridgeSettings -Trigger $bridgeTrigger
Start-ScheduledTask -TaskName 'TrixterMS Public Telemetry RC1'
Get-ScheduledTaskInfo -TaskName 'TrixterMS Public Telemetry RC1'
```

The task uses the installed Node executable directly, inherits no browser secrets, and relies on the bounded supervisor rather than adding a second automatic retry policy. Inspect Task Scheduler state, the exact supervisor/child paths and loopback 4316 listener after starting. When intentionally stopping the registered task, stop only `TrixterMS Public Telemetry RC1`; verify child shutdown and handle a leftover lock using the procedure above before its next start. Persist sanitized status/exit-code evidence using the host's existing service monitoring; the program emits fixed operational text only. Task creation/startup was not executed by fixture tests.

## Optional runtime aggregate producer contract

No reviewed producer is activated in this package. Omit `TRIXTER_BRIDGE_RUNTIME_FILE` until a separate runtime lane supplies and validates one. Existing `ChannelServer.getChannelLoad`/`World.getConnected` observations are not a public metric definition: they include staff and omit Cash Shop/MTS sessions. Do not expose those raw values, raw telemetry receipts, DB login flags, or private GM presence as public telemetry.

When that producer is reviewed, set `TRIXTER_BRIDGE_RUNTIME_FILE` to its absolute, local, protected JSON file. UNC/network paths and request-controlled paths are rejected. Restrict the directory/file ACL to the producer and bridge service identities; the bridge needs read access only. The producer must atomically replace a regular file on a verified local disk, every 5–10 seconds while observations are valid. Do not create the file in a public/static directory. It must contain exactly these keys, with no per-player fields:

```json
{
  "version": 1,
  "asOf": "2026-09-13T00:00:00.000Z",
  "online": true,
  "playersOnline": 4,
  "channels": [
    { "channel": 1, "status": "online", "playersOnline": 2 },
    { "channel": 2, "status": "online", "playersOnline": 1 }
  ],
  "uptimeSeconds": 120,
  "rates": { "exp": 1, "meso": 1.5, "drop": null }
}
```

This is a **synthetic schema example**, not a live runtime reading. `asOf` is canonical UTC ISO text at observation time, never in the future and less than 30 seconds old. Clock synchronization on producer/bridge/website hosts is an activation requirement. `online` reports a fresh authoritative game health observation; explicit false means the producer actually observed offline. If the producer disappears or its observation expires, public status becomes unknown (`online:null`), not fabricated offline or zero players.

`playersOnline` counts public active sessions according to a documented, approved scope: exclude private/hidden GM sessions and avoid double-counting transfers; explicitly include supported Cash Shop/MTS sessions in the total or report null until that coverage is verified. Channel counts are public sessions currently attributable to that channel, excluding private GM sessions. Known channel counts may sum below the total because some sessions are outside channels, but may not exceed it. Unknown counts are null. At most 64 unique channel IDs in 1–127 are allowed; each status is online/offline/unknown. Offline channel counts are zero or null; unknown channel counts are null. Populations are nonnegative integers no larger than 100000. Global offline forbids online channels and nonzero total population/uptime.

`uptimeSeconds` is the current healthy authoritative game runtime's elapsed uptime, not bridge uptime; it must reset on game restart and is null when unavailable. It is an integer no larger than ten years. Rates are effective public base EXP/meso/drop multipliers from the runtime's current rate configuration; account bonuses, private GM overrides and personal modifiers never enter this contract. If effective channel rates differ or the canonical public value is unknown, use null until an approved versioned channel-rate extension exists. Known rates are finite and greater than zero, with an upper bound of 1000000. Recent activity remains null in RC1 because no existing source has yet been validated as safe and semantically complete.

The file reader caps input at 16 KiB, validates the exact shape, sorts channels, rejects extra/private keys, and projects every output field explicitly. All telemetry calls share one in-flight file read and a five-second refresh cache. Read/validation failures immediately clear prior runtime claims and back off at 5/10/20/30 seconds. Runtime samples older than 30 seconds never remain visible. These reads create no additional DB queries. Tests use synthetic files and injected runtime sources; they do not certify a real producer, file ACL or live game values.

## Tests and extensions

`npm test` uses Node's built-in test runner, fake database rows, an injected driver, ephemeral loopback HTTP servers, synthetic local runtime files and injected supervisor children/signals. It needs no installed driver, credentials, MariaDB, game runtime, or owner account. It covers exact EXP sorting, ties, level-one inclusion, marker-aware DA/Paladin/DS identity, guilds, filters, pagination, public projection, query bounds, cache single-flight across all endpoints, shared rate limiting, stale labels/expiry, physical-deletion refresh, capacity failures, transient/synchronous errors, backoff, auth, safe errors, pool/query constraints, runtime consistency/expiry, file limits, and supervisor shutdown/retry/locking behavior. It is not evidence of live database integration or installed Windows service verification.

The `readSnapshot` source, snapshot/cache, strict DTO projection, authenticated HTTP boundary, aggregate file adapter and supervisor are separate modules. Class distribution is complete in RC1 using the same snapshot. Future guild ranking and boss/activity consumers require separately reviewed versioned minimum-column views over existing telemetry tables. Do not expose raw `TrixterTelemetryService` event receipts or collect new account/device data. The smallest first activation is the reviewed view + dedicated reader + successful database validator + one supervised bridge + authenticated HTTPS configuration in the existing website host. The next runtime feature is a reviewed **online player count by channel** producer implementing the contract above.

Primary documentation used: [MariaDB Node connection options](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/node-js-connection-options), [Promise API and pooling](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/connector-nodejs-promise-api), and [CREATE VIEW security](https://mariadb.com/docs/server/server-usage/views/create-view). Driver `mariadb` 3.5.4 is pinned with its transitive lockfile; no driver install script is required.
