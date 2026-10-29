# Live character rankings cards and appearance bridge

Status: **BLOCKED**. Website source is implemented and locally tested; real Linux database/API connectivity is not verified, and no production deployment occurred.

- Source checkpoint: `53a837ec92024305b8a4695c88d9252d3e3febb8` on `codex/live-rankings-avatars-01a14`.
- Worktree: `C:\Users\Studio PC\Documents\ChatGPT\TrixterMS\local\live-rankings-avatars-01a14`.
- Existing ranking bridge, website registration and download flows were preserved.

## Implemented

The rankings page uses horizontal cards, gold/silver/bronze top-three badges, job/level/guild/EXP/fame, exact character-name search, pagination, outage retention, and 60-second polling. Character detail lookup uses the existing public characters endpoint. Cards and profiles explicitly say appearance is not connected; the background uses environment art only. No static artwork is presented as a player avatar.

The public bridge currently exposes no saved hair/face/skin or equipped-item IDs, and no compatible v111.1 web renderer was found. The reviewed character schema has no playtime field. These dependencies remain unimplemented pending secure schema/query qualification and renderer selection.

## Verification

- 95 website tests passed; TypeScript and lint passed.
- Production build passed on Next.js 16.4.3; `npm audit` reported 0 vulnerabilities.
- Security scan: 176 publishable text files, 57 browser bundles, 0 findings.
- Local production preview returned HTTP 200 for `/rankings`, `/character/PineArrow` and `/download`; the rankings API returned 503 with no data because bridge configuration is absent. The preview was stopped.
- Public production read checks: `/rankings` and `/register` HTTP 200; `/api/rankings?limit=1` HTTP 503; `/api/public/rankings?sort=level&page=1&limit=1` HTTP 400. Website and game services were not changed.
- No real database rows, appearance IDs, renderer, end-to-end character changes, or owner acceptance were verified.

## Next action

The existing Linux owner validates the current MariaDB schema and least-privilege bridge in the administrator session. Then the website owner connects an isolated Hostinger preview and proves real-data creation/progression, pagination, outage handling, and public-field safety. Publish only after those checks pass.
