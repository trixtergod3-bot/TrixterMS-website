# Add live rankings telemetry bridge

Status: **BLOCKED** — 2026-10-27. Current source/preview is ready; public rankings are not connected to the authoritative Linux DB. This resumes the same lane and supersedes its September host-access assumptions.

- Website candidate: `codex/live-rankings-activation-01a097bc`, work checkpoint `b25d175bb8e92248e387440ef33dd140daadb073` (remote verified).
- Worktree: `C:\Users\Studio PC\Documents\ChatGPT\TrixterMS\local\live-rankings-activation-01a097bc`.
- Baseline: `a4625be080622068b59c04ab6f0298e61621c0bf` from the newer website checkout. Older cold-storage `web-portal-beta-v1` is not the deployment source. Separate polish/Astral candidates remain owned by their existing lanes.

## IMPLEMENTED

Reused the current ranking UI, class filters, nine ordering modes, RC1 bridge and release-feed reader unchanged. Added the missing `TRIXTER_RELEASE_METADATA_URL` example and [current activation instructions](../../LIVE_RANKINGS_ACTIVATION.md). No duplicate framework or telemetry store.

Architecture remains game MariaDB → restricted `trixter_public_rankings_v2` → loopback SELECT-only bridge → authenticated HTTPS → website server → public browser API. Browser polling requires no rebuild when committed character data changes.

The existing view reads character `id/world/name/level/exp/job/fame/guildid/accountid/gm/meso`; guild `guildid/name`; account eligibility flags and approved NX balances; the exact DA marker in `queststatus`; and the existing five lifetime counter joins in `trixter_telemetry_character_counters`. IDs and ownership stay internal. No password, account name, email, device, network, session or token fields enter public responses. Dedicated reader privileges and base-table access denial are checked at bridge startup/validation; no such Linux validation is claimed yet.

`/api/public/rankings`, `/api/public/characters`, `/api/public/stats` and `/api/public/telemetry` share the existing short snapshot cache; `/api/rankings` remains compatible. Ranking entries expose only rank, name, level, decimal EXP, job ID/name, fame, nullable guild name and the selected public score. Level one is eligible; staff/banned accounts are excluded. Default order is level, exact EXP, stable internal ID. Marker-aware DA remains distinct from genuine Paladin and native Demon Slayer; unfamiliar jobs remain eligible. Gameplay is unchanged.

One bounded database snapshot is shared across consumers at a ten-second refresh, with one connection, bounded query time, outage backoff and explicitly stale responses. Browser updates target 10–30 seconds after the DB commits. Runtime online/population fields stay unknown without the separately reviewed aggregate producer. See [bridge runbook](../../../bridge/README.md) for exact SQL/grants and query-plan checks.

## TESTED

On Node 24.19.0 / npm 11.17.0: **34/34 focused website tests**, **40/40 bridge tests**, production build including TypeScript, and one production preview smoke passed. At 390px, rankings and download pages had no horizontal overflow and no page errors. The disconnected ranking API returned 503/null with no invented rows; the download page rendered both exact current official links and native-login instructions. Preview port 4349 was closed after testing.

Local evidence: `local/qa/activation-20261027/preview-smoke.json`, `rankings-unavailable.png`, `download-live-metadata.png`. Independent narrow review corrected the documented loopback development mode; diff/JSON checks passed. These are local/fixture tests, not current Linux end-to-end verification.

## VERIFIED

Live `/download` returns 200 and both links match official sequence **18**, release `v111.1-beta.1-boss-rush-stability.1`. Metadata matches the raw manifest SHA-256 `5E14CAA6B9747684C69575522A239A11E740453B3D335625D62F3E501E8A96CF`; both archive HEAD requests return 200 with matching lengths (68,698,039 and 3,377,572,211 bytes) and byte-range support. Archive bodies/signature/native gameplay were not reverified. The working feed is the existing floralwhite Hostinger origin; `patch.trixterms.com` still fails HTTPS.

Public `/rankings` returns 200, but `/api/rankings` and `/api/status` return 503; `/api/public/rankings` returns 400. Live rankings integration: **not verified**. Owner acceptance: **not given**. Source publication is not hosting deployment.

## FILES

This checkpoint changes `.env.example`, `docs/LIVE_RANKINGS_ACTIVATION.md`, and this lane's JSON/Markdown handoff only. No game/runtime/client/database/hosting settings or public release metadata changed. The existing official download links are preserved; pending private QA/inactive archives are not linked.

## BLOCKERS

Saved SSH now reaches `trixter-server`; initial inspection saw game/MariaDB active and DB listening on loopback. No Node/npm was found on PATH or bridge listener on 4316. Retry found neither checked bridge service installed. The fixed database metadata probe stopped at `sudo: interactive authentication is required`; view/reader existence and current query cost remain unknown. No password or alternate privileged credentials were requested or read.

Hostinger navigation and native login-window inspection timed out. The correct app's deployed SHA/environment/HTTPS route remain inaccessible in this session. No DNS, tunnel, firewall or hosting changes were attempted. The Linux release owner remains the sole game/runtime/DB writer; public client promotion still follows its final gameplay gate.

## NEXT

Existing Linux owner `01a0e9ab-6a93-7a92-ae75-b000dea2b11a` uses its privileged session to validate/provision the reviewed read boundary, compatible Node and one authenticated HTTPS bridge. Hosting owner then connects a preview from the reviewed integrated website source, preserving newer lane changes and `/beta`. This lane can then prove real current DB → browser data.

After activation, owner QA is: open `/rankings`, note total, manually sign in to the game and create a unique Level 1 character; wait up to 30 seconds after commit; gain EXP/levels, save/log out and confirm the changed standing and persistence. Check the public field allowlist. Do not mark VERIFIED or ACCEPTED before those actual observations. Next telemetry activation can be online count by channel through the existing aggregate contract.
