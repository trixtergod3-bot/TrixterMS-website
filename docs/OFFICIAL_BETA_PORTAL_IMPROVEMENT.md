# Official Beta portal improvement — 2026-10-11

IMPLEMENTED: PASS. TESTED: PASS. VERIFIED: PASS for the local production preview. ACCEPTED: PENDING owner visual review. No live deployment, production credential access, DNS, hosting, game runtime, database or /beta patch-file changes occurred.

The homepage now introduces six shared feature spotlights before news/rankings, with clearer getting-started navigation, direct Features access and responsive cards. Explorer/Cygnus, Boss Rush/Slayer, Astral Nexus/Lagoon/Fishing, native Arcane River, progression/cubing/achievements and Free Market/Discord are covered. Cygnus is in testing; Arcane River is an in-development Nameless Town milestone, explicitly not publicly released. Further regions, quests and dailies are not advertised as playable. Current class, Boss Rush, fishing and Nameless Town handoffs and the Slayer service grounded the editorial copy.

The guide and native details/summary FAQ cover account availability, archive extraction, writable folders, verification, disabled PLAY and native manual login. Registration helper copy follows the existing gate. All routes, security controls, data providers, cubing rules and download validation remain intact. Unknown populations stay unknown. Menus support Escape and return focus. Failed ranking polls release their response stream before retrying. Loading/error copy and metadata now explain the visitor's next step.

The approved midnight/navy/cyan artwork is unchanged. Desktop SHA-256: `2C112665A52016B0433FAD8F5EF04EE7E3095ECE9CA78120C21DA36A6B99DB06`; mobile: `8C888E4BB964576B1F526B014D36EC2B31B769427C4F5B45B79FCF00CCD7C9EB`.

## Baseline and verification

Dedicated Git worktree: `C:/Users/Studio PC/Documents/ChatGPT/TrixterMS/local/official-beta-website-improvement-01a12aef`. Branch: `codex/official-beta-website-improvement-01a12aef`. Baseline: `a4625be080622068b59c04ab6f0298e61621c0bf`, containing main `3f612a8ce70cd44398767cca34ffc8809ee3e2ef` plus the existing branded-domain candidate's Next.js 16.3.8 upgrade and exact branded-feed allowlist. These inherited changes are included for review; no feed was published. Shared owner work was preserved.

Verified ignored backup: `local/before-improvement.bundle`, SHA-256 `D79CA73BCB25A6328DF9CB3CBB945721CC71CB03E1818C3E7DF1EDF1E9886DF7`.

Node 24.19.0, npm 11.17.0, Next.js 16.3.8.

| Check | Result |
| --- | --- |
| npm ci with final lockfile | PASS; 54 packages, zero reported vulnerabilities |
| Typecheck, lint, production build | PASS |
| npm test | PASS; 94 tests |
| Bridge/registration contract tests | PASS; 44 synthetic-store tests |
| Source/browser security scan | PASS; zero findings |
| Full and production npm audit | PASS; zero vulnerabilities |
| General browser regression | PASS; 120 route/viewport checks, 30 links/anchors, 10 interactions, zero errors |
| Production verification | PASS; 17 checks, zero errors |
| Synthetic rankings browser regression | PASS; 9 scenarios, 15 intercepted requests, zero page errors |
| Beta polish browser checks | PASS at 320/390/768/1024/1440; artwork, spotlights, service gates, menu/focus, FAQ keyboard and supporting routes |
| Before/after viewer | PASS; 8 desktop/mobile page pairs |

Inherited browser scripts were updated for polling readiness, same-document anchors and the current ranking schema/filter UI. Only the exact disconnected ranking 503 resource message is exempted; its 503/null-data response is separately asserted. Other console/page errors fail verification.

The lockfile selects sharp 0.35.5/libvips 1.3.4 and source-map-js 1.2.2, clearing the initial high-severity [sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) and [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) advisories through compatible transitive updates.

Observed homepage CLS was 0 at all widths; recorded loopback LCP was 464–852 ms, with no third-party resources. Removing unnecessary desktop decorative imagery reduced the mobile transfer observation from about 1.15 MB to 665 KB. These are local measurements, not public-network certification. Actual desktop/mobile screenshots were inspected.

## Review and next safe step

[Interactive preview](http://127.0.0.1:4328) · [Before/after viewer](http://127.0.0.1:4329). Both task-owned loopback processes remain running for owner review. The viewer includes desktop/mobile Homepage, Features, Guide and Download pairs. Before captures use the preserved baseline development render; after captures use the production build.

Ignored evidence: `local/qa/before/`, `local/qa/after/`, `local/qa/browser-report.json`, `local/qa/production-report.json`, `local/qa/beta-polish-report.json` and `local/qa/live-rankings/report.json`. Synthetic ranking screenshots are separate from disconnected portal captures. Screenshots and comparison-server code are local review artifacts.

Restart from the exact worktree with `npm start -- --hostname 127.0.0.1 --port 4328`; restart comparisons with `node local/serve-review.mjs`. Keep integrations/indexing disabled for review.

Owner action: review the feature hierarchy and mobile layout. After acceptance and separate authorization, deploy the reviewed SHA to an isolated hosting preview, retain unavailable service/indexing gates, verify HTTPS/routes/headers and rollback, and inspect /beta routing preservation before considering public cutover. Do not connect this review branch to live automatic deployment.

The durable handoff and directory stay on the isolated branch. Default-branch registration is deferred because a main push may trigger live automatic deployment. No main mutation is part of this local review task; the draft review and branch directory provide discovery.
