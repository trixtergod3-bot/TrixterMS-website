# TrixterMS beta web portal

Next.js 16.3.3, React 19.2.8, TypeScript and responsive CSS. This dedicated website repository is adapted from the preserved Website V2 source. The original website worktrees and game server remain untouched.

## Run locally

Use Node.js 22.13+ or 24 LTS. From this repository:

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:4315. For a production preview:

```powershell
npm run build
npm run preview
```

Production hosting: `npm ci`, `npm run build`, then `npm start` (the platform supplies `PORT`). This is a Node application, not a static upload. Configure values from [.env.example](.env.example) on the server; no database credentials belong in the website.

## Verify

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run check:security
```

With the production preview running and Google Chrome installed:

```powershell
node tools/verify-browser.mjs
```

Browser QA checks routes at 1440, 1024, 768, 390 and 320 pixels, navigation, forms, filters, internal links, missing pages, unavailable API states and console errors. Screenshots and results go to ignored `local/qa/`. Use `PORTAL_QA_BROWSER=msedge` for an installed Edge browser. No game server is started.

## Product surfaces

Home, download, register, rankings, daily and weekly rankings, achievements, database, Free Market, vote, donate, Discord, news, character profiles, status, classes, features, guide, players and prepared event/record pages. Legacy daily/community links redirect.

- Live world values and standings default to **unavailable**. No sample player data is shown in production.
- The searchable 40-achievement catalog is explicitly a **staged catalog preview**, not earned player progress.
- All 11 requested public GET contracts are bounded same-origin proxies to a separately reviewed read-only service.
- Registration is a guarded same-origin gateway and remains disabled until the private account service, CSRF secrets, authenticated edge and distributed abuse controls are configured.
- Download links require validated published metadata, hashes and the approved native-login executable identity.
- Daily/weekly competitions, live voting, checkout, and missing external invitations remain disabled.
- Retained V2 fixtures are for explicit automated tests only; they are not imported by public routes.

## Documentation

- [Source inventory and migration](docs/SOURCE_MIGRATION.md)
- [Public API and schema audit](docs/TRIXTERMS_PUBLIC_API.md)
- [Registration, downloads and providers](docs/REGISTRATION_AND_RELEASE_INTEGRATION.md)
- [Visual asset brief](docs/TRIXTERMS_WEB_VISUAL_ASSET_BRIEF.md)
- [Hostinger deployment preparation](docs/HOSTINGER_DEPLOYMENT.md)
- [Verification and release readiness](docs/VERIFICATION.md)

Target: `trixtergod3-bot/TrixterMS-website`, branch `codex/web-portal-beta-v1`. No main push or hosting deployment is part of this checkpoint. Keep the independently managed `/beta` patch feed and payloads intact before any future domain cutover.
