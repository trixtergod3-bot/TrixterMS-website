# Finalize TRIXTERMS launch flow

Status: **BLOCKED on production activation**, with the website implementation
and automated checks complete. Owner acceptance and deployment are false.

Website branch: `codex/final-launch-flow-01a09b6a`. Verified source checkpoint:
`54fe0e60cb18c78fc257252daa6484a64fdfc754`. Base is the approved midnight
production candidate `7abc5c3882370a50232d12ab82017083881a09d0`, independently
observed in Hostinger as the current deployment. The separate telemetry
candidate was not merged. Obtain the final handoff revision from branch history.

PLAY NOW continues to `/download`. The primary action reads DOWNLOAD FOR
WINDOWS and uses the existing release metadata environment contract. The page
shows public release identity, Windows x64 and download size. Launcher-only
instructions explain UPDATE, final verification, disabled PLAY until Ready,
and native manual ID/password login. A launcher takes precedence over legacy
archive metadata. Checksum/manifest details remain available in disclosures.
No launcher version or URL is hard-coded in application source.

Automated checks passed: 58 unit tests, lint, production build, typecheck,
security scan (55 browser bundles, zero findings), 120 route/viewport checks,
27 internal links, 10 browser interactions, 16 production checks, and focused
download-flow checks at 1440/390/320 pixels. The focused test uses supplied
validated metadata and clicks the actual PLAY NOW route. Its initial locator
and streaming-render timing failures were corrected and the final run passed.

The local UI tests used the public sequence-3 metadata as a rendering input,
not as authorization to deploy that launcher. Launcher 1.3.2 / sequence 3
failed its real Ready gate despite installing and hash-verifying all 66 files.
The owning game patcher task has corrected the inventory mismatch in 1.3.3;
final public publication/clean-room verification must pass before website
activation. Do not expose the faulty intermediate release to players.

Hostinger was authenticated by the owner. Its live app is Node 24/Next.js,
root `./`, approved commit `7abc5c38`, with no environment variables. The Git
provider is disconnected and Redeploy is disabled. Automatic approval review
blocked opening Connect Git provider because repository OAuth access was not
specifically authorized. A repository-scoped reconnection request is pending.
No hosting configuration, Git connection, DNS, or deployed website was changed.

The exact procedure, rollback and laptop acceptance checklist are in
[LAUNCHER_DOWNLOAD_DEPLOYMENT.md](../../LAUNCHER_DOWNLOAD_DEPLOYMENT.md).
The integration game-repository checkpoint is
`ba0e02efc8146d75f3d8eb7be6750c12cf3f7c21` on the same branch name; its
[handoff](https://github.com/trixtergod3-bot/TrixterMS/blob/codex/final-launch-flow-01a09b6a/docs/coordination/chats/final-launch-flow-01a09b6a.md)
separates publisher, runtime and launcher evidence.

Local-only artifacts: this website checkout's `local/qa/` reports/screenshots,
ignored release metadata and build dependencies/output; the authoritative
game workspace's `local/final-launch-flow-01a09b6a/` holds the safe hosting
before-state and public download/test receipts. No keys, credentials, client
binaries, WZ or database files are published. The own game registry remains
the authoritative cross-repository status record.

Next action: authorize the existing website's repository-scoped Git provider
reconnection, await the corrected public launcher gate, set its exact reviewed
`TRIXTER_RELEASE_DOWNLOADS_JSON`, deploy this tested website revision and
verify the public download. Then perform external laptop/native login owner QA.
