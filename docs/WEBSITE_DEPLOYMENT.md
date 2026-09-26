# TRIXTERMS website production candidate deployment

Prepared 2026-09-12 for the website repository [trixtergod3-bot/TrixterMS-website](https://github.com/trixtergod3-bot/TrixterMS-website). This is the authoritative runbook for **`codex/web-production-candidate-v1`**. The earlier [Hostinger plan](HOSTINGER_DEPLOYMENT.md) and [publication receipt](GITHUB_PUBLISH_HOSTINGER_READINESS.md) describe the previous `main` checkpoint; their branch selections do not apply to this candidate. Keep `main` unchanged. The candidate's final publication SHA and QA results belong in its release receipt; this document does not invent either result.

The development source is `C:\Users\Studio PC\Documents\ChatGPT\TrixterMS\local\web-production-candidate-v1`. This runbook creates no hosting connection, account, DNS record or deployment. It changes no MapleStory runtime, database or patch feed. Hostinger account authorization is separate from authorization to deploy a preview or cut over the public domain.

The public brand is **TRIXTERMS**, one word in all capitals. Apply [the approved visual direction](APPROVED_VISUAL_DIRECTION.md) to rendered branding and release QA. Technical repository names, paths, environment variables, schema identifiers and artifact filenames remain unchanged.

## 1. Deployment target and build contract

Use a separate Hostinger **Node.js Web App**, with the **Next.js backend** framework selection and **Node 24.x**. Hostinger currently documents Next.js backend and Node 24 support on eligible Business/Cloud plans, GitHub import, automatic deployment of connected-branch updates, and managed deployment directories. Account eligibility and actual settings still require inspection in the owner's hPanel. [Hostinger Node.js guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/), checked 2026-09-12.

The static **Advanced → Git** workflow excludes Node applications. [Hostinger Git workflow scope](https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/). This application has dynamic API handlers and server rendering; its `.next` directory is not a static upload. Next.js documents a Node server running the production build with `next start`; static export omits server-dependent features. [Next.js deployment documentation](https://nextjs.org/docs/app/getting-started/deploying).

| Setting | Candidate value |
| --- | --- |
| Repository | `trixtergod3-bot/TrixterMS-website` |
| Branch | `codex/web-production-candidate-v1` |
| Root directory | `.` containing `package.json` |
| Framework | Next.js 16.3.3 / React 19.2.8 / TypeScript; use backend preset |
| Runtime | Node 24.x; record the exact hosting patch version and npm version |
| Install | `npm ci --include=dev` |
| Production build | `npm run build` (`next build --webpack`) |
| Production start | `npm start` (`next start`) |
| Output directory | `.next`; source also includes `public/` |
| Entry file | Use the Next.js preset; this project has no custom `server.js` |
| Port | Hosting supplies `PORT`; never put a DEV preview port into hosting settings |
| Mode | `NODE_ENV=production` |
| Web process liveness | `GET /` must return 200, including when game data is unavailable |
| Live game-data readiness | `GET /api/status`; disconnected is deliberately 503, verified live data is 200 |

The current configuration uses the normal Next.js build, without `output: export` or `output: standalone`. Do not rename `.next` to `dist`, upload dependencies/build caches, or manually edit generated hosting files. Build tools such as TypeScript and Tailwind are development dependencies and must be installed during the production build. Check the install log if the platform's detected dependency step differs from `npm ci --include=dev`; do not declare a production-only dependency install equivalent.

For local candidate checks, run from its own source directory using Node 24. Confirm that port 4316 is free before starting a process. The explicit commands below select 4316 and match the candidate `dev`/`preview` scripts:

```powershell
npm ci --include=dev
node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 4316
```

Stop that development process before building and starting its production preview. Do not build into a `.next` directory used by another running preview.

```powershell
npm run lint
npm test
npm run build
npm run typecheck
npm run check:security
npm start -- --hostname 127.0.0.1 --port 4316
```

The final command stays running. Use a separate terminal for browser checks:

```powershell
$env:PORTAL_QA_URL = 'http://127.0.0.1:4316'
node tools/verify-browser.mjs
node tools/verify-production.mjs
```

The browser tool uses installed Chrome by default (`PORTAL_QA_BROWSER` can select another supported installed channel), targets loopback only, and writes ignored evidence under `local/qa/`. It must not be pointed at production or weakened to bypass its loopback restriction. Hosted checks are a separate read-only smoke/visual pass. Do not reuse the earlier branch's test counts or screenshots as evidence for this candidate.

## 2. Environment values and feature gates

Set values in the hosting environment manager; commit only the documented names and placeholders in [`.env.example`](../.env.example). No browser-facing `NEXT_PUBLIC_*` value may contain a credential or private endpoint. Next.js settings read while generating pages or response headers may require a rebuild after changes; validate rendered behavior after every configuration deployment.

| Variable | Required configuration and meaning |
| --- | --- |
| `NODE_ENV` | `production` in hosting; use development mode only on loopback |
| `PORT` | Host supplied; leave the application's start command free of a fixed port |
| `NEXT_TELEMETRY_DISABLED` | `1` disables Next.js framework telemetry; unrelated to game telemetry |
| `TRIXTER_SITE_URL` | Public HTTPS origin, with no credentials, non-default port, subpath/query/fragment. Production: `https://trixterms.com`; preview: its actual approved HTTPS origin. The shared site/registration configuration normalizes `www.trixterms.com` to the apex. Used for metadata/robots/sitemap and registration origin validation. HTTP loopback is allowed only in development/test. |
| `TRIXTER_PUBLIC_LAUNCH` | `false` for preview. Indexing requires all three: `NODE_ENV=production`, canonical apex origin, and explicit `true`. Otherwise metadata/headers are noindex, robots disallows crawling, and the sitemap is empty. This does not enable game features. Rebuild after changing this flag or the site origin. |
| `TRIXTER_READ_API_URL` | Blank until a reviewed HTTPS read service is reachable from hosting. An optional base-path prefix is preserved before `/api/...`. Do not point this at the portal's own API and create a request loop. |
| `TRIXTER_DAILY_RANKINGS_ENABLED` | `false` until the daily engine, eligibility, historical snapshots and finalization are verified |
| `TRIXTER_WEEKLY_RANKINGS_ENABLED` | `false` until the proposed weekly backend exists and is verified |
| `TRIXTER_REGISTRATION_ENABLED` | `false` until all account-gateway and native-login requirements pass |
| `TRIXTER_REGISTRATION_URL` | Private HTTPS account gateway endpoint; blank while registration is off |
| `TRIXTER_REGISTRATION_GATEWAY_TOKEN` | Independent secret of at least 32 characters; server-to-server only |
| `TRIXTER_REGISTRATION_CSRF_SECRET` | Independent random signing secret of at least 32 characters |
| `TRIXTER_REGISTRATION_ABUSE_GUARD` | In production, exactly `reviewed-distributed-gateway` only after that guard is deployed and verified |
| `TRIXTER_REGISTRATION_PROXY_SECRET` | Independent secret of at least 32 characters, shared only with the reviewed trusted proxy |
| `TRIXTER_RELEASE_DOWNLOADS_JSON` | Blank until approved published artifact metadata passes the validation and release requirements below |
| `TRIXTER_DISCORD_INVITE_URL` | Blank until the owner supplies the verified HTTPS `discord.gg/<code>` or `discord.com/invite/<code>` invitation |

A disconnected preview needs no service secrets. Vote and donation providers are disabled in code; there are no working vote/payment activation environment variables. Do not invent configuration fields or treat an environment flag as evidence that a backend was deployed.

## 3. Public API, telemetry and CORS

The intended flow is game database → reviewed backend/read service → portal server → browser. The website does not connect to MariaDB. Keep database authentication, private player/account records and game administration off the website host. The precise schemas, eligibility and DTO contracts are in [TRIXTERMS_PUBLIC_API.md](TRIXTERMS_PUBLIC_API.md).

The portal reader uses fixed GET routes, allowlisted query parameters, bounded DTO projection, a four-second timeout, a one-MiB response limit, no redirect following and no-store reads. It does not forward browser cookies or account credentials. Status freshness is checked. Unavailable or invalid responses become `data: null`, rather than sample players or online counts. The `/api/status` readiness response must not be used as a process-restart signal while intentionally disconnected.

Status can additionally include optional public `world` and `channels` observations. Older payloads remain valid; omitted/null values mean unavailable information. A channel needs its public ID, nullable name, nullable online state and nullable population, sampled with the envelope's timestamp. Exclude private/admin channels; do not publish aggregate key zero as a channel, infer health from a shutdown flag alone, derive counts from account login flags, or sum an incomplete list into a world total. This is a frontend contract, not evidence that the game read adapter has been deployed.

The current default browser API is **same origin**. Do not add wildcard CORS or embed the private read URL in a client bundle. Server-to-server requests do not require CORS permission; CORS is not backend authentication. The current read transport sends no bearer credential, so a gateway requiring bearer or mutual-TLS authentication must have a reviewed compatible transport before it can be enabled. A network policy must admit the actual hosting runtime, not a DEV loopback or Tailscale address. Hostinger egress reachability and identity are unverified.

If a separately approved future browser-accessible public read API is introduced, explicitly allow only the verified website origin(s), allow only required read methods, add `Vary: Origin` for reflected allowlisted origins, and review CSP `connect-src`. Keep authentication/administrative APIs out of that public CORS policy. Do not assume the current portal has this alternate integration.

Mobs, bosses, unique bosses, deaths, EXP, mesos/NX earned/spent, cubes found/spent and glasses spent can be shown only with their actual coverage. Partial economy instrumentation does not make an economy metric ranking-ready. Daily/weekly tournament flags stay off until the backend supports their scoring, anti-farming rules and finalized archives. The staged achievement catalog is an explicitly labeled preview; migration, live progress and reward delivery remain independent. Maps/skills shells and unavailable FM records must retain their honest empty states.

Registration requires the reviewed private writer, compatible salted game password hashing, normal-account defaults, duplicate/abuse protection, and a trusted proxy that strips incoming `X-Trixter-Edge-Token`/`X-Trixter-Client-IP` before setting its own authenticated values. The in-process limiter is supplemental; production needs a shared durable guard. Body logging must be off throughout that request path. See [registration integration](REGISTRATION_AND_RELEASE_INTEGRATION.md). Do not substitute auto-registration or launcher-token login. Account acceptance requires the native ID/password screen and a sanitized server `LOGIN_PASSWORD` observation; no credentials belong in evidence.

## 4. Domain, HTTPS and existing patch URLs

The public canonical origin is **`https://trixterms.com`**. Provision valid HTTPS for the apex and `www.trixterms.com`. The candidate's `next.config.ts` includes a permanent `www` host redirect to the apex; verify it preserves path and query through the actual hosting proxy. The edge must route `/beta/` to its preserved service before portal handling. Configure HTTP-to-HTTPS behavior without a loop and verify both hosts' certificates. App metadata and redirects do not provision DNS, HTTPS or patch routing. Preview metadata uses its configured origin; route canonicals, Open Graph and Twitter metadata, robots, and sitemap are generated by `lib/site-config.ts`.

Use an isolated temporary/preview hostname first. Hostinger's documented custom-domain flow starts from **Connect domain** on the temporary application's dashboard, follows the displayed DNS instructions, and provisions SSL after connection. DNS propagation may take up to 24 hours; it is not a guaranteed immediate cutover. [Hostinger custom-domain guide](https://www.hostinger.com/support/how-to-connect-a-custom-domain-to-a-node-js-application/).

The historical patch contract is **`https://trixterms.com/beta/manifest.json`**, together with `/beta/health.txt` and `/beta/files/<sha256>/<managed-path>`. Inventory the actual active release feeds before first deployment and preserve all feeds existing launchers still use. This documentation task did not verify live DNS, hosted files or feed availability. Never invent `/patch` as a replacement. Do not send patch manifests, payloads or missing-binary responses into the portal's catch-all, redirect or HTML error page.

The inspected AutoPatcher lane (`local/worktrees/autopatcher-v1/docs/AUTOPATCHER_V1.md` in the authoritative server workspace) separately stages a proposed root feed at `https://patch.trixterms.com/manifest.json`. Its local receipt records hosting and external native-login acceptance as pending; that is lane evidence, not a current DNS probe. The proposal neither retires historical `/beta` URLs nor proves the new domain is operational. Preserve existing launcher contracts until the release owner explicitly accepts a migration; keep legacy payloads available for clients still using them.

Hostinger warns that deployment-managed `public_html` and `hbuilds` content is overwritten, and retains only the latest two successful build versions. A sibling `public_html/beta` directory or hand-edited generated `.htaccess` is therefore not a durable preservation design. [Hostinger managed-file behavior](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

Before any public cutover, complete and retain this concrete record privately:

1. Current apex/`www` DNS record types, exact values, TTLs, authoritative provider, domain target and certificate state; current routing rules and backend targets. Preserve unrelated mail/DNS records.
2. A restorable private backup of the current website, host routing configuration and complete patch tree. Record the backup location and restoration owner. Keep keys and proprietary payloads out of the website repository.
3. For every active feed found in the inventory, the verified mechanism that keeps its URLs and storage untouched by portal deployments. If `/beta/` is active on the domain, verify that specific route. Obtain Hostinger confirmation if the managed platform cannot express the required arrangement. Do not delete the existing website to discover whether a conversion works.
4. Before/after manifests and hashes, health body, representative immutable payload hashes/sizes, content types, no-cache manifest/health behavior, immutable file caching, and large-file Range behavior where used. Confirm missing payloads are real 404 responses, not 200 HTML. Signature verification belongs to the release verifier, not JSON parsing.
5. The exact former domain/route target, a tested restoration procedure, selected website SHA, release operator and explicit cutover authorization. Rehearse restoration on the preview arrangement first.

If the routing/storage arrangement or restoration cannot be demonstrated, leave the current public target intact and retain the portal on preview. The exact hPanel account, filesystem target and routing mechanism are currently unknown; this runbook intentionally supplies no speculative destructive path or rewrite file.

## 5. Launcher and download publication

Use the release lane's validated **public metadata**, not local file paths or a guessed URL. `TRIXTER_RELEASE_DOWNLOADS_JSON` accepts schema `trixterms.web-downloads.v1`, a valid release label/timestamp, `clientVersion: GMS v111.1`, `publicationStatus: published`, `nativeLogin: true`, and the approved executable hash below. At least one accepted launcher/full-client artifact needs a filename, HTTPS URL, positive byte size and SHA-256. The optional manifest record needs its exact HTTPS `.../manifest.json` URL and positive sequence. Unsafe URLs and invalid records disable downloads.

Approved native-login `MapleStory v111.1.exe` SHA-256:

```text
1281B9F49259EA78162DD00E6BC3A29932EBFF47B1DA9BB3B7DFA2B762B9E7B1
```

The executable pin is distinct from the launcher ZIP hash, client archive hash and signed manifest hash. A syntactically valid metadata record does not verify the remote bytes or a signature. Before exposing a download, the release owner must verify the exact hosted artifact's size/hash, the launcher's compiled feed/trust/native-login metadata, the live signed feed and its payloads, and external Windows installation/repair/native-login results. Leave downloads off while the proposed AutoPatcher host or acceptance is pending. Do not label a local test build as published or supply a made-up checksum to unlock a button.

The AutoPatcher delivery is a launcher-only ZIP for clean installation; full-client archives are optional and are not authorized for upload by this website runbook. Use the release lane's actual Windows x64 requirements and installation instructions. Launcher operation must end at MapleStory's native account ID/password screen, using normal `GameLaunching <host> <port>`. No preset account, web login token or credential bypass is allowed. Keep patch binaries, WZ files and signing/private publishing keys out of website Git.

## 6. Manual release sequence after authorization

1. Obtain the candidate's published SHA from its verified release receipt and verify the same SHA on `codex/web-production-candidate-v1`. Check that its own build, lint, typecheck, tests, source/bundle scan, routes and desktop/mobile evidence passed. Record `main` separately and leave it unchanged.
2. The hosting owner completes GitHub authorization for **only the existing private website repository** and confirms Node 24 plan support. Do not change the connected repository of the current live website: that action can deploy and overwrite its target. Select the candidate branch in a new separate Node preview only when preview deployment is authorized.
3. Compare detected settings with section 1, set the preview's HTTPS origin, keep indexing and all unavailable integrations off, and deploy the reviewed SHA. Observe the install command, build, actual deployed commit and logs with secrets redacted. A push to a connected branch can redeploy; coordinate further pushes with the release operator.
4. Verify preview routes and disabled states below. Record actual Hostinger behavior for headers, process liveness, data readiness, caching and environment changes. Complete owner visual review.
5. Establish and test `/beta` preservation, backup and rollback; fill every value in the cutover record. Review approved production integration metadata independently. A static disconnected portal may be previewed without claiming that public game features are ready.
6. With explicit authorization for the concrete target and SHA, set production origin/metadata, configure the verified apex/`www`/HTTPS routing and connect the domain. Apply only the DNS changes shown for that approved arrangement. Keep `/beta` on its established service. Enable indexing only after the final public URL/metadata/robots checks pass.
7. Verify public routes, apex/`www` redirects, TLS and the entire patch preservation check immediately. Observe the deployment log's successful SHA and record the independent website deployment, live-data, download and owner-acceptance results. An HTTP 200 homepage alone proves none of the latter.

Hostinger redeployment uses **Dashboard → Redeploy**, where Node version, build/start and environment settings can be reviewed; GitHub redeployment takes the selected branch's latest code. It does not inherently select an old good commit. [Official redeployment procedure](https://www.hostinger.com/support/how-to-redeploy-a-node-js-application/).

## 7. Release verification checklist

| Scope | Expected evidence |
| --- | --- |
| Main routes | `/`, `/download`, `/register`, `/rankings`, `/achievements`, `/database`, `/free-market`, `/vote`, `/donate`, `/discord` render; no broken image/link or client error |
| Secondary routes | `/news`, `/patch-notes`, `/status`, a safe character-profile route, `/classes`, `/features`, `/guide`, `/players`, `/events`, `/boss-records`, `/live-world`, `/database/rare-drops` render with truthful availability |
| Rankings/search | Daily historical date and weekly window preserve parameters; database categories and FM search preserve filters; unknown data remains unavailable |
| Aliases and errors | `/daily-rankings` redirects to `/rankings/daily`; `/community` to `/discord`; unknown website route is 404; invalid API query is 400 JSON |
| Disconnected API | The documented public GET routes return 503 JSON, `data: null`, no-store; registration remains unavailable; no fixture players or fake online state |
| Connected API | Fresh status and eligible records validated against actual backend; responses disclose no account/internal identifiers or private details; failure returns unavailable |
| Browser | 320/390/768/1024/1440 widths, keyboard/focus/navigation, query interactions, one page heading, no horizontal overflow; inspect representative desktop/mobile screenshots |
| HTTP/SEO | HTTPS apex and `www` certificates; one canonical destination with preserved path/query; correct metadata/robots behavior for preview vs launch; no stack trace or private configuration |
| Headers | CSP and `nosniff`/frame/referrer/permissions headers present; production CSP has no development `unsafe-eval`; no wildcard credentialed CORS |
| Patch service | Original `/beta` manifest/health/object URLs retain signed bytes, expected cache/content/range behavior and real binary 404s after deployment and rollback rehearsal |
| Downloads | Published URL, byte size and archive hash match the accepted release; verified signed feed and native login evidence before enabling |
| Record | Exact local/remote/deployed SHA, environment names, build ID, Node/npm versions, test outputs, sanitized evidence paths, backup/restoration record and owner decisions |

## 8. Rollback procedures

Rollback restores the website release and routing independently of the game backend and patch channel. Do not stop/restart a MapleStory runtime, restore a player database or re-publish a patch manifest to repair a website problem.

**Failure before cutover:** retain the existing apex target and patch service. Diagnose the candidate on preview. No production DNS/file restoration is necessary if the planned isolation was preserved.

**Failure after cutover or loss of `/beta`:** the recorded restoration owner immediately restores the previous apex/`www` edge/backend route and only the DNS values changed by this cutover from section 4's backup. Keep the previous target and its HTTPS certificate available throughout the release window. If managed routing files were changed, restore the previously tested host-supported configuration. Do not improvise a direct `hbuilds/current` symlink change, delete a website, or rely on propagation being instantaneous. Verify the original homepage, apex/`www`, manifest/health and representative payload hashes from an external connection. Keep the faulty portal on its isolated preview for diagnosis. If these exact restoration inputs are absent, public cutover was not ready.

**Bad website code on an established Node target:** restore a previously accepted source tree as a new commit on the candidate branch and redeploy; retain Git history and `main`. Use a fresh, otherwise empty rollback checkout, with the good SHA taken from the accepted release receipt. These commands are for the release operator after rollback authorization; do not run them in the shared server checkout or over another task's edits:

```powershell
git clone --single-branch --branch codex/web-production-candidate-v1 https://github.com/trixtergod3-bot/TrixterMS-website.git trixterms-website-rollback
Set-Location -LiteralPath trixterms-website-rollback
git status --short
$websiteGoodSha = Read-Host 'Paste the 40-character SHA from the accepted website release receipt'
if ($websiteGoodSha -notmatch '^[0-9a-fA-F]{40}$') { throw 'A verified full commit SHA is required.' }
git show --no-patch --format=fuller $websiteGoodSha
git restore --source=$websiteGoodSha --staged --worktree -- .
git diff --cached --stat
git diff --cached --check
npm ci --include=dev
npm run lint
npm test
npm run build
npm run typecheck
npm run check:security
```

Stop at any failed command. Confirm the initial status was clean, inspect the full staged diff, and run the restored build's loopback route/visual checks before publication. When the restored tree and configuration are reviewed:

```powershell
git commit -m 'Restore previously accepted website release'
git push origin HEAD:refs/heads/codex/web-production-candidate-v1
git rev-parse HEAD
git ls-remote origin refs/heads/codex/web-production-candidate-v1
```

The two SHAs must match. A rejected push means the remote advanced; stop and review instead of force-pushing. If there are no source differences, diagnose configuration or routing rather than creating an empty rollback commit. The connected branch may auto-deploy this push; the operator must be ready. Otherwise use Dashboard → Redeploy with the candidate branch and verify the new restoration commit in the deployment log.

**Bad environment/configuration:** restore the prior reviewed environment values from the private release record, including origin and integration gates. Disable affected features while investigating. Rebuild/redeploy the verified source with those values and check actual rendered behavior. Never print secrets into a receipt or commit an environment backup. A preview noindex setting or disabled feed can be a deliberate safe state.

**Patch-channel incidents:** the patch release owner handles those with its separate signed publisher. Clients can reject a restored old manifest as replay; serving a previously accepted file set requires a new higher signed sequence when clients have already seen the newer sequence. Website rollback must preserve current signed manifests and immutable payloads. Do not clear client replay state or change signing trust to make an old website release work.

## 9. Observed limits and shortest owner action

The owner's reported pending GitHub authorization is the manual access dependency. The available browser was opened at hPanel and redirected to the Hostinger login screen on 2026-09-12. No authenticated hPanel access was available; eligible Node plan, GitHub connection, preview target/settings, active apex/`www` routing and release-feed layout are unverified deployment inputs, not confirmed hosting failures. Verify them before first deployment and preserve any existing feed. Candidate publication and QA must be verified by its current release receipt. Prior `main` publication does not prove this branch has been pushed or hosted.

Live read-service reachability/authentication, production registration/proxy/abuse controls, verified download metadata and public-feed/native-login acceptance, and an approved Discord invitation remain separate feature dependencies. They do not block building or previewing the disconnected portal. The inspected AutoPatcher receipt reports its proposed patch subdomain and external acceptance pending; this runbook did not access live hosting or probe game services. Vote/donation providers and verified daily/weekly competition backends remain future integration work.

**Shortest manual authorization action:** sign in to Hostinger and complete GitHub authorization for `trixtergod3-bot/TrixterMS-website` if prompted. The deployment operator can then inspect Node.js Web App eligibility and the exact target. After preview deployment is authorized, select **`codex/web-production-candidate-v1`** for a separate temporary Node preview with the settings above. Preserve the existing domain and patch service until their tested cutover is separately authorized. That unlocks preview setup; it does not remove DNS propagation, patch preservation or feature-integration work.
