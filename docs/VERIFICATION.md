# Portal verification

Observed on 2026-09-12 against the production build in the isolated website checkout. Node 24.19.0 and npm 11.17.0 were available. Production preview: `http://127.0.0.1:4315`.

| Check | Observed result |
| --- | --- |
| `npm install --cache ./local/npm-cache --no-audit --no-fund` | PASS: exit 0. Playwright was subsequently added with `npm install --save-dev --save-exact @playwright/test --cache ./local/npm-cache --no-audit --no-fund`, also exit 0. Lockfile is committed. |
| `npm run build` | PASS: Next.js 16.3.3 production build using webpack. |
| `npm run typecheck` | PASS. |
| `npm run lint` | PASS. |
| `npm test` | PASS: 45 tests, including preserved model regressions, registration guards, download validation, bounded API contracts, achievement/AP consistency and publication boundaries. |
| `npm run check:security` | PASS: no findings in publishable source or 53 generated browser bundles. Repeated after staging the publication inventory. |
| `node tools/verify-browser.mjs` | PASS: 120 route/viewport checks, 26 internal links, 10 interaction/query/API checks, zero browser errors. |
| Original source preservation | The V2, UX remaster, foundation and independent D-drive source candidates remained clean and unchanged. |

The browser run covered 24 routes at widths 1440, 1024, 768, 390 and 320 pixels. Every checked route returned 200 with one main heading, no horizontal overflow and no broken images. Internal links and anchors resolved. Interaction coverage includes responsive navigation, ranking tabs, achievement search and empty results, invalid database/FM queries, historical ranking parameters, disconnected API responses, disabled registration, and a real 404 route. Legacy `/daily-rankings` and `/community` redirects and the `nosniff`/frame-denial headers were also independently checked.

The source/bundle secret and publication-boundary scan passed. The install commands above skipped npm vulnerability auditing; no dependency vulnerability-audit result is claimed.

All 11 public GET routes returned an honest unavailable envelope (`503`, `data: null`) with no backend configured. Disabled account submission also returned `503`. Automated tests use synthetic fixtures only; the production application does not import player fixtures. No registration request was sent to a game service and no account was created.

Desktop and mobile screenshots were inspected for the homepage, registration and achievement catalog, with additional route captures retained locally. The 320-pixel header issue found during the first pass was fixed before the passing final run. Local browser evidence is in `local/qa/browser-report.json` (checked at `2026-09-12T19:17:11.324Z`) and `local/qa/*.png`; these files are deliberately ignored, not public assets. The original generated hero and its source hashes are documented separately in [ART_PROVENANCE.md](ART_PROVENANCE.md).

## Scope limits and owner QA

These results verify the website implementation and its disconnected, fail-closed behavior. They do not establish live beta API accuracy, account creation, native client login, download installation, tournament finalization/rewards, payment/vote delivery, server capacity, production accessibility certification or Hostinger deployment. No game build, database migration, runtime restart or domain cutover occurred.

Owner visual acceptance remains pending. Live integration requires a reviewed private read backend, an authenticated registration service with distributed abuse controls, approved release metadata and binaries, a Discord invite, provider configuration and a Hostinger preview that preserves the existing `/beta` feed. When a client package is actually handed off, the approved executable identity and native `LOGIN_PASSWORD` flow must be verified separately.

The source checkpoint and publication status are recorded in [the lane handoff](coordination/chats/web-portal-beta-01a096f8.json). Later integration work must rerun checks against its own source and configuration.
