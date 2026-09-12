# GitHub publication and Hostinger readiness

Publication date: 2026-09-12. Repository: [TrixterMS-website](https://github.com/trixtergod3-bot/TrixterMS-website), deployment branch **main**.

## Implemented and verified source

The current website is the complete Website V2 adaptation in `local/web-portal-beta-v1`, confirmed by its implementation owner and independent source audit. Its preserved original is Website V2 at `3b59bf05d78750c8a3cb14d871aeda448d3f6ac4`. Original projects were not reset, deleted or replaced. No unrelated Noetic code or game-server history was imported.

- Website source checkpoint: `02061cfaef93b3f55c1c8053c1fc7b2a0a83b9c7`.
- Frozen migration and handoff snapshot promoted to main: `4ad8f97b14a4666a1469df8fb650d2e9565c143c`.
- The final publication revision is the Git commit containing this document and its [task handoff](coordination/chats/push-website-to-git-01a09709.md).
- The original feature branch is retained. A verified complete Git bundle backup was made before main creation at ignored `local/publication-backups/website-before-main-4ad8f97.bundle`, SHA-256 `A4EF88B143749138B7B647BE333E5FF80173B3FE3DAB802CFEDADCA988E897C6`.

Git 2.55.0.windows.2 and its matching HTTPS helper were identified. `where.exe git-remote-https` did not find the helper on PATH; the helper exists under Git's reported exec path. Repeated authenticated HTTPS checks and publication succeeded with verified TLS using Git's OpenSSL backend. No HTTPS helper crash was reproduced and no Git reinstallation was necessary. Repository ownership exceptions, where required across sandbox users, were restricted to the exact audited website path.

Production build, typecheck, lint, 45 automated tests and 120 route/viewport checks passed. Browser QA checked 26 internal links and 10 interaction/API cases with zero errors, broken images or horizontal overflow. The mobile first screen was independently inspected. Details and scope limits are in [VERIFICATION.md](VERIFICATION.md).

Publication excludes private environment files, caches, dependencies, build artifacts, runtime output, client/WZ files and databases. The committed lockfile is version 3, matches the package manifest and resolves packages through the public npm registry. Security checks cover source and generated browser bundles. Only a placeholder `.env.example` is committed; no private environment values are recorded in this report.

## Exact Hostinger settings

Use **Node.js Web App**, the **Next.js backend preset**. Dynamic API routes require a Node server. Hostinger documents Next.js backend and Node 24.x support on eligible Business/Cloud plans. [Official deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/). The static Advanced → Git flow excludes Node apps. [Static Git scope](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/).

| Setting | Value |
| --- | --- |
| Repository | `trixtergod3-bot/TrixterMS-website` |
| Branch | `main` |
| Project root | `.` |
| Framework | Next.js 16.3.3 / React 19.2.8 / TypeScript |
| Hosting mode | Node.js Web App, Next.js backend preset |
| Node | 24.x; tested locally with 24.19.0 and npm 11.17.0 |
| Install | `npm ci --include=dev` |
| Build | `npm run build` |
| Output | `.next` |
| Start | `npm start` |
| Entry file | Use the Next.js preset; no custom server entry file |
| Port | Hosting platform supplies `PORT` |
| Process liveness | `/` |
| Backend readiness | `/api/status`; intentionally 503 while disconnected |

Hostinger's managed runtime may offer a different Node 24 patch; the actual selected patch must be observed during deployment. Do not treat `.next` as a static website upload or configure the local preview port in hosting.

## Environment variable names only

The disconnected preview needs no service credentials. Optional features remain disabled or unavailable until their corresponding configuration and verified backend exist.

| Purpose | Names |
| --- | --- |
| Platform and launch controls | `NODE_ENV`, `PORT`, `NEXT_TELEMETRY_DISABLED`, `TRIXTER_PUBLIC_LAUNCH` |
| Read service | `TRIXTER_READ_API_URL` |
| Competitions | `TRIXTER_DAILY_RANKINGS_ENABLED`, `TRIXTER_WEEKLY_RANKINGS_ENABLED` |
| Registration | `TRIXTER_SITE_URL`, `TRIXTER_REGISTRATION_ENABLED`, `TRIXTER_REGISTRATION_URL`, `TRIXTER_REGISTRATION_GATEWAY_TOKEN`, `TRIXTER_REGISTRATION_CSRF_SECRET`, `TRIXTER_REGISTRATION_ABUSE_GUARD`, `TRIXTER_REGISTRATION_PROXY_SECRET` |
| Downloads and community | `TRIXTER_RELEASE_DOWNLOADS_JSON`, `TRIXTER_DISCORD_INVITE_URL` |

Configure private values only in the hosting environment manager. `TRIXTER_SITE_URL` is used for registration-origin validation. No payment or vote provider environment integration is currently implemented. See [integration contracts](REGISTRATION_AND_RELEASE_INTEGRATION.md).

## Blockers and next step

GitHub publication is complete. Hostinger account/plan eligibility, private-repository authorization and the actual Node application settings have not been observed. Live API, registration, download metadata and providers are separate prerequisites for those features; no sample players are shown as live data.

After the owner explicitly authorizes a hosting connection, import the existing private repository into a separate Hostinger Node preview, select main and review the settings above. Connected-branch pushes then trigger auto-deployment. [GitHub connection and auto-deployment](https://www.hostinger.com/support/how-to-deploy-apps-built-with-codex-on-hostinger/).

This checkpoint does not connect or change the live `trixterms.com` site. Before any later domain cutover, follow [the deployment plan](HOSTINGER_DEPLOYMENT.md) to preserve the existing `/beta` patch routing and payloads. Owner visual acceptance, live backend verification and deployment remain independent milestones. No game-server source, database, runtime or live Hostinger configuration was changed by this publication task.
