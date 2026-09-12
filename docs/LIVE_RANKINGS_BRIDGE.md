# Live character rankings and public telemetry bridge

**RC1 update:** [Rankings and Telemetry RC1](WEBSITE_TELEMETRY_RC1.md) supersedes this checkpoint's earlier cache, API and activation details. Use its endpoint table and the current [bridge runbook](../bridge/README.md); this document preserves the original implementation provenance.

This implementation extends the current Website V2 Next.js portal without changing its art, layout system, game runtime or gameplay. The implementation checkout is `local/web-portal-beta-v1` inside the authoritative Documents TrixterMS workspace. Publication repository: `trixtergod3-bot/TrixterMS-website`; lane branch: `codex/live-rankings-telemetry-01a097bc`. The preserved starting revision is `0b291cbd878a026e77210b8a044c96cfd2e7c044` on `codex/website-final-beta-visual-pass`. Main was observed at `81856c608dab33346f8f915dcd5219c893f09e01` and is not changed by this lane.

## Architecture

```text
Authoritative game MariaDB (loopback only)
  -> column-restricted SQL SECURITY DEFINER view
  -> standalone Node bridge / SELECT-only view reader
  -> authenticated HTTPS reverse proxy
  -> Next.js server-side public-data validator/proxy
  -> same-origin GET /api/rankings
  -> existing Rankings UI, polling every 20 seconds
```

The standalone service lives in `bridge/` with its own dependency lockfile. The website does not import its MariaDB connector. It uses the existing server-only environment configuration, adding `TRIXTER_READ_API_TOKEN` alongside `TRIXTER_READ_API_URL`. Only the trusted Next.js server holds that service token. The bridge requires its own protected local environment file; never reuse the game's database/root account.

## Authoritative source and eligibility

The read model uses these source-defined fields only:

| Table | Fields and purpose |
| --- | --- |
| `characters` | `id` stable internal tie-breaker; `world` internal filter; `name`, `level`, `exp`, `job`, `fame`; `guildid` joins guild metadata |
| `guilds` | `guildid`, `name`; LEFT JOIN preserves unguilded characters |
| `queststatus` | `characterid`, `quest`, `status`, `customData`; exact custom-class marker check inside the view |

Sources are `server/sql/seperate/12-characters.sql`, the guild and queststatus DDL, `server/src/client/MapleCharacter.java`, `MapleClient.java`, `MapleCharacterUtil.java`, and `server/src/server/TrixterDemonAvenger.java` in the authoritative game checkout. Existing guild and character primary keys and queststatus character index support the joins. `bridge/schema.sql` is authored view source, not a database dump.

Character creation inserts and commits Level 1 immediately. Deletion physically removes the character row; there is no source-defined soft-delete or active flag. Eligibility is row existence, including offline characters. The bridge adds no minimum level, job-family, staff, account or logged-in filter. It does not use `RankingWorker`, whose Level 30 threshold and incomplete job grouping violate this request. It does not inspect account ownership or banned-account fields.

Normal names are ASCII alphanumeric; privileged in-game creation can also produce other bounded names. Rankings safely render printable display text without HTML, and only link a name to a profile when the existing profile route supports it. Invalid rows fail the snapshot visibly instead of silently omitting characters.

## API and class mapping

`GET /api/rankings?page=1&limit=50` is the existing public convention. Optional filters: `sort=level|fame`, numeric `job`, numeric `world`, or `class=demon-avenger|paladin`. The class identity filter and raw job filter are mutually exclusive. Page maximum is 10,000; limit maximum is 100. Total and ranks use the same filtered snapshot. Out-of-range pages return an empty page with the actual total.

The validated envelope contains `status`, `asOf`, `data`, `message`, `source`. Data contains `entries`, `total`, `page`, `pageSize`. Each row contains only:

```text
rank, name, level, exp, jobId, jobName, fame, guildName, score
```

EXP is an exact decimal string, never a JavaScript numeric BIGINT approximation. `score` remains null for compatibility with the portal's separate competition table. Internal character IDs, world, marker data and account ownership do not appear in public rows. Account usernames, hashes, emails, PIC/PIN, IP/HWID, sessions and credentials are never selected.

Default sort is `level DESC, exp DESC, internal id ASC`. Fame sort prefixes `fame DESC` to that ordering. The source value is current persisted EXP, not lifetime telemetry EXP or the old stored rank. `asOf` records the database query start time, conservatively measuring snapshot age.

`bridge/src/jobs.mjs` keeps presentation mapping independent of gameplay. Explorers, Cygnus, Resistance, Aran, Evan, Mercedes and normal Demon Slayer retain their source job labels. Unknown valid numeric jobs remain eligible with an explicit unknown-job label. Demon Avenger requires BOTH a carrier job in `100,120,121,122` and an existing queststatus row with `quest=999132900`, `status=0`, and binary exact `customData=TRIXTER_DA_WARRIOR_CARRIER_V1`. An unmarked 122 remains Paladin. `EXISTS` avoids duplicate ranking rows from duplicate quest records. UI numeric class filters explicitly identify advancement stages; the DA identity filter covers all its marked carrier stages.

## Security and performance

The bridge and database accept loopback configuration only. Public access requires authenticated HTTPS routing to the bridge, never a MariaDB port forward. The reader account has SELECT on one reviewed view; the locked definer account has only the source-column grants needed by that view. Provisioning, grant verification and rollback are described in [the bridge runbook](../bridge/README.md). The schema is not applied automatically. No database credentials are copied into this website.

The bridge checks a strong bearer token before reading data and accepts only its GET ranking route. It rejects bodies, unknown/duplicate parameters and unsupported filters. Response projections, request/header/connection bounds, query timeouts, generic error messages and no permissive CORS keep the boundary small. Put request-rate limits at the HTTPS proxy and hosting edge before activation; socket limits alone are not an edge traffic policy.

One fixed parameterized query loads at most the configured snapshot cap plus one, with a guild join and indexed per-character marker lookup. One connection is allowed; the SQL query timeout is two seconds. No query runs per character or per page. A single in-flight refresh and shared 10-second cache bound database load to at most roughly six snapshots per minute per bridge instance under continuous traffic; no traffic means no query. Failures back off, never turn the old snapshot into a newly live result. A 50,000-row default and memory cap fail closed if exceeded. Filter/sort/page operations run over that shared bounded in-memory snapshot.

A complete snapshot deliberately reads the public projection once per refresh. This is not proof that a full snapshot is cheap on the live database. Inspect actual cardinality, EXPLAIN and measured latency before activation; if the dataset exceeds the bounded beta strategy, move to an indexed incremental read model. Do not add indexes blindly. The source has no ranking composite index, but this implementation sorts its shared snapshot in memory and does not issue repeated browser-driven database sorts. The optional validator reports aggregate counts, consistency and query-plan metadata without names or identifiers.

The browser polls every 20 seconds with no full-page reload and keeps the last successful rows during transient failures, visibly labeling them as the last update. New pages/filter changes receive a fresh component state. Loading, empty, unavailable, retry, timestamp, total, pagination, responsive guild/level/class rows and special-name behavior are covered by browser QA.

**Freshness limitation:** the game source registers character autosave every five minutes (`server/src/server/Start.java:215`). New creation is committed immediately, but online level/EXP can remain only in memory until a save. The nominal 10–30-second target is after database persistence. Logout/channel transitions can persist progress sooner. This lane does not alter saving, DA/DS gameplay, WZ, portals or client login. A stricter live-progress SLA requires an explicitly scoped runtime signal or persistence change.

## Activation and real verification

Read-only checks during this lane observed `https://trixterms.com/rankings` returning HTTP 200 with Next.js content and `/api/rankings` returning HTTP 503. The current source is therefore prepared against a disconnected ranking feed; that observation does not establish the hosting deployment revision. Hostinger is the documented managed Node target, but no authenticated hosting settings were available in this task.

The supplied operational instructions name `trixterms-beta-host` as authoritative. Its administration ports 22/5985 and login port 8484 were unreachable from this desktop. A separate dated handoff says a SINGLE_PC runtime superseded it, creating an authority conflict that must be resolved before selecting a database. Elevated read-only inspection on this desktop found no Java/MariaDB process or database listener. This lane did not start, stop, migrate or deploy either game runtime, and did not substitute a local fixture database for the live authority.

To activate the prepared code:

1. Confirm the authoritative host and actual runtime/database paths in a session with host access. Inspect database schema, indexes, grants, cardinality and backup state there.
2. Follow `bridge/README.md` to provision the isolated view/reader with protected generated secrets, install its locked dependency, run the sanitized database validator and inspect the plan/latency. Apply no gameplay migration.
3. Run one supervised loopback bridge instance and configure authenticated HTTPS plus rate limits. Verify port 3306 remains loopback-only. Configure the website's server-only bridge URL/token; deploy this reviewed lane through the existing hosting process while preserving `/beta` routing.
4. Prove the real browser → portal → bridge → authoritative DB path, then perform owner QA below. Do not mark VERIFIED from a build, mock response, readme, local HTTP fixture or source push.

Shortest owner QA after activation:

1. Open `https://trixterms.com/rankings` with All classes; note the total.
2. Use the normal native account/password game screen and create a uniquely named character. Wait up to 30 seconds after creation; total should increase and the Level 1 character should be present on its ranking page.
3. Gain levels/EXP. Allow the game save (up to the current five-minute autosave interval, or log out to persist), then allow up to 30 seconds for the website. Confirm level and rank move, and the character stays listed after logout.
4. Inspect the browser's `/api/rankings` response: only the documented public fields. Approve the result explicitly if all checks pass; credentials must never enter launchers, task text or logs.

## Extension points

Rankings is the only bridge resource enabled in this checkpoint. `database.mjs` owns the read source, `rankings.mjs` owns projection/cache/order, `http.mjs` owns authenticated routing, and portal contracts own browser projection. Future resources should add separate bounded contracts and sources:

| Future resource | Appropriate source |
| --- | --- |
| Status and population | A timestamped runtime observation; never infer online from MariaDB reachability or accounts.loggedin |
| Character class/level distribution | Aggregate the existing safe character snapshot |
| Guild standings/member counts | Reviewed public guild projection and character relationships |
| Character profiles | Safe lookup of an approved character projection, no internal identifier exposure |
| Boss/activity telemetry | Existing source counters with explicit coverage and eligibility; no extra collection by default |

Recommended next feature: **class and level distributions**, derived from the same snapshot with no additional database reads. Runtime online count can follow once a trustworthy, timestamped runtime signal is available.

Final tested revisions, evidence gates and owned-file inventory are recorded in this lane's `docs/coordination/chats/live-rankings-01a097bc` handoff. Owner acceptance and deployment remain independent from implementation and automated tests.
