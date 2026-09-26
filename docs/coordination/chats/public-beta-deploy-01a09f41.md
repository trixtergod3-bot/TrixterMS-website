# Deploy Public Beta download

Status: BLOCKED, 2026-09-14. Production remains at `7abc5c3882370a50232d12ab82017083881a09d0`; no Hostinger deployment or environment mutation occurred.

Hostinger shows the existing Next.js application, Node 24, root `./`, last successful deployment September 12, and a disconnected Git provider. Automatic approval review rejected **Connect Git provider**, requiring explicit account-specific repository-access authorization. A repository-only approval question is pending. No alternate deployment path was used to bypass that rejection.

GitHub main was verified at required commit `5775e260707709b54e64689c56a9ee42d63a52f8`. It does not include the currently deployed midnight design, canonical routing or production safeguards. The source checkpoint `77aafe572151e8660bb7afcb22dbf41feaa3cc6d` merges that observed production source into main's ancestry and preserves the requested QA ZIP link. Published and remotely verified on `codex/public-beta-deploy-01a09f41` in `TrixterMS-website`; main is unchanged.

The requested QA ZIP was downloaded and its SHA-256 verified as `78107EF1E9F732F357DB24AEBBF5FBFA621465420AD4E08353A25A61BD749293`. Its helper requires an existing complete game installation. The download page now explains this and preserves the metadata-driven Windows launcher as the fresh-install route. The existing published 1.3.3 launcher was downloaded and verified against its published size and hash. Activation still requires the existing `TRIXTER_RELEASE_DOWNLOADS_JSON` setting from the patcher's `docs/releases/explorer-beta-public-downloads.json`.

Validation: 58 website tests passed, followed by all three focused download tests after the additional QA-package test; production build, typecheck and lint passed. Security scan covered 112 source text files and 55 browser bundles with zero findings. Local production checks: 16 passed. Download flows: 1440, 390 and 320px passed, including exact launcher URL, checksum and no overflow. These are local results, not production acceptance.

The independent patch origin is `https://floralwhite-stinkbug-872547.hostingersite.com/beta/`. Health returned `ok`; sequence 4 ECDSA signature verified; approved native-login executable pin matches; representative payload hash verified; byte-range response was HTTP 206. The manifest remained unchanged at SHA-256 `C7CDE54CD482B87F4381759CA038C98FE41B9E09E81A57783B9EDC21F15B3395`. The website's own `/beta/manifest.json` already returns 404 and is not the established feed. No hosted files, patch payloads, routes or game processes were changed.

Actual development checkout: `C:/Users/Studio PC/Documents/ChatGPT/TrixterMS/local/website-public-beta-deploy-01a09f41`. Source differences from observed production are the download route, focused tests and download-flow verifier. Existing production assets are retained; no proprietary game files are published. Ignored evidence and downloaded artifacts are under `local/public-beta-deploy-01a09f41`; local website reports are in the checkout's `local/qa`.

Next action after scoped approval: reconnect the existing provider for this repository only, promote the tested checkpoint to main, configure the reviewed public release metadata, deploy the existing production app, and verify public homepage/download clicks plus patch readback. Required external-PC install, native credential screen, server `LOGIN_PASSWORD`, normal quit and repeated PLAY remain unverified. Owner acceptance and deployment flags remain false.

Directory registration is on this website lane branch while main promotion is pending; default-branch discovery is not yet complete. Machine-readable evidence: [status](public-beta-deploy-01a09f41.json).
