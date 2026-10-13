# TRIXTERMS — Astral ascent homepage

Prepared 2026-10-13. Reuses the original artwork from this chat's abandoned Genesis domain prototype for the existing TRIXTERMS portal. The domain-sale copy, private email inquiry and registrar/hosting setup are not part of the player website.

## Player experience

The homepage opens with Demon Avenger suspended in chains in the abyss. Visitors can scroll through the 58-second ascent or press **Play the story**. Genesis breaks the chains; Holy Symbol accompanies Demon Slayer's awakening; dark wing fragments fall away as ivory feathers emerge; Angel Avenger reaches Astral Nexus. The final message is **Your story. Begins here.**

The existing site navigation remains visible on the homepage, including Play now and Register. Explore classes and player links are available inside the cinematic. **Enter the portal** immediately reaches the existing account, server-status, news, rankings and community sections. The story is explicitly a class-concept cinematic; it makes no new release or gameplay claim.

The cinematic is a client component inside the existing Next.js page. Its canvas assets are original generated artwork and the owner-supplied world concept. No game archive, executable, donor frame, extracted WZ data or private configuration is included. There are no new external services or dependencies for animation. `docs/ASTRAL_ASCENT_ART.json` records asset hashes and geometry.

Reduced-motion visitors see the final scene without autoplay. An explicit Reduce motion control offers the same behavior. Playback stops on user scrolling, hidden tabs, off-screen scenes and route navigation. Event listeners, observers and animation frames are cleaned up when leaving the homepage. A homepage-only overflow correction allows sticky positioning; other routes retain their existing header behavior.

## Source and preservation

Source lane: `codex/astral-ascent-01a132d1`, based on `a4625be080622068b59c04ab6f0298e61621c0bf` from the clean website checkout. The separate `codex/official-beta-website-improvement-01a12aef` owner-review lane is preserved and not silently promoted.

Owned changes are the homepage hero, one stylesheet import, scoped cinematic CSS/component/model/engine, four original art assets, artwork/coordination documents, generated Next.js agent guidance, and the narrow dependency lock repair. Existing download, registration, rankings, status, account, game login and backend gates are retained. The independent `/beta` patch feed, game/runtime, databases, keys, host configuration and DNS are unchanged.

Dependency checks found inherited advisories in sharp 0.35.4 and source-map-js 1.2.1. The lockfile now uses sharp 0.35.5 (and its matching platform/libvips packages) and source-map-js 1.2.2 within existing allowed dependency ranges. No framework or direct dependency version was changed by this lane.

## Verification and deployment boundary

Run `npm ci --include=dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm audit`, `npm run build`, and `npm run check:security`. Browser evidence is kept in ignored `local/qa/` and summarized in this chat's coordination handoff. The local preview binds only to 127.0.0.1 on port 4317.

The public https://trixterms.com/ homepage returned HTTP 200 and matches the existing unpolished hero structure. Its exact deployed Git SHA and connected branch are not exposed by the page. Historical receipts identify older production source; later branches contain previously unobserved API/registration/download work. Therefore, deploying the entire candidate branch without current hPanel verification could expand the requested homepage scope.

Before live integration, inspect the actual Hostinger Node app, deployed SHA, connected branch, existing environment and `/beta` routing; prepare a targeted rollback. Apply the reviewed homepage changes to that verified production baseline and rebuild with the required security repair. Preserve all unrelated provider/account settings and services. A source checkpoint or local preview is not a live deployment receipt. No DNS change is needed merely to replace the homepage of the existing domain.
