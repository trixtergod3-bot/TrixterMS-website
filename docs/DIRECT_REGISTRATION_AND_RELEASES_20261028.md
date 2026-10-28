# Direct registration and complete player releases

This branch starts at the actual hosted website checkpoint `5d3dc9477eb26d2637de0fff9d0c2bbddbd17e8c`. It preserves the existing metadata reader, update feed and unrelated website routes. `/register` gets a temporary HTTP307 redirect to `https://register-gateway.trixterms.com/register`, where the Linux HTTPS proxy supplies authenticated, overwritten direct-peer identity to the loopback registration form. Do not deploy the redirect until the Linux route has passed public HTTPS and form tests. The older Hostinger `/api/register` remains fail-closed; no browser-side secret is introduced.

The Linux form uses signed, expiring, IP-bound, single-use CSRF tokens, exact origin checks, bounded bodies/concurrency and atomic persistent global/IP/name budgets. It reuses `RegistrationGatewayWriter` and the existing restricted local database account. A private canary created one generated account and rejected its duplicate; the account is retained. Native game login remains a separate manual test. This is a reviewed alternative to the unavailable custom Hostinger ingress, not removal of its security checks.

## Existing downloads and updates

The website reads `TRIXTER_RELEASE_METADATA_URL`, validates the fixed approved HTTPS origin and checks the published metadata against the raw manifest hash, release and sequence. The launcher's ECDSA signature authentication and managed-file hash checks remain authoritative. Preserve this live value:

`https://floralwhite-stinkbug-872547.hostingersite.com/beta/releases/current.json`

Current observed release: sequence18, launcher1.3.6.0. Its manifest contains a nine-file delta; new players need the complete full-client ZIP. The standalone launcher ZIP is for an existing complete installation. Launcher startup calls `CheckForUpdatesAsync` and applies authenticated updates before play. No updater executable was launched during this website change.

For every client-changing release, use the existing publisher to:

1. Freeze and accept the exact compatible server/client files. Preserve source provenance, native executable identity, public content and live player data.
2. Stage the new signed manifest and changed objects using `tools/patch-publisher/Stage-TrixterGoldenClientRelease.ps1` / `New-TrixterPatchRelease.ps1` from the authoritative project.
3. Create both launcher and full-client archives from that same frozen manifest/client using the existing `New-TrixterPublicDistribution.ps1`, including the authenticated complete baseline when the manifest is a delta. Read back every archive entry; never ZIP an arbitrary private QA folder.
4. Publish immutable files with the established `Publish-TrixterPatchSftp.ps1`, verify hashes/readback and promote the signed feed and matching `releases/current.json` through the existing guarded publication workflow. Announce only after both are verified. Preserve rollback and old immutable archives.
5. Verify the website resolves both archives for the new sequence, a clean full ZIP contains the expected union, and the official launcher detects the release through the authorized workflow. Existing players receive managed-file updates when opening the launcher, not while a game session is active.

The reviewed complete-distribution implementation and operator notes exist under the authoritative project's `local/launcher-astral-01a11837/accepted-delivery-source/tools/patch-publisher/`. Reuse their generic scripts; the historical `Invoke-AcceptedPlayerDownload.ps1` pins sequence18 and must not be reused unchanged for a future release. Integrate only qualified source into the authoritative release workflow before publication. No signing key, upload identity or password belongs in a chat, prompt or repository.

Server-only changes that leave client files identical do not require a different full-client ZIP. A changed game client does. Source edits alone do not publish either artifact.

## Reusable owner update request

> Prepare and publish the next qualified official Linux beta update using the existing release lane and publisher. First identify the current live server, signed manifest and accepted client freeze. Preserve accounts, characters, items, economy and configurations. Build and test only the compatible accepted changes, prepare targeted rollback, and distinguish server-only changes from client changes. For client changes, build the signed patch plus launcher/full-client distribution from the same frozen inventory, upload immutable payloads, verify all hashes and archive entries, then promote matching metadata. Verify external game connectivity, native login, launcher update detection and clean full-client download. Do not promote unfinished private QA/native assets or expose credentials. Report exact version/hashes, changes, rollback and any pending owner gameplay checks.

This document does not establish that the newest private QA package has been promoted to Linux R4 or that future releases happen without running the release workflow.
