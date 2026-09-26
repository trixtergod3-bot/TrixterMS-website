# Build public download system

Status: **BLOCKED**. Website implementation and tests are complete; production
deployment is blocked by the disconnected Hostinger Git provider. Owner acceptance
is false. Existing production remains at 7abc5c38; main remains 5775e260.

Source checkpoint `22f7bb69bea5a12f96a389164c8943da6cd3317f` was pushed and remotely
verified on `codex/public-download-system-01a09fb8`. It preserves the observed
production design and the required 5775e260 lineage.

Both production choices now render: DOWNLOAD LAUNCHER and DOWNLOAD FULL CLIENT,
with version, size, checksums and concise native-login instructions. QA bundle
copy is removed. A bounded server-side reader validates live current-release
metadata and its binding to the current manifest hash/version/sequence, failing
closed during an incomplete promotion. Static JSON configuration remains supported
only when the metadata URL setting is absent.

Validation: 65 tests, build, typecheck, lint and security scan passed. Browser
inspection showed both cards and exact artifact URLs. The local production build
on port 4343 rendered the real live metadata, without per-version JSX changes.
These are local website tests, not production deployment evidence.

Owner action: **Connect Git provider** on the existing trixterms.com Hostinger
deployment page. The final OAuth authorization screen has not been reached. Once
the connection is restored, deploy this reviewed candidate with the existing
Node 24/Next.js settings and preserve unrelated environment values. Set:
`TRIXTER_RELEASE_METADATA_URL=https://floralwhite-stinkbug-872547.hostingersite.com/beta/releases/current.json`.
Verify the production download page and both links afterward.

The public archives and metadata are already deployed on the separate beta host.
They preserve signed sequence 4 and launcher 1.3.3. No newer QA launcher was promoted;
external clean-PC/native-login/runtime acceptance is still outstanding.

Exact artifact URLs, hashes, tests, publisher source and remaining gates are in the
[full distribution handoff](https://github.com/trixtergod3-bot/TrixterMS/blob/codex/public-download-system-01a09fb8/docs/coordination/chats/public-download-system-01a09fb8.md).
Actual website worktree: `local/website-public-download-system-01a09fb8` under the
authoritative TrixterMS Documents checkout. No server, database, DNS or unrelated
Hostinger site changes were made. Proprietary client archives remain outside Git.
