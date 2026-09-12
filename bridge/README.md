# Public telemetry bridge

This is a standalone Node service for the existing website. It reads a restricted SQL view on the verified game database host and serves only public ranking DTOs to the website's server-side provider. It does not start or restart the game, write player data, alter gameplay, connect a browser to MariaDB, or require a website rebuild when characters change.

Code and fake-source tests are implemented. **No view, database account, index, host process, proxy, or deployment is created by installing this package.** Real database and website verification remain separate required steps. Follow the repository's current host authority and process-path rules before host operations; historical SINGLE_PC notes do not override the current owner instruction naming `trixterms-beta-host`.

## Contract

Authenticated `GET /api/rankings?page=1&limit=50` returns:

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
- Unknown or duplicate query keys, malformed values, and conflicting filters return 400. Missing/wrong authentication returns 401; other methods 405; source failure/capacity failure returns 503 with a safe message and `Retry-After`.
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

The default maximum is 50000 characters; the hard configuration ceiling is 100000. Fetching one extra row detects over-capacity, and a 16 MiB serialized projection budget provides a second bound. Exceeding either yields 503 and never an incomplete ranking. Raw rows are also bounded by SQL `LIMIT` and fixed schema column widths. The one-connection pool uses 2-second statement limits, a 3-second acquire timeout, and a 4-second socket timeout. An unsuccessful refresh discards stale data, then backs off at 10/20/40/60 seconds. Old data is never returned as `live` after expiry/failure.

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
7. In this bridge directory run `npm ci --ignore-scripts` from the reviewed lockfile. Prepare ignored `local/bridge.env` with file access restricted to the service owner. The package's `npm start` uses Node's `--env-file=local/bridge.env` to avoid shell arguments containing secrets. Never create `NEXT_PUBLIC_` versions. Use these keys (the bracketed values are instructions, not working defaults):

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

8. Run `npm run validate:database` only on the verified host, then inspect its sanitized counts/latency/plan flags. This command executes SELECT/EXPLAIN only and does not print character names, IDs, marker data, credentials, raw SQL errors, or connection metadata. Startup and this command check the current dedicated loopback account, schema, read-only session, direct global/schema/table/column grants, absence of applicable roles, and exact view columns through information-schema metadata. They require zero-row direct base-table probes to fail with access-denied errors. Neither uses `SHOW GRANTS` or reads account hashes. The validator explicitly reports `verifiedEndToEnd:false`. A passing check does not replace administrator inspection of the locked definer, routine/proxy grants, live query plans, public network exposure, the website, or owner acceptance; retain evidence for the separate checks above.
9. Start this service under the host's approved supervisor. Publish only an authenticated HTTPS reverse-proxy route to loopback 4316. Keep the route private to the website server where possible (private tunnel/network or access policy), preserve TLS verification, and require `Authorization: Bearer <service token>` at the bridge. Configure proxy rate limits, no request/authorization-body logs, no caching of failures, and request timeouts. Do not open 3306, disable TLS verification, expose the plain-HTTP bridge port, or place the token in browser JavaScript. The website server-side provider receives its HTTPS base URL and token through existing server environment secrets.
10. Verify the public website endpoint, browser polling, and native in-game creation flow against the real database. Compare locally without copying private rows. Check new level-one appearance, committed EXP/level update, logout persistence, correct guild/job labels, pagination, mobile layout, outage/recovery, public DTO allowlist, token absence in browser bundle, and loopback-only DB listener. Record implemented/tested/verified/ownerAccepted separately.

Rollback is scoped: stop only this bridge, remove its HTTPS route and website bridge configuration, revoke/drop only these dedicated view accounts, and drop only `trixter_public_characters_v1` after checking dependencies. No game restart, character/database restore, WZ change, or global firewall change is required.

## Tests and extensions

`npm test` uses Node's built-in test runner, fake database rows, an injected driver, and ephemeral loopback HTTP servers. It needs no installed driver, credentials, MariaDB, game runtime, or owner account. It covers exact EXP sorting, ties, level-one inclusion, marker-aware DA/Paladin/DS identity, guilds, filters, pagination, public projection, query bounds, cache single-flight, capacity failures, transient/synchronous errors, backoff, auth, safe errors, and pool/query constraints. It is not evidence of live database integration.

The `readSnapshot` source, snapshot/cache, strict DTO projection, and authenticated HTTP boundary are separate modules. Future status/population should consume a reviewed safe runtime aggregate snapshot; do not infer live online counts from stale DB login flags. Class/level distributions can reuse this snapshot, while guild ranking and boss/activity consumers should add versioned minimum-column views over existing telemetry tables. Do not expose raw `TrixterTelemetryService` event receipts or collect new account/device data. The next useful feature is **online player count by channel** from authoritative runtime aggregates.

Primary documentation used: [MariaDB Node connection options](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/node-js-connection-options), [Promise API and pooling](https://mariadb.com/docs/connectors/mariadb-connector-nodejs/connector-nodejs-promise-api), and [CREATE VIEW security](https://mariadb.com/docs/server/server-usage/views/create-view). Driver `mariadb` 3.5.4 is pinned with its transitive lockfile; no driver install script is required.
