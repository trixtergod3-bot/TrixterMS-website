# Complete website telemetry RC1

Status: **BLOCKED on HTTPS/hosting activation and final owner QA**. Source and a real database-backed local bridge are ready. The existing public website has not been upgraded by this task.

| Gate | Evidence |
| --- | --- |
| IMPLEMENTED | Four public contracts, bounded proxy/bridge, supervised service package, freshness UI and exact activation procedure |
| TESTED | Build, typecheck, lint, 70 website tests, 39 bridge tests, focused and full browser regression, source/bundle scan and dependency audits all pass |
| VERIFIED | Authoritative MariaDB → restricted reader → authenticated local bridge → actual server proxy projection; all four responses observed |
| DEPLOYED | Website: no. One supervised local bridge is running, loopback only. No HTTPS ingress or hosting deployment performed |
| OWNER ACCEPTED | No. Native-login creation/progression/logout and final live website acceptance remain |

## Checkpoint

- Repository: `trixtergod3-bot/TrixterMS-website`.
- Branch: `codex/website-telemetry-rc1-01a097ee`.
- Verified source checkpoint: `9caa93709a1f57fe96acb96176a237a20633681e`.
- Start: latest requested branch `codex/live-rankings-telemetry-01a097bc`, `feb551643cd6803e445cac7c3d2c578624510ce6`.
- Actual checkout: `C:/Users/Studio PC/Documents/ChatGPT/TrixterMS/local/web-portal-beta-v1`.
- Exact task ID: `01a097ee-8830-70d3-8607-dd93c8b361cf`. Authoritative registry: parent game's `local/coordination/chats/website-telemetry-rc1-01a097ee.json`.
- This handoff is a later commit; its own SHA is recorded in the local registry and Git history.

The approved artwork, typography, responsive design and navigation remain intact. Main branches were not merged with this candidate. Game/DA/Explorer/client/launcher files and player records were not changed. Live setup added only the reviewed SQL view, locked column-reader definer and dedicated view-only reader accounts. No port or firewall rule was opened.

## Endpoint behavior

`/api/public/rankings` and `/api/public/characters` return paginated public standings, with optional exact public-name lookup on characters. Every existing non-deleted row is eligible, including Level 1 and unknown jobs. The actual schema physically deletes character rows. Sorting is level/EXP then a stable private tie order; fame sort adds fame first. Page/total/filters remain consistent within each timestamped snapshot. Marked DA, genuine Paladin and native Demon Slayer keep distinct labels without public marker/identifier fields.

`/api/public/stats` returns total characters, class distribution and ranking snapshot time. `/api/public/telemetry` adds the nullable online/population/channel/uptime/rate contract and a separate runtime observation timestamp/status. The current runtime producer is absent: those fields remain null/empty and `runtimeStatus=unavailable`, while real DB-derived statistics remain available. `recentActivity=null`; no unverified activity data or new per-player collection was introduced.

All four use one bounded shared DB snapshot. Defaults: 10-second bridge refresh, 50000-character cap with overflow detection, 16 MiB snapshot cap, one DB connection, two-second statement budget, bounded failure backoff. Bridge request budget is 120/minute. Website caching is bounded to 128 entries/4 MiB, eight upstream requests in flight, upstream burst eight and sustained 120/minute, request burst 240 and 120/second. Hosting-edge controls remain required across processes.

Validated live/stale data returns 200. Stale status is explicit and cannot outlive 120 seconds from the original timestamp. Runtime observations expire at 30 seconds. Missing/expired data returns 503 with null data and a retry hint; malformed requests return 400, exhausted request budgets 429. Legacy rankings/status aliases use the same hardened reader. The UI retains current layout, labels stale data, expires old rows, deduplicates polling and backs off. See the [complete RC1 contract](../../WEBSITE_TELEMETRY_RC1.md) and [bridge activation runbook](../../../bridge/README.md).

## Actual live evidence

The recovery lane established the accepted runtime at `F:/TRITER MS/single-pc-runtime`, one game JVM and one MariaDB 10.4.14 process. Its verified cold backup had 829 files before recovery. This task independently observed the database's loopback-only listener, inspected schema/index metadata through protected local administration, and provisioned the absent dedicated objects. Credentials were generated in memory and stored only in the owner/SYSTEM-protected ignored `bridge/local/bridge.env`; none entered task text or Git. Reader limits are one connection and two-second statements.

- Dedicated reader identity/schema/read-only state, exact view columns, SELECT-only grants, no inherited roles, and three denied zero-row base-table probes: PASS.
- Real bounded SELECT: **30 eligible characters, one Level 1**, **0.8 ms** at `2026-09-12T23:48:52.047Z`, limit 50001. This is a small live population measurement, not a large-scale benchmark.
- No marked DA specimen was present in this snapshot. DA/Paladin/DS distinction is proven by source/SQL and synthetic regressions; no live marked-DA acceptance is claimed.
- MariaDB denied reader EXPLAIN with error 1345. The validator now records that exact condition separately. Protected administrator EXPLAIN passed: index/eq_ref/ref access, estimated 29/1/4 rows, no filesort or temporary table. Reader privileges were not widened.
- All four authenticated bridge endpoints returned **200**, shared the same DB timestamp and passed the actual server proxy projection. No internal identifiers or marker values appeared. Missing authentication returned **401**.
- Transport verified here: authenticated loopback HTTP plus the server reader in explicit local development mode. **Production HTTPS and deployed browser integration remain unverified**; no TLS verification was disabled.
- Supervisor PID 24408 owns bridge child PID 1940, observed at `127.0.0.1:4316`; database remains `127.0.0.1:3306`. Process IDs are dated operational evidence and must be rechecked before any stop. No scheduled startup task was installed.

The native game login/character creation flow was not driven in this lane. It must remain manual ID/password; no account was preset, no launcher bypass was used, and no acceptance was inferred.

## Test evidence

| Check | Result |
| --- | --- |
| `npm run build` | PASS, production Next.js routes compiled |
| `npm run typecheck`, `npm run lint` | PASS |
| `npm test` | 70/70 PASS |
| `npm --prefix bridge test` | 39/39 PASS |
| Focused rankings browser | Nine behavior groups, 14 requests, zero page errors; includes Level 1, stale response/expiry, pagination, classes, outage/recovery and 320/390px layouts |
| Full browser | 120 route/viewport checks and branding checks, 26 internal links, 10 interactions, zero page/console errors; six expected unavailable API responses |
| Security/bundle scan | Source and 55 generated browser bundles, zero findings |
| Website and bridge production dependency audits | Zero reported vulnerabilities |
| Live reader/bridge | Real grants, SELECT/latency, separate administrator EXPLAIN, four authenticated contracts and private-field absence PASS |
| Owner/live HTTPS acceptance | NOT RUN |

Independent review also caught and fixed unclosed rejected upstream streams and a `__proto__` query-validation bypass; both have regressions. Supervisor tests verify exclusive locking, bounded crash retries, graceful child-only shutdown and cleanup when a parent disappears. Tests never substitute fixture results for the live evidence above.

## Routing, remaining activation and rollback

Read-only probes observed trixterms.com homepage/rankings 200, old `/api/rankings` 503, and all four new public paths 400 on the existing release. No domain/DNS/hosting change occurred. A historical trixterms.com beta test path returned 404; the readiness harness identifies the separate canonical Hostinger feed, which returned 200. Its manifest SHA-256 remained **81989C03BEF5D773699C0B4B20DC0F2B315A229F74B449A2A7E8EBB2BBDC9AF8** before and after this work.

Smallest next step: configure an authenticated HTTPS ingress to the existing local bridge, then set the matching server-only API URL/token on an isolated hosting preview of this checkpoint. Use protected configuration, never chat credentials. Validate the four preview endpoints and preserve the existing domain/patch routes before any approved production cutover. Real rankings and class totals can go live before the optional runtime aggregate producer is available. After that, add the trusted producer for online/channel/uptime/effective-rate telemetry and perform owner native-login QA.

For local rollback, verify the supervisor/child paths against the protected start receipt, then stop only that supervisor; child disconnect triggers cleanup. Remove only this bridge's ingress/environment settings if later configured. Revoke/drop only the newly created dedicated view accounts and view after checking dependencies. No player-data restore, game restart or client rollback is required. Do not switch this checkout away from the recorded source while its supervisor may restart a child; stop the bridge first or install a separate pinned service directory.

Local-only evidence: `local/qa/rc1-live-db.json`, `rc1-live-explain.json`, `rc1-live-reader.txt`, `rc1-public-baseline.json`, `rc1-patch-baseline.json`, `rc1-patch-after.json`, browser receipts/screenshots, and protected `bridge/local/` start/provisioning receipts. Raw credentials, generated environment files, build caches, screenshots and operational scripts remain ignored. The [JSON mirror](website-telemetry-rc1-01a097ee.json) lists all owned source paths and independent evidence flags.
