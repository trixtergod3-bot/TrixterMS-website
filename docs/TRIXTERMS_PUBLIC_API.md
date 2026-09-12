# TrixterMS portal public read API

**RC1 update:** [Rankings and Telemetry RC1](WEBSITE_TELEMETRY_RC1.md) supersedes this document's earlier rankings/status caching and failure behavior. It defines the four `/api/public/` endpoints, bounded server caching and explicit stale snapshots. The legacy competition, achievement and other endpoint sections below remain historical contracts; they do not imply those services are activated.

This is the beta portal boundary and a backend implementation contract. The portal does not connect to MariaDB. A missing backend produces an unavailable state and no fabricated character, population, price, or score. This document records source inspection on 2026-09-12; it is not verification of the live beta database or runtime.

## Boundary and configuration

`TrixterMS database/runtime -> reviewed read backend -> same-origin portal /api -> browser`

`lib/portal/contracts.ts` defines public DTOs; `lib/portal/data.ts` validates, projects and fetches them. Server Components call `readPortal<T>("/api/status", optionalQuery)`. Browser components may GET the same-origin routes. `app/api/[...path]/route.ts` exposes GET only; registration has its own server-side write boundary.

Set server-only `TRIXTER_READ_API_URL` to the reviewed backend base. A base `https://backend.example/readonly` receives `/readonly/api/status`. Never use `NEXT_PUBLIC_` for backend configuration or credentials. HTTPS is required; loopback HTTP is permitted only with `NODE_ENV=development`. The backend base is administrator configuration, never a request parameter. Avoid configuring the portal as its own upstream. `TRIXTER_READ_API_TOKEN` supplies a server-only bearer token (43–128 URL-safe characters); the standalone rankings bridge requires the matching token. Browser cookies, Authorization and other client-supplied headers are never forwarded. Configure private/authenticated HTTPS routing; see [live rankings deployment and QA](LIVE_RANKINGS_BRIDGE.md).

`TRIXTER_DAILY_RANKINGS_ENABLED=true` and `TRIXTER_WEEKLY_RANKINGS_ENABLED=true` independently enable reads only after the corresponding backend/read model is verified. Both default off. There are no active fixtures in this reader: `TRIXTER_DEV_FIXTURES` does not activate production or local mock players. Any future fixture adapter must require **both** development mode and an explicit flag, emit `status=fixture` and `source=development`, and remain visually labeled.

The proxy allowlists paths and parameters, validates date/name/filter inputs, rejects duplicate parameters, prevents redirect following, bounds every request to four seconds, limits responses to 1 MiB, requires JSON, and reconstructs the public DTO using explicit field allowlists. It returns no raw upstream errors. Status observations older than two minutes and ranking snapshots older than 30 seconds fail closed. Proxy responses are not cached; the bridge shares a briefly cached snapshot across all ranking pages/filters. No proxy route accepts SQL, database names, arbitrary URLs, or writable operations.

Backend grant: SELECT on reviewed views/read-model tables only, no wildcard table access and no account secrets. Rate-limit the service and portal at the hosting edge before public traffic, enforce bounded pagination/query plans, and use a request ID plus sanitized outcome/latency logs. This implementation is the read adapter, not the production backend or an edge rate limiter.

## Envelope

```ts
type PortalEnvelope<T> = {
  status: "live" | "unavailable" | "disabled" | "fixture";
  data: T | null;
  asOf: string | null; // UTC ISO timestamp for the observation/read model
  message: string;
  source: "backend" | "none" | "development";
};
```

The backend must return `{status:"live", asOf:"...Z", data:...}` to be accepted. Other backend states fail closed; missing is never converted to zero. Portal HTTP status is 200 for validated live data, 503 for disabled/unavailable, and 400 for invalid requests. The UI handles the envelope and shows availability, rather than treating 503 as an empty leaderboard. Monetary values, EXP, telemetry counters, thresholds and scores use nonnegative **decimal strings**, maximum `9223372036854775807`, to preserve SQL BIGINT precision. Names are the server's 1–13 ASCII alphanumeric character names. Render all supplied text as text, never HTML.

## Endpoints

| GET endpoint | Query | Data type / source |
|---|---|---|
| `/api/status` | none | `StatusData`: online, playersOnline, version, exp/meso/drop rates; nullable unknowns; runtime observation |
| `/api/rankings` | sort=level/fame, job, class=demon-avenger/paladin, world, page, limit | `RankingsData`: entries, exact total, page, pageSize; scoped character view. class and job are mutually exclusive. |
| `/api/rankings/daily` | metric, date, limit | `TournamentData`; disabled until competitive engine/read model exists |
| `/api/rankings/weekly` | metric, weekStart, limit | `TournamentData`; disabled until weekly read model exists |
| `/api/characters/:name` | none | `CharacterData`: name, level, jobId/jobName, fame, world, nullable rank |
| `/api/achievements` | none | `AchievementsData`: catalogVersion/key, totalPoints, definitions |
| `/api/characters/:name/achievements` | none | `CharacterAchievementsData`: AP, version, progress, unlock time, recent unlocks |
| `/api/telemetry/:character` | metric, dimension, date | `TelemetryData`: zone, coverage, lifetime/daily counters and eligibility |
| `/api/free-market` | q, shopId, category, page, limit | `FreeMarketData`: NPC supply offers, prices, currency, nullable stock/rules |
| `/api/database/items` | q, category, page, limit | `DatabaseItemsData`: approved bounded item metadata |
| `/api/database/mobs` | q, boss=true/false, page, limit | `DatabaseMobsData`: approved bounded monster metadata |

Pagination maximum is 100 rows, page 1–10000; character and status endpoints do not accept arbitrary filters. Daily/weekly snapshots contain at most the top 100. Achievement definitions/progress are bounded at 1000 and recent unlocks at 20. Backend sorting/total must use the same filters as entries. Class display labels require a reviewed custom-job mapping, not an invented browser label.

Example unavailable response:

```json
{"status":"unavailable","data":null,"asOf":null,"message":"Live data is not available yet.","source":"none"}
```

## Inspected actual schema and eligibility

The authoritative source root was `C:/Users/Studio PC/Documents/ChatGPT/TrixterMS`. References below are repository-relative; later worktree paths are explicitly distinguished from the root. No DB query, migration, runtime start, or deployment was performed for this audit.

### Character rankings and status

- `server/sql/seperate/12-characters.sql:1–43`: `characters.id,accountid,world,name,level,exp,job,fame,gm,rank,rankMove,jobRank,jobRankMove`. `server/sql/seperate/1-accounts.sql:12–14`: `accounts.banned,gm`.
- The live-ranking lane supersedes the earlier proposal to adopt `RankingWorker` eligibility. That worker excludes Level 1 characters and skips unsupported job groups. Public rankings include every existing character row, with no minimum level, login, account or job-family predicate. Character deletion removes the row. No account join is needed. Default order is persisted `level DESC, exp DESC, id ASC`; the internal ID never crosses the bridge boundary. Fame sort is `fame DESC` followed by that same order.
- The bridge's source-authored `bridge/schema.sql` joins guild names and checks the exact DA quest marker through `EXISTS`; it never uses stored rank/jobRank. `bridge/src/jobs.mjs` is the presentation mapping; genuine carriers and marked custom classes remain distinct without modifying gameplay.
- Overall ranking rows include `rank,name,level,exp,jobId,jobName,fame,guildName,score` (`score=null`). EXP is a decimal string. The envelope `asOf` is the database query start time, conservatively measuring freshness. Pagination defaults to 50 with a maximum of 100; total/page/pageSize must agree with the returned contiguous ranks. Competition contracts remain separate.
- Creation commits its Level 1 row immediately. The source's periodic character autosave is every five minutes. The 10–30 second website freshness target starts after database commit; online progress can take the autosave interval to reach MariaDB. No save cadence, character creation, deletion or gameplay code is changed here.
- `server/src/handling/channel/ChannelServer.java:562`: runtime connected clients are available through player storage. `accounts.loggedin` is not a reliable live population measurement. Backend should sample the reviewed runtime, deduplicate transitions if needed, exclude staff if required, and publish observation time. Do not infer online state from database reachability.

### Telemetry

- `server/sql/migrations/20260819-trixter-telemetry-phase1.sql:60,74`: `trixter_telemetry_character_counters(character_id,metric_key,dimension_key,counter_value,updated_at)` and `trixter_telemetry_daily_counters(activity_date,character_id,metric_key,dimension_key,counter_value,updated_at)`. Counter values are BIGINT.
- `server/src/server/TrixterTelemetryService.java:41–79`: twelve implemented keys: `combat.mobs_killed`, `combat.bosses_killed`, `combat.unique_bosses_killed`, `combat.deaths`, `progress.exp_earned`, `economy.mesos_earned`, `economy.mesos_spent`, `economy.nx_earned`, `economy.nx_spent`, `items.cubes_found`, `items.cubes_spent`, `items.glasses_spent`.
- Sources are `monster`, `monster_drop`, `monster_kill`, `npc_shop`, `cash_shop`, `cube_shop`, `currency_exchange`, `npc_item_sale`, `quest`, `event`, `system`, `unclassified`. `all` already includes dimension contributions: never sum it together with the individual dimensions.
- Cube dimensions are `miracle`, `premium_miracle`, `super_miracle`; glasses `average`, `advanced`, `premium` (`TrixterTelemetryService.java:311–326`). Cube found is recorded after successful drop pickup; spent after committed transactions (`:217–244`).
- Character eligibility excludes staff `gmLevel>=1`; monster telemetry rejects fake/friendly monsters, mismatched maps, jail, nonpositive map IDs and configured exclusions (`:247–267`; `server/src/client/MapleCharacter.java:4289`). Death counters reject PvP/excluded maps but do not implement the future tournament's anti-farming proof.
- Actual telemetry timezone is configured `Europe/Amsterdam` (`server/worldGMS.properties:15`, service `:302`). Expose the configured value; the tournament design uses `Europe/Ljubljana`. Resolve configuration intentionally before production competitions.
- Event receipts expire and are not a permanent ledger (`...phase1.sql:119`). Current counters do not reconstruct invalidations, exact final-tied-score timestamps or eligible active playtime. Coverage of legacy economy flows is incomplete. Never certify economic standings using `all`, unclassified transactions, or a browser sum; approved source policy and backend audit are required. Telemetry display `coverage` does not grant competition readiness.

### Daily tournament and weekly proposal

`docs/ACHIEVEMENTS_AND_DAILY_TOURNAMENT_SPEC.md:3` is a future implementation specification. Requirements at `:101–111`: Ljubljana calendar day, one best character per account per metric, exclude staff/banned/test characters, deterministic tie by first time final score was reached then eligible playtime then character ID, idempotent finalization, startup catch-up and archived top 100.

Metric mapping:

| Spec key | Counter / dimension |
|---|---|
| MESO_EARNED / MESO_SPENT | economy.mesos_earned / economy.mesos_spent, approved source policy |
| NX_EARNED / NX_SPENT | economy.nx_earned / economy.nx_spent, approved source policy |
| CUBES_FOUND | items.cubes_found / all |
| MIRACLE_CUBES_SPENT | items.cubes_spent / miracle |
| PREMIUM_CUBES_SPENT | items.cubes_spent / premium_miracle |
| SUPER_CUBES_SPENT | items.cubes_spent / super_miracle |
| MOBS_KILLED | combat.mobs_killed / all |
| UNIQUE_BOSSES_SLAIN | combat.unique_bosses_killed, explicit eligible-boss registry still required |
| DEATHS_ACHIEVED | combat.deaths plus future anti-farming validation; existing counter insufficient |

No competitive finalization/winner/top-100 archive or weekly engine was found in inspected lanes. `local/worktrees/trix-telemetry-event-core/server/src/server/DailyAchievementService.java:17–30` is separate personal daily progress and claim-record plumbing for six event types. Its `trixter_daily_progress`, `trixter_daily_event_receipts`, `trixter_daily_claims` tables (`server/sql/migrations/20260912-daily-achievements-v1.sql`) are **not** tournament snapshots.

Proposed new read models (design only; no migration included):

- `public_competition_runs(period_kind,period_start,period_end,zone,metric_key,policy_version,status,source_watermark,finalized_at)` with an idempotent unique period/metric/policy key.
- `public_competition_snapshots(run_id,rank,character_id,score,score_reached_at,eligible_active_seconds)` with internal account deduplication and unique run/rank and run/character constraints. Projection joins only approved character fields. Keep deleted-character history policy explicit and names sanitized.
- Daily period is one Ljubljana date; proposed weekly period is Monday through Sunday in that zone, subject to owner/backend approval. Additive weekly metrics sum eligible daily values. Unique bosses require COUNT DISTINCT entity IDs across the weekly window, **never** a sum of daily distinct counts. Do not backfill unrecorded eligibility evidence.

`TournamentData` includes metric, date OR weekStart/weekEnd, zone, finalized, entries, total and nullable winner name. A provisional response must have winner=null. A finalized winner must match rank one. Existing counters alone do not justify `finalized=true`; the backend must have a durable run record. Daily/weekly feature flags remain off until engine, eligibility and read-model verification.

### Achievements: implemented versus proposed

`local/worktrees/public-beta-achievements-20260912/server/config/achievements-beta-v1.tsv:1–5` is the implemented staged catalog: version **2**, key `trixter-beta-v1`, **40 definitions**, **2160 AP**. Columns are `key,category,name,description,event_key,dimension,aggregation,threshold,points,reward_key,display_order,enabled`. Categories: LEVELING, COMBAT, BOSSES, COLLECTION, EXPLORATION, ECONOMY, SOCIAL, SPECIAL.

Its `server/sql/migrations/20260910-trixter-achievements-medal-v1.sql:24` defines `trixter_character_achievement_progress(character_id,catalog_version,event_key,dimension_key,aggregation,current_value,updated_at)`. Unlocks in `trixter_character_achievement_unlocks` retain `unlocked_at` and add `points_awarded,reward_key,unlock_event_id` (`:69`). Catalog metadata carries count, AP total and fingerprint; read adapters must reject catalog mismatches. AP comes from persisted validated unlock points, not a browser guess. Join progress by event/dimension/aggregation and catalog version. Recent unlocks order by `unlocked_at` with a stable key tie break.

Feature defaults disabled (`.../server/worldGMS.properties:16`). Source code does not prove migrated/enabled beta runtime. The 500-achievement catalog version 1 is a draft reservation; the broad 22-family specification is future scope. Medal tiers are target configuration, `item_ready=false`; do not advertise delivery/stats as implemented. See `.../docs/TRIXTER_ACHIEVEMENTS_MEDAL_V1.md:15–34,138–140,161–174`.

An owned TSV catalog export may be presented as a labeled catalog preview. Actual character progress/AP/recent unlocks require the backend reader and verified migration/activation. Do not invent historical unlocks or owner acceptance.

The reader rejects duplicate definition/progress/recent-unlock keys, zero thresholds/AP definitions, totals that differ from enabled catalog AP, character AP above the catalog total, and character AP that differs from its unlocked rows. A locked row must have zero awarded AP and progress below its threshold; an unlocked row must have reached its threshold and have positive AP. Each recent unlock must match an unlocked progress row, including its awarded AP and timestamp. The current monotonic, transactional server engine supports these invariants; any future reversal semantics need an explicit contract revision.

`readCharacterAchievementsVerified(name)` reads both the live catalog and the character achievement response, requires matching catalog version/available points, and checks every character key, threshold and awarded points against an enabled definition. Both the public character-achievement API and character page use this helper. Missing/mismatched catalogs leave character achievements unavailable. The helper adds optional `compatibleDefinitions` containing only validated definitions from that same live catalog; profile names come from these definitions, never from an unrelated staged catalog. The backend cannot inject that derived field because raw response validation discards it.

### FM and game database

Actual tables: `shops(shopid,npcid)` (`server/sql/seperate/77-shops.sql:1`) and `shopitems(shopitemid,shopid,itemid,price,position,reqitem,reqitemq,rank,buyable,category,minLevel,expiration)` (`75-shopitems.sql:4`). Positive price with reqitem=0 is mesos; reqitem>0 uses required item currency/reqitemq (`server/src/server/MapleShop.java:132,170`). There is no general stock column; stock stays null unless a reviewed source supplies it. `buyable` must not be relabeled as stock.

Reviewed staged FM lane `local/worktrees/public-beta-fm-services-20260912/docs/PUBLIC_BETA_FM_CANARY.md:5–22` supplies native Legend Shop NPC 9201159, shops 930600–930607, 29 items in eight categories. Exact labels reside in `.../server/scripts/npc/9201159.js:7–11`. These are NPC supplies, not player merchant listings. Backend must query scoped deployed rows so preserved live prices/overrides remain authoritative. No live deployment was verified here.

`wz_itemdata(itemid,name,msg,desc,slotMax,price,wholePrice,...)` exists (`server/sql/seperate/88-wzItemdata.sql:1`); equipment stats use `wz_itemequipdata(id,itemid,itemLevel,key,value)` (`89-wzItemequipdata.sql:3`). Monster metadata is loaded from local Mob.wz and String.wz (`server/src/server/life/MapleLifeFactory.java:47–49`), not a general monster SQL table.

Do not bulk publish WZ binaries, extracted proprietary metadata or assets into website Git. Implement only a reviewed bounded public metadata export with current source/build provenance; keep unavailable categories explicit. Existing static SQL is not proof of current customized stats. Maps, skills, bosses and equipment search can be offered as planned categories without inventing an active data feed.

## Next backend milestone

Implement an authenticated/private, SELECT-only status/character/rankings adapter on the verified beta host; validate safe projections and freshness against the actual schema/runtime. Then wire catalog version 2 + character achievements, approved telemetry, and scoped NPC shops. Daily and weekly remain independent milestones requiring their finalization/read-model work. Enable each portal flag only after the corresponding response and eligibility checks pass. Hostinger/static-only hosting needs a Node-capable deployment or an explicitly reviewed external API/static frontend adaptation.
