# Live rankings activation checkpoint — 2026-10-29

The existing bridge and website are the implementation. This checkpoint reuses website baseline `a4625be080622068b59c04ab6f0298e61621c0bf`, including the nine ranking modes, class-line filters, RC1 routes and official download-feed reader. It does not replace the separately owned website polish or Astral candidates. No game runtime, database, client, hosting setting or public release feed was changed.

## Current integration and gate

Authenticated Hostinger inspection on October 29 observed current deployment `17a1dbd9cceed196cf5ad0d873fd127e643ae025` on `codex/direct-registration-20261028`. Its environment lists registration/download settings but no `TRIXTER_READ_API_URL` or `TRIXTER_READ_API_TOKEN`. This is now an observed hosting baseline; the earlier access blocker is superseded. No environment values were copied into evidence and no hosting setting changed.

That exact deployed commit is an ancestor of integration commit `8b12cad78ce629593a2b75a67693a46e6e0845c9` on this existing lane. Registration page, registration proxy configuration and the newer full-client download text/tests are preserved. Do not deploy the older standalone checkpoint `6af8f23` over the current application.

Source reconciliation: older checkout `cd0aa7c` and RC1 `9caa937` use the already unfiltered nine-column `trixter_public_characters_v1`. The current V2 candidate uses `trixter_public_rankings_v2` with additional approved ranking metrics and previously excluded staff/banned accounts. The owner's October 29 request explicitly requires all created characters, including admin/GM. The V2 source now removes those eligibility filters and unused staff/ban column grants; it is driven by existing characters with left enrichment joins. No account without a character creates an entry. Keep each bridge adapter, schema and column/grant validator together; a V1 view cannot satisfy a V2 adapter.

The integrated candidate passed 40 bridge tests, 36 affected website tests, a production build including TypeScript, and the security scan (175 source files, 57 browser bundles, zero findings). Pagination/order, Level 1, public projection, authenticated loopback HTTP, transient outages and download rendering were covered with synthetic/local sources. Existing native/browser evidence for unchanged code is reused; no optional preview or gameplay audit was repeated.

Linux owner observations identify current `/opt/trixterms/releases/trix-20261029-ordinary-filter-r5`, with MariaDB on loopback and no activated rankings bridge/view/reader. This lane's fixed schema-metadata-only check stopped at `sudo: interactive authentication is required`; it read no player/account rows. No Node command was found on PATH. An existing administrator session must complete the protected schema/reader/service/HTTPS checks before the Hostinger app is changed. No real Linux-to-browser rankings verification is claimed.

## Retained October 27 observations

| Surface | Observed result |
| --- | --- |
| `https://trixterms.com/download` | HTTP 200; both displayed download links exactly match the current official metadata |
| Official metadata and manifest | Sequence 18, `v111.1-beta.1-boss-rush-stability.1`; raw manifest SHA-256 matches metadata |
| Launcher / full-client archive URLs | HEAD 200; lengths 68,698,039 / 3,377,572,211 bytes match metadata; byte ranges supported |
| `https://trixterms.com/rankings` | HTTP 200 |
| `/api/rankings?limit=1` and `/api/status` | HTTP 503, unavailable, null data |
| `/api/public/rankings?limit=1` | HTTP 400; the newer route is not proven deployed |
| `https://patch.trixterms.com/beta/releases/current.json` | TLS request failed; do not select this origin until HTTPS works |
| Linux host through saved `trixter-beta` SSH | Initial check succeeded: `trixter-server`, game and MariaDB active, MariaDB listening on loopback; no Node/npm on the command path or listener on 4316 |
| Follow-up Linux schema/service metadata check | Retry reached the host: neither `trixterms-public-telemetry` nor `trixter-public-telemetry` service was installed; fixed database metadata check stopped at `sudo: interactive authentication is required`. View/reader existence was not determined |
| Hostinger access | Browser navigation timed out; native login-window inspection approval timed out. App settings and deployed SHA remain unobserved |

These checks establish download-link availability and metadata consistency only. Archive bodies were not re-downloaded or re-hashed, and signature authentication and native gameplay were not repeated. Public rankings integration and owner acceptance remain unverified. Historical September Windows DB receipts are not evidence of the Linux DB boundary.

## Exact website settings

Use the existing hosting environment manager, server side only:

```dotenv
TRIXTER_SITE_URL=https://trixterms.com
TRIXTER_PUBLIC_LAUNCH=false
TRIXTER_RELEASE_METADATA_URL=https://floralwhite-stinkbug-872547.hostingersite.com/beta/releases/current.json
TRIXTER_RELEASE_DOWNLOADS_JSON=
TRIXTER_READ_API_URL=
TRIXTER_READ_API_TOKEN=
```

Keep the last two values empty until the authenticated HTTPS bridge has been verified. Fill them through protected environment settings, never chat, source, browser code or `NEXT_PUBLIC_*`. The URL is the bridge base origin, without `/api/public/rankings`. An HTTP loopback bridge is accepted only in explicit local development mode (`NODE_ENV=development`).

`TRIXTER_RELEASE_METADATA_URL` already exists in `lib/portal/release-downloads.ts`; this checkpoint adds its missing example setting. With it configured, requests fetch the approved feed, check the manifest hash and release/sequence agreement, and fail closed on mismatch or outage. The static JSON setting is used only when no metadata URL is configured. This setting reads the current release; it does not promote a release. Do not substitute private QA or inactive candidate archives.

## Activation owned by the existing Linux and hosting lanes

1. Linux release owner `01a0e9ab-6a93-7a92-ae75-b000dea2b11a` confirms the current host/schema and immediate dependencies from [the bridge runbook](../bridge/README.md). Stage/provision only its reviewed `trixter_public_rankings_v2` view and dedicated SELECT-only reader, preserving player data and existing telemetry. Inspect the current view before applying `schema.sql`; it deliberately fails if the name exists. No schema/view/account state was inferred from the failed probe.
2. Supply a compatible Node runtime (`>=22.13.0 <25`), protected bridge environment, and one supervised service. Run `npm run validate:database` in `bridge/`, inspect sanitized query/privilege evidence, and prove authenticated loopback responses. The existing supervisor must be the only bridge instance. No game restart is required by the bridge.
3. Route the four existing `/api/public/*` endpoints through authenticated HTTPS with the documented request limits. Keep MariaDB and port 4316 private, retain certificate validation, and omit sensitive request logging. Use the existing authorized network arrangement; no tunnel, DNS, firewall or game-network changes are part of this checkpoint.
4. In the actual Hostinger Node application, observe its current Git SHA, environment and patch-route isolation. Select the reviewed integrated website release, configure the bridge URL/token, and test a preview before replacing the public app. Preserve newer website lane work and the separate `/beta` release infrastructure. A branch push alone is not hosting deployment evidence.
5. Prove browser → website → bridge → current authoritative DB with real safe rows, matching level/job/guild values, pagination, outage recovery and bounded query load. Keep runtime population/status unknown until its separately reviewed aggregate producer exists.

The current official client release remains sequence 18. The pending Linux/game package and its owner-acceptance gate are owned by the release lane; this website checkpoint neither activates nor links that package.

## Owner acceptance after activation

Open `https://trixterms.com/rankings`, note the total, then manually sign in through the native game login and create a uniquely named character. Within 10–30 seconds after the creation transaction commits, confirm the Level 1 character appears. Gain EXP/levels, allow the server to save (or log out), then confirm the changed standing and logout persistence. Check only the public response fields; no account IDs, credentials or other private fields should appear. Record this as verified only after observing it against the current Linux database. Owner acceptance is a separate explicit result.

The next telemetry consumer can be online players by channel through the existing reviewed aggregate-file contract. Do not infer population from DB connectivity or expose private staff sessions.
