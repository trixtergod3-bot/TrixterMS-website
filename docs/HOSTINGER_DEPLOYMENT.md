# Hostinger deployment preparation

Prepared 2026-09-12 for `trixtergod3-bot/TrixterMS-website`, branch `codex/web-portal-beta-v1`, future canonical origin `https://trixterms.com`. This is a deployment plan; this task does not deploy, change DNS or replace the existing hosted website.

## Hosting route

Use Hostinger's managed **Node.js web app** flow for this Next.js application. Hostinger documents Next.js backend support on eligible Business/Cloud plans, GitHub imports and supported Node 22/24 runtimes. It also warns that deployment-managed files can be overwritten and that existing-domain conversion needs care. Actual plan eligibility and domain state remain unverified. [Official Node.js deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), checked 2026-09-12.

Hostinger's separate **Advanced → Git** guide applies to PHP/HTML/static sites and explicitly directs Node applications to the Node.js workflow. Copying this repository to `public_html` through that static workflow is insufficient to run Next.js. [Official Git deployment guide](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/), checked 2026-09-12.

## Application build contract

The following are this repository's intended deployment settings, to compare with Hostinger's detected settings during setup. They are not a claim that an hPanel application has already been configured.

| Setting | Required value |
|---|---|
| Repository | `trixtergod3-bot/TrixterMS-website` |
| Branch | `codex/web-portal-beta-v1`; never silently select `main` |
| Project root | Repository root (`.`), containing `package.json` |
| Framework | Next.js with a Node server |
| Runtime | Node 22, at least 22.13.0; select the tested version supported by the plan |
| Install | `npm ci` using the committed lockfile |
| Build | `npm run build` |
| Start | `npm start` |
| Build output | `.next`; use the managed Next.js adapter rather than a static export |
| Port | Host-assigned `PORT`, inherited by the Next.js process; do not hard-code the local preview port |
| Production mode | `NODE_ENV=production` |
| Process liveness | `GET /` returns HTTP 200 when the portal process can render its homepage, including the disconnected-data state |
| Public-data readiness | `GET /api/status` returns HTTP 503 while the read backend is disconnected/unavailable; an approved live response returns HTTP 200 |

Run installation and build through the hosting build system. The repository must not depend on a DEV PC's absolute paths, local Java installation, Windows shell scripts, a MariaDB CLI or local server configuration. If a future VPS plan is chosen, its process manager, TLS, reverse proxy and service isolation need a separately reviewed runbook.

Configure a hosting process-liveness check against `/`, not `/api/status`. A disconnected preview deliberately serves an HTTP 200 portal and an HTTP 503 public-data envelope with `status: unavailable`, `data: null` and `source: none`. The latter means live game data is not ready; it does not mean the web process needs a restart. Track those two checks separately. Enabling live integration requires a fresh, validated backend response and HTTP 200 from `/api/status`; do not manufacture an online response merely to satisfy a liveness probe.

The public repository configuration example is the canonical list of supported environment variables. Set the site's canonical origin to `https://trixterms.com` only for the real production hostname. Keep live data, registration, vote, payment and download capabilities disabled until their required integrations and approved release evidence exist. Development fixtures must not become production leaderboard data. Never put secrets in `NEXT_PUBLIC_*` variables.

## Preserve the existing `/beta` patch service

The existing `/beta` subtree is separate release infrastructure. Its manifest URLs, signed content, immutable payload paths, access rules and binary hashes must survive any future website cutover. No launcher/client binary or patch payload is part of this repository. Do not import private patch-publisher configuration into the web app.

The portal's deployment must own only its approved application target. Hostinger's managed Node setup can regenerate routing and overwrite managed directories; therefore a filesystem directory named `public_html/beta` must not be assumed safe merely because it exists today. This preservation rule is a project requirement prompted by the current patch service, not a claim that a rewrite exception has been tested.

Before a future domain cutover:

1. Inventory the current document root, `/beta` paths, routing rules and release URLs without exporting credentials. Back up hosted configuration and content to an approved private destination, with a restoration method.
2. Build the portal on a separate preview website/hostname. Do not remove the current trixterms.com website to create that preview.
3. Establish a supported routing/storage arrangement in which the portal deployment cannot delete or alter the patch service. Confirm with Hostinger how managed routing and deployment directories interact with the existing subtree. Preserve the established URLs; moving the patch host requires a separate launcher/release decision.
4. Verify representative manifest and payload URLs, cache/range responses where used, and SHA-256 values before and after a staging deployment. Keep `/beta` out of application catch-all/error handling and out of robots/sitemap-generated portal routes.
5. Record the approved target, tested rollback, selected Git SHA and explicit domain-cutover authorization before touching the live target.

If preservation cannot be demonstrated, retain the existing website/patch service and keep the portal on preview. Do not remove or overwrite the live domain's files to work around the limitation.

## Backend boundary

The browser talks to this website's API or an approved public read API. The game database stays behind a reviewed server-side service with fixed queries, safe DTOs and least-privilege access. Do not open MariaDB to the internet or embed its credentials in the repository, web bundle, build log or public environment variables.

Public read integration must use a deployable HTTPS service with a defined timeout, cache policy and generic failure responses. The DEV localhost adapter and its private configuration lookup are not production infrastructure. Registration needs a separately approved server-side backend with the current game password hashing, duplicate protection, rate limits and abuse controls. A disabled registration feature is a valid preview state; a form that writes directly to a game table from the browser is not.

Downloads require an approved release manifest, checksum and configured URL. Vote requires the selected provider and verified callback. Donation checkout requires a selected hosted payment provider, webhook verification and idempotent reward fulfillment. Do not enable these integrations by inventing providers, URLs or production data.

## Future deployment sequence

1. Verify the source checkpoint on `codex/web-portal-beta-v1` and the remote SHA in GitHub. Grant the Hostinger GitHub integration access to this private repository through the owner's account, without committing access tokens.
2. Confirm managed Node plan support, select the repository/branch and configure a separate preview application. Compare detected settings with the build contract above before starting any deployment.
3. Configure only the documented production environment values and approved public service endpoints. Keep secrets in the hosting environment manager and redact them from deployment evidence.
4. Run the production build and smoke tests for every primary route, 404 handling, feature-disabled states and API availability envelopes. Check mobile navigation, keyboard access and no horizontal overflow. Inspect browser bundles for credentials and accidental DEV configuration paths.
5. Verify TLS, caching and response headers on preview; confirm that error pages expose no configuration or stack traces. Inspect all external links and distinguish verified downloads/invites from unavailable actions.
6. Complete `/beta` preservation checks and owner visual acceptance. A future explicit deployment request can then select a concrete release SHA and domain cutover. Keep source publication, preview deployment and production deployment as separate recorded states.

## Current blockers and next milestone

- Hostinger's actual account verification, selected plan, Node app settings, GitHub authorization, domain mapping and `/beta` routing have not been observed in this task.
- Initial GitHub connector inspection showed an empty private repository. The final source-publication outcome and remote SHA belong in the task handoff; initial CLI credential failures do not prove publication succeeded or failed later.
- Public backend services, registration enablement and production providers require the integration work documented with the API contracts. Feature flags must remain truthful.
- No public-domain deployment or game binary upload has been performed by this documentation step.

The next hosting milestone is a private-repository Node preview built from a verified checkpoint, followed by a tested plan that preserves the existing `/beta` service. The production domain is changed only after those concrete results are reviewable and deployment is authorized.
