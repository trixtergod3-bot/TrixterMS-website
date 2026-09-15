# Deploy official beta downloads

Status: BLOCKED at owner-only Hostinger `Connect GitHub` control on the existing trixterms.com Deployments page. Automatic approval review rejected the click despite the owner's repository-specific authorization. Do not bypass the review. Owner action: **PRESS: Connect GitHub**.

## Reviewed candidate
- Repository: trixtergod3-bot/TrixterMS-website
- Branch: codex/official-beta-downloads-01a0a6d2
- Verified source checkpoint: f3ba18fa029261d9d84fcebc7ba43a31f503ae74
- Production remains 7abc5c3882370a50232d12ab82017083881a09d0, Node 24.x, root ./.
- Candidate inherits the tested canonical current.json reader and preserves that production tree. Only this task's source edit labels the two cards PUBLIC BETA LAUNCHER and FULL PUBLIC BETA CLIENT.
- IMPLEMENTED=true, TESTED=true; VERIFIED=false and DEPLOYED=false for the real domain. Owner acceptance remains false.

## Fresh evidence, 2026-09-15
65 tests, lint, production build and typecheck pass. Security scan: 118 publishable source files, 55 browser bundles, zero findings. npm audit: zero vulnerabilities. Local production page uses only TRIXTER_RELEASE_METADATA_URL and visibly renders the correct current archives. Real domain still shows Downloads coming soon.

Canonical release: v111.1-beta.1-character-select.1, sequence 10, launcher 1.3.6.0.
- Launcher: HTTP200, 68698039 bytes, SHA256 43AF26BFFB445899EE11D7BAA176BCE00A7B3393503C9F404C073C77438E4B2A.
- Full client: HTTP200, 3382544653 bytes, SHA256 D1AD39D6CA28E27811A29D297D77FA823B4D8FCB929BE787A1ED4825514D575A.
- Both entire archives streamed and hashed, ZIP signatures verified, redirects rejected. URLs come directly from official current.json; no local/QA/Tailscale dependencies.
- Manifest SHA256 9F45E82A3D4E1E826CC2710521376E85C8407BDEE0A513B837EE22DA9BF36F5C. ECDSA signature verified with existing launcher public key. health.txt HTTP200/ok, sample payload hash valid, byte range HTTP206. Manifest unchanged.
- Local-only verification receipts: local/official-beta-downloads-01a0a6d2/{current-before.json,artifact-verification.json,feed-verification.json,manifest-before.json,manifest-after.json}. No credentials or proprietary assets committed.

## Resume
After owner connection, inspect exact repository access and current deployment settings. Preserve every existing environment value and back up configuration before changing it. Configure TRIXTER_RELEASE_METADATA_URL=https://floralwhite-stinkbug-872547.hostingersite.com/beta/releases/current.json. Deploy tested candidate with npm ci --include=dev, npm run build, npm start, Node24, root dot. Recheck canonical release and live production for concurrent changes first. Keep independent patch host untouched. Verify real-domain buttons, both URLs, runtime routes and feed after deployment. Register this lane in default-branch directory during integration; currently discovery entry is on the lane branch only. Then perform clean external laptop owner QA with native login and repeated PLAY.
