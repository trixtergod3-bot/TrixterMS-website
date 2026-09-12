# TRIXTERMS production candidate verification

Scope: `codex/web-production-candidate-v1`, based on preserved website main `81856c608dab33346f8f915dcd5219c893f09e01`. Candidate build ID: `XwqHzd1Qc5ACXy3xncnoN`. Node 24.19.0, npm 11.17.0; Next.js 16.3.3 / React 19.2.8. This is a production Node build served locally on port 4316. It is not a Hostinger deployment.

## Implemented

- Exact public **TRIXTERMS** branding, centered live HTML wordmark, functional PLAY NOW / REGISTER actions, preserved navigation and all previous routes.
- Original midnight/cyan fantasy artwork with separate desktop and portrait mobile compositions; complete chibi companion scene, moon, floating islands, waterfalls, castle and visible portal. Source/derivative identities and prompts are in [ART_PROVENANCE.md](ART_PROVENANCE.md).
- Real account actions, blue translucent news/events/rankings/status panels and responsive layouts. Events and players are not fabricated; account sign-in stays inside the game.
- Optional validated public world/channel observations, preserving compatibility with the original status payload. Unknown observations remain unavailable.
- Validated HTTPS origin, exact www-to-apex redirect, per-route canonical/OG URLs, favicon metadata, explicit launch-gated indexing/robots/sitemap and server-only environment configuration.
- Native-login launcher contract preserved; installation guidance now handles launcher-only and full-client releases separately.
- Current [deployment runbook](WEBSITE_DEPLOYMENT.md) and durable [visual direction lock](APPROVED_VISUAL_DIRECTION.md). The prior visual brief is marked historical.

## Tested and verified

| Check | Actual result |
| --- | --- |
| `npm ci --include=dev --cache ../web-portal-beta-v1/local/npm-cache --no-audit --no-fund` | PASS, clean lockfile install; no lockfile change |
| `npm run build` | PASS, production webpack build; final build ID above |
| `npm run lint` / `npm run typecheck` | PASS |
| `npm test` | PASS, 56/56 including status/channel projection/freshness, origin/metadata, registration, launcher, AP and publication boundaries |
| `npm run check:security` | PASS, source and 55 browser bundles; final staged inventory scan recorded with the source checkpoint |
| `npm audit --omit=dev --json` | PASS, 0 reported production dependency vulnerabilities on 2026-09-12 |
| `node tools/verify-browser.mjs` | PASS, 120 route/viewport checks, 27 internal links, 10 interaction/query/API checks, 0 browser errors; final run started 2026-09-12T20:24:58.363Z |
| `node tools/verify-production.mjs` | PASS, 16 grouped checks; 11 major routes' HTTPS canonical/OG/favicon/indexing/security metadata, robots/sitemap, www-only 308 retaining path/query, unrelated-host 200, assets and white hover text; 0 console/page errors |
| Independent review | PASS, 44 route/width visits across 22 routes at 1440/390; exact public brand, one h1, no overflow/broken images/page errors, real actions, hover/nav styling. Final build delta: 2 homepage viewports plus favicon resource/metadata, no console errors |
| Manual visual inspection | Desktop and phone captures inspected; final mobile portrait selects its own asset and keeps complete characters/portal visible |
| Preservation | Website main remains at the baseline SHA; no game source, runtime, database, autopatcher or DNS changes |

The broader browser suite covers 24 routes at 320/390/768/1024/1440, all internal links/anchors, mobile menu, ranking tabs, achievement search, malformed query handling, 404, all eleven unavailable GET APIs and disabled registration. No game service received account writes. Synthetic unit-test data is not used by production pages.

The first passes identified and corrected a type assertion, security-scanner-triggering synthetic credential URL literals, inherited hover/nav colors, framing that clipped the character/portal, and a missing favicon metadata declaration. The publication scan was not weakened. No unresolved local validation failure is carried into the checkpoint.

## Local evidence and limits

Candidate evidence is ignored under `local/qa/`: `final-build.log`, `final-tests.log`, `browser-report.json`, `production-report.json`, `npm-audit-production.json`, route screenshots and the loopback preview logs/PID. Independent evidence is in the shared Documents registry under `local/coordination/classic-hhg-01a0972a-website-review/`, especially `run-final/brand-review.json` and `run-release-delta/brand-review.json`. Only sanitized summaries and original web artwork are published.

Owner approval covers the visual direction and naming rule. Final candidate acceptance remains **OWNER_QA**. IMPLEMENTED=true, TESTED=true, VERIFIED=true apply to this local candidate and its unavailable-data behavior. OWNER_ACCEPTED=false and DEPLOYED=false. Live read telemetry, account creation, released launcher installation/native LOGIN_PASSWORD, Discord invitation, competition finalization and hosted HTTPS are not claimed verified.

## Deployment state

Deployment readiness is **BLOCKED at external hosting access**. Opening hPanel in the available browser reached the Hostinger sign-in page. No authenticated hPanel access, GitHub authorization, Node target, environment configuration, domain routing, HTTPS cutover or deployment was performed. Existing release-feed routing must be inspected and preserved before any cutover. Live integrations remain separately gated and do not prevent a disconnected preview.

Shortest owner action: sign in to Hostinger and complete GitHub authorization for the existing website repository if prompted. Next milestone: deploy the reviewed candidate to a separate Hostinger Node preview and verify its HTTPS/origin/route behavior before any public-domain cutover.

Source and handoff SHAs, final browser counts and publication readback are recorded in [this task's handoff](coordination/chats/web-predeployment-01a09705.md). No main merge or default-branch directory modification is authorized by this candidate request.
