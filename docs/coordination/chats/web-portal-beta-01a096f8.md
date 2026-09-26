# Build TrixterMS beta portal

Exact task title retained for coordination. Current scope: **TRIXTERMS final beta visual pass**, 2026-09-12.

Status: **OWNER_QA — ready for OWNER VISUAL ACCEPTANCE**. Implemented, tested and locally verified; owner acceptance and deployment remain false.

- Repository: `trixtergod3-bot/TrixterMS-website`
- Worktree: `C:/Users/Studio PC/Documents/ChatGPT/TrixterMS/local/web-portal-beta-v1`
- Verified baseline main: `81856c608dab33346f8f915dcd5219c893f09e01`
- Candidate branch: `codex/website-final-beta-visual-pass`
- Verified source checkpoint: `0c8e2f41212af8d7893f3748dbffc7a504c6cf9d`
- [Machine-readable record](web-portal-beta-01a096f8.json) and [complete eight-part report / exact file list](../../FINAL_BETA_VISUAL_PASS.md)

## Changes and evidence

Public brand copy, metadata, social previews, accessibility labels and the continuous wordmark use exactly **TRIXTERMS**. Technical identifiers, routes, APIs, environment names and form behavior are unchanged. The favicon matches teal/gold. Small-screen fixes keep PLAY NOW on one line and give Explorer Remaster/Demon Avenger text the full panel width. Original floating-village artwork, hero crops, desktop/tablet layout and working portal functions are preserved.

`npm ci`, typecheck, lint, all 45 tests, production build and security scan pass. The clean install reports zero vulnerabilities. The final browser suite passes 120 route/viewport checks and 120 branding checks at 1440, 1024, 768, 390 and 320 pixels; 26 links, 10 interactions and one favicon pass, with zero page/console errors. Screenshots confirm readable hero/CTA, class panels and unavailable states. Security scanning covers 99 publishable text files and 53 browser bundles with zero findings. The initial locked Next.js install was resolved by stopping only the website preview; all required final checks passed.

Local production preview remains `http://127.0.0.1:4315`. Screenshot/report files remain ignored in `local/qa/`. The pre-change Git bundle in `local/backups/before-final-visual-pass-81856c6.bundle` was verified; SHA-256 `AF0D2B2177AD7E3DB148E9863CA1EEE5AA66798044EA2EF08A52548724B3F7D1`. Hero SHA-256 remains `9B278D9EA860AA93021A66A15B119B7A54E4B92B6399A12C399E4A90F5F9BF04`.

## Blockers, owner QA and next step

The visual candidate is ready for owner review. Live reads, registration, downloads, Discord and providers remain unavailable/disabled until real configuration and reviewed services exist. No fake production players or competition results are shown. Hostinger plan/access, repository authorization and safe preview settings remain unverified; existing `/beta` routing and rollback must be proven before production cutover.

After owner visual acceptance, review/merge this candidate into website main and verify its SHA, then separately authorize a Hostinger Node/Next.js preview. Use Node24, root `.`, `npm ci --include=dev`, `npm run build`, output `.next`, `npm start` and platform `PORT`; keep live-service flags/indexing off. No hosting connection, deployment or DNS change happened here.

The owner's explicit website-only instruction takes precedence over the inherited shared game-registry workflow for this turn. No game-server repository, database or runtime was modified. Coordination is kept in this website's `local/coordination/web-portal-beta-01a096f8.json` and published lane directory. The external game chat-directory still points to the earlier portal checkpoint; it was deliberately not edited. Readers should use this website branch and directory for the final visual candidate.

The ignored website-local record stores the final handoff SHA after remote verification. This committed file cannot contain its own SHA; obtain it from Git history.
