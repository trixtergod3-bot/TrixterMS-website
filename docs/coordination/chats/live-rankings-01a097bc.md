# Add live rankings telemetry bridge

Status: **BLOCKED on live activation and authoritative integration**. IMPLEMENTED=true; TESTED=true for the named local checks; VERIFIED=false; OWNER ACCEPTED=false; DEPLOYED=false.

The current Website V2 portal now has an executable standalone public read bridge and live polling ranking UI. The live public endpoint still returned HTTP 503 during read-only inspection. No real database character or native character-creation test was observed. This is a functioning, tested implementation checkpoint, not a completed live deployment.

## Checkpoint and scope

- Repository: `trixtergod3-bot/TrixterMS-website`.
- Source branch: `codex/live-rankings-telemetry-01a097bc`.
- Verified remote source checkpoint: `11ea103fb7249a227bb82f70b0ff0c277e2562a5`.
- Actual development checkout: `C:/Users/Studio PC/Documents/ChatGPT/TrixterMS/local/web-portal-beta-v1`.
- Preserved base: `0b291cbd878a026e77210b8a044c96cfd2e7c044`, the final visual candidate. Website main was not modified.
- The parent Documents game checkout remains on its existing branch with other lanes' dirty work preserved. No gameplay, DA/DS behavior, WZ, portals, launcher, client or runtime was changed.
- This handoff is a separate commit after the source checkpoint; obtain its revision from Git history rather than embedding a self-referential SHA.

## Delivered behavior

`Game MariaDB -> restricted SQL view -> SELECT-only loopback Node bridge -> authenticated HTTPS -> Next.js server proxy -> browser /api/rankings`.

The source-authored view uses `characters.id/world/name/level/exp/job/fame/guildid`, `guilds.guildid/name`, and `queststatus.characterid/quest/status/customData` for a binary-exact DA marker existence check. Account tables are not ranking data sources. Character IDs, world and marker values remain internal. Every existing non-deleted row is eligible, including Level 1 and offline characters, without the old Level 30 filter or job-family omissions.

Public rows: `rank,name,level,exp,jobId,jobName,fame,guildName,score`; EXP is an exact decimal string and score is null. Envelope includes timestamp, total, page and pageSize. Default sort is level DESC, EXP DESC, internal ID ASC; fame is an optional alternate. Pagination defaults to 50 and is bounded to 100 rows. Custom DA requires marked carrier job 100/120/121/122 plus exact quest 999132900/status 0/marker text; genuine 122 remains Paladin and native Demon Slayer remains Demon Slayer. Mapping is presentation-only and unknown jobs remain eligible.

One 10-second shared snapshot, one in-flight refresh, one DB connection, a bounded query, cache/memory caps and failure backoff limit browser-driven load. No per-row SQL, manual ranking JSON, per-character build or redeploy is involved. Actual DB query plans/latency remain unverified. The standalone reader validates narrow grants at startup and rejects base-table reads. Secrets use protected server environment configuration; browser/private field projection and bundle scanning are enforced. No port 3306 exposure or database mutation was performed.

The existing page retains its approved design, adds guild/fame display, 20-second automatic polling, 50-row pagination, update age, loading/empty/unavailable states, stale-row retention during failed refresh and mobile layout down to 320px. Special legal staff display names remain text without unsupported profile links.

**Persistence caveat:** game source autosaves online characters every five minutes. New character creation commits immediately. The 10–30-second freshness target is after DB commit; in-memory progress can wait for normal save/logout. No runtime persistence change was made.

Full architecture, contracts, source rationale, provisioning, performance limits and owner procedure: [LIVE_RANKINGS_BRIDGE.md](../../LIVE_RANKINGS_BRIDGE.md). Dedicated service installation/privilege checks: [bridge README](../../../bridge/README.md).

## Executed checks

| Check | Result |
| --- | --- |
| Production build | PASS, all existing routes compiled |
| Typecheck and lint | PASS |
| Website unit/security/HTTP integration | 50/50 PASS |
| Bridge fake-source/auth/cache/grant/projection tests | 21/21 PASS |
| Specialized ranking browser tests | Eight behavior groups, 11 intercepted requests, zero page errors |
| Full browser regression | 120 route/viewport checks, 26 internal links, 10 interactions, zero errors or unexpected console errors; six expected unavailable-ranking resource responses |
| Source/generated browser security scan | 119 text files, 55 browser bundles, zero findings at source checkpoint |
| Bridge locked dependency audit | mariadb 3.5.4; zero reported vulnerabilities |
| Source publication | Remote branch resolves exact named source SHA |
| Real authoritative DB values/guilds/index plan/load | NOT RUN; host access blocked |
| Real creation/progress/logout website test | NOT RUN; no live integration established |
| Owner acceptance / deployment | NOT CLAIMED |

Fixture tests exercise real loopback HTTP between bridge and portal adapter and browser response interception. They never substitute for real game DB verification. Temporary API failure retains existing UI rows with stale labeling; it does not fabricate live data.

## Blocker and next action

Read-only HTTP probes saw `https://trixterms.com/rankings` return 200 with Next.js HTML and `/api/rankings` return 503. Hosting is documented as managed Node on Hostinger; this task had no authenticated hosting environment configuration. The instructed authoritative `trixterms-beta-host` was unreachable on 22/5985/8484. A historical SINGLE_PC handoff conflicts with current instructions; current host authority must be confirmed before selecting a DB. Elevated read-only local process/listener inspection found no Java/MariaDB runtime. No substitute server was started.

Next action: confirm the authoritative host and provide an accessible session there; follow the reviewed bridge runbook to inspect/back up/provision the view and reader, validate grants/EXPLAIN/latency and DB isolation, configure one supervised loopback service with authenticated HTTPS and edge rate limits, then configure/deploy the website through its existing Node hosting process while preserving `/beta`. Supply secrets only through protected environment configuration, never task text. No implementation merge into main or deployment is implied by publication.

Owner QA **after activation**: open All classes rankings and note total; use native ID/password login to create a unique character; wait up to 30 seconds for its Level 1 row and total increase. Gain levels/EXP, allow the game save (up to five minutes or logout), then the website poll. Confirm progress/rank and persistence after logout; inspect the API's public field allowlist. Only the owner may accept this result.

Next telemetry feature recommended: class and level distributions from the same safe snapshot, adding no DB reads. Runtime online count/channel population require a trustworthy timestamped runtime aggregate.

## Collision controls and local evidence

The concurrent DA/DS separation and Henesys portal lane is read-only input; no files in its gameplay scope were edited. Revisit only the presentation marker view if that lane intentionally changes identity. Source lives entirely in the website repository. The authoritative local registry record is owned by chat 01a097bc-a872-7e23-a986-467c79bff2bf; other records are preserved. A separate sparse game-repository checkout handles directory discovery so no unrelated dirty game history is published.

No game data, proprietary binaries, accounts, credentials, dumps or sensitive logs are in this checkpoint. Screenshots, generated build output, dependency caches and local QA receipts stay ignored. Receipt paths are relative to the website checkout:
- Specialized receipt: local/qa/live-rankings/report.json; SHA-256 E1386DB35ECEFD4345BFB312C1BFB5786DF0845226A92A1F155835316B0487DF.
- Broad receipt: local/qa/browser-report.json; SHA-256 3EF4B64A6EC6D7EB8F78E1314E8207CE5CAEC4C2442BE7CD15E02D17A72057A7.
- Visual evidence: local/qa/live-rankings/desktop-table.png and mobile-320.png / mobile-390.png (synthetic browser fixtures only).

## Exact owned source files

Paths below are relative to the exact website checkout above (and to the dedicated website repository):

- `.env.example`
- `.gitignore`
- `app/rankings/loading.tsx`
- `app/rankings/page.tsx`
- `bridge/.gitignore`
- `bridge/README.md`
- `bridge/package-lock.json`
- `bridge/package.json`
- `bridge/schema.sql`
- `bridge/src/config.mjs`
- `bridge/src/database.mjs`
- `bridge/src/http.mjs`
- `bridge/src/jobs.mjs`
- `bridge/src/main.mjs`
- `bridge/src/privileges.mjs`
- `bridge/src/rankings.mjs`
- `bridge/src/validate-database.mjs`
- `bridge/tests/bridge.test.mjs`
- `components/portal/live-rankings.module.css`
- `components/portal/live-rankings.tsx`
- `components/portal/ranking-table.tsx`
- `docs/BETA_PORTAL_REPORT.md`
- `docs/LIVE_RANKINGS_BRIDGE.md`
- `docs/TRIXTERMS_PUBLIC_API.md`
- `lib/portal/contracts.ts`
- `lib/portal/data.ts`
- `tests/live-rankings-contract.test.ts`
- `tests/live-rankings-integration.test.ts`
- `tests/portal-data.test.ts`
- `tools/check-security.mjs`
- `tools/verify-browser.mjs`
- `tools/verify-live-rankings.mjs`

Coordination additions: docs/coordination/chats/live-rankings-01a097bc.md and .json, plus the game repository's directory locator only.
