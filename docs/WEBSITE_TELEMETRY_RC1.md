# Rankings and Telemetry RC1

This candidate extends the approved website design from `codex/live-rankings-telemetry-01a097bc` (handoff `feb551643cd6803e445cac7c3d2c578624510ce6`). It changes the public data path and freshness behavior. It does not deploy the site, change gameplay, or modify the patch feed. Final test and live evidence are in the [lane handoff](coordination/chats/website-telemetry-rc1-01a097ee.md).

## Boundary

`Game MariaDB → restricted SQL view / SELECT-only reader → authenticated loopback bridge → HTTPS → Next.js server proxy → public browser API`.

The bridge reads only a reviewed view with a dedicated account. The website has no database driver or database credentials. Browser requests never carry the bridge token. Neither layer forwards caller cookies, authorization, arbitrary upstream URLs, SQL, or database names. Both layers explicitly construct public responses. Character IDs, account fields, DA marker/classification values, private staff fields, network and hardware identifiers stay outside the public contracts.

## Endpoints

| GET endpoint | Successful data | Filters |
| --- | --- | --- |
| `/api/public/rankings` | `entries`, `total`, `page`, `pageSize` | `page`, `limit`, `sort=level|fame`, `job`, `class=demon-avenger|paladin`, `world` |
| `/api/public/characters` | Same paginated public character collection | Same filters, plus exact case-sensitive public `name` |
| `/api/public/stats` | `totalCharacters`, `classDistribution`, `rankingSnapshotAt` | None |
| `/api/public/telemetry` | Stats plus runtime availability, population, channels, uptime and rates | None |

`/api/rankings` remains an alias through the same hardened reader. `/api/status` projects the trusted runtime portion for the existing homepage and status page; it returns unavailable when the runtime sample is missing or expired. Existing competitions and other legacy APIs retain their separate contracts and enablement gates.

Each standing has exactly `rank`, `name`, `level`, `exp`, `jobId`, `jobName`, `fame`, `guildName`, `score`. EXP is an exact decimal string, guild is nullable, and score is null. Names are text, never HTML; staff display symbols do not become profile links. Page defaults to 1, limit to 50; maximum limit is 100 and page is bounded to 10000. Unknown, repeated, conflicting or malformed parameters are rejected. A page beyond the result set returns an empty collection with the actual filtered total. `class` and `job` cannot be combined. Name lookup reveals no account ownership, activity or hidden IDs.

Every existing character row is eligible, including Level 1, offline characters and unknown jobs. The inspected schema physically deletes characters, so a deleted row cannot enter a new snapshot. There is no minimum-level or old ranking-worker job allowlist. Deletions can remain visible only within the bounded previous snapshot window. Default order is level descending, exact EXP descending, then a stable internal tie order. Fame sort adds fame descending first. Ranks are positions within the selected filtered ordering. Pages are stable within a snapshot; updates can move rows between pages. `asOf` identifies the snapshot rather than promising cursor isolation across different timestamps.

The bridge alone applies the reviewed custom DA marker predicate. Unmarked Paladin stays Paladin; marked supported carrier jobs display Demon Avenger; native Demon Slayer remains Demon Slayer. The public client never receives the predicate inputs or classification boolean.

## Freshness and failure semantics

The public envelope is `{status,data,asOf,message,source}`. Successful live or stale snapshots return HTTP 200. `status=stale` and a fixed message identify retained observations. HTTP 503 uses `status=unavailable`, `data=null`, `asOf=null`, `source=none`; it never invents zero players or an empty leaderboard. Bad requests return 400 and request-budget exhaustion returns 429 with `Retry-After`. Responses use `Cache-Control: no-store`; bounded caching happens inside the server processes.

The bridge snapshot refresh interval is 10 seconds. The website has a 10-second per-query cache, marks observations older than 30 seconds stale, and retains a previously validated snapshot for at most 120 seconds from its original query-start timestamp. An outage never renews that timestamp. After expiry the UI removes the rows. Rankings poll about every 20 seconds, back off to at most 60 seconds after failures, avoid overlapping requests, and pause requests in hidden tabs. Existing typography, artwork, layout and routing are preserved.

The freshness clock starts at persistence. Character creation commits immediately. The inspected game source saves online progression approximately every five minutes; logout/save then makes changes eligible for the next snapshot. RC1 does not change save cadence or claim a 30-second in-game leveling guarantee.

## Runtime telemetry

Telemetry adds:

```ts
{
  online: boolean | null;
  playersOnline: number | null;
  channels: { channel: number; status: "online" | "offline" | "unknown"; playersOnline: number | null }[];
  uptimeSeconds: number | null;
  rates: { exp: number | null; meso: number | null; drop: number | null };
  runtimeAsOf: string | null;
  runtimeStatus: "live" | "unavailable";
  recentActivity: null;
}
```

`asOf` and `rankingSnapshotAt` describe the DB snapshot; `runtimeAsOf` describes a distinct runtime observation. A fresh DB snapshot with an unavailable runtime is valid: totals and distributions remain useful, while online/population/uptime/rates are null and channels empty. Missing runtime data never means offline. A fresh trusted `online=false` sample means offline. Runtime samples expire after 30 seconds and are rechecked when returning cached portal data.

The optional protected aggregate-file consumer, its exact versioned contract and producer requirements are in the [bridge runbook](../bridge/README.md). No safe runtime producer was found in the inspected stable source. Existing player-storage counts include staff and miss some locations, and legacy rate variables do not represent all effective channel rates. Do not reuse the privileged GM action bridge. A producer must define public population semantics, handle channel transfers and off-channel locations, use actual game uptime and effective rates, and emit no per-player data.

Recent activity remains null. Source contains optional daily telemetry counters, but their installation and coverage in the authoritative runtime are not established. Enabling an aggregate requires a separate narrow view and grant validation, approved metrics, one date/timezone and no double-counting of aggregate/breakdown dimensions. RC1 adds no invasive per-player collection or fabricated activity.

## Load and activation

All four endpoints share one bounded DB snapshot. Stats are computed once per snapshot. Sorting, pagination and filtering add no SQL queries. The default capacity is 50000 characters, with a hard configuration ceiling of 100000 and a 16 MiB projected snapshot cap. One extra row detects overflow; over-capacity fails visibly instead of silently omitting characters. The driver pool has one connection, a two-second query limit and fixed SELECT projection. Concurrent refreshes share one promise; failures back off. The bridge uses a global request bucket without storing caller IPs. The portal bounds cache entries/bytes, upstream concurrency and request/upstream budgets. These are per-process limits: operate one bridge supervisor and retain hosting-edge limits across website workers.

Before traffic, validate the dedicated reader's effective grants, direct base-table denial, query plan and latency on the recovered authoritative host. See the executable `validate:database` command and supervisor procedure in the [bridge runbook](../bridge/README.md). MariaDB's statement timeout limits query execution; EXPLAIN provides the query plan without executing the SELECT. [Statement time limits](https://mariadb.com/docs/server/ha-and-performance/optimization-and-tuning/query-optimizations/aborting-statements), [EXPLAIN](https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/analyze-and-explain-statements/explain).

Live RC1 testing confirmed that MariaDB 10.4.14 denies EXPLAIN through this restricted definer view with error 1345. The reader validator records that exact condition as `queryPlanVerified=false` and `explainRequiresAdministrator=true`, while retaining its independently passing grants/SELECT/latency evidence. Run the plan check separately through protected administration; never widen the runtime reader's privileges. [MariaDB error 1345](https://mariadb.com/docs/server/reference/error-codes/mariadb-error-codes-1300-to-1399/e1345).

Provision protected reader/definer accounts and the reviewed view only on the verified host, using local protected administration. Never put owner credentials in task text or reuse game/admin credentials in the bridge. Confirm 3306 remains private. Start exactly one supervised loopback bridge, verify DB-backed responses, then configure authenticated HTTPS and website-only `TRIXTER_READ_API_URL`/`TRIXTER_READ_API_TOKEN`. Missing optional runtime aggregates do not block activating real rankings and class totals.

Use a separate hosting preview of the reviewed SHA before production cutover. Preserve existing trixterms.com routing and the canonical `/beta` feed, including before/after manifest hashes and release URLs. Do not push implementation to main as a deployment shortcut. Follow [existing hosting preservation and rollback requirements](HOSTINGER_DEPLOYMENT.md). Rollback removes only the new bridge/proxy configuration and stops its supervisor; it does not restore or rewrite player data.
