> Superseded visual direction. This brief records the earlier autumn/teal/gold concept and is retained only as history. All current implementation and replacement artwork must follow [APPROVED_VISUAL_DIRECTION.md](APPROVED_VISUAL_DIRECTION.md), including the exact public brand TRIXTERMS.

# TrixterMS beta portal: original visual asset brief

Prepared 2026-09-12. This brief defines eleven portal asset slots. Some slots remain reserved for later original art. It does not claim that every slot has a finished illustration or that launcher artwork has been installed in the client.

## Art direction

Build an inviting fantasy world around a floating autumn village, lanterns, stone paths, warm windows and layered islands. Use deep teal shadows, warm cream typography and restrained gold accents. The silhouette and atmosphere should support a Maple-inspired adventure portal while every scene, character, emblem and composition remains original to TrixterMS. Use generous negative space for readable HTML headings and a clear download action.

HempMS is an information-architecture reference only. Do not trace, download, recolor or regenerate from its screenshots, logos, character art or proprietary assets. Do not use extracted MapleStory sprites, WZ images, game logos or screenshots as new original artwork. Use commissioned or newly generated TrixterMS scenes and characters with recorded provenance. Existing game assets require a separate authorized provenance decision.

## Exact asset specifications

Dimensions below are recommended delivery masters; preserve aspect ratios in derivatives. Backgrounds are opaque. Separate foreground subjects need a true alpha channel, with no checkerboard, baked shadow rectangle or solid-color matte. Text, labels, rankings and buttons remain HTML.

| # | Slot and intended path | Master / aspect ratio | Mobile / aspect ratio | Transparency | Placement and composition |
|---|---|---|---|---|---|
| 1 | Homepage hero: `public/art/trixter-world.webp` | 2560 × 1440 / 16:9 | 1080 × 1440 / 3:4 | Opaque background; optional atmospheric overlays may use alpha | Full-width `/` hero behind the wordmark, introduction and PLAY/DOWNLOAD CTA. Keep left 45% quiet on desktop; reserve upper 40% for mobile copy. Place village and lantern focal points toward the right-middle; tolerate a centered crop. |
| 2 | Logo treatment: `public/art/trixterms-wordmark.svg`; optional `trixterms-mark.svg` | Vector wordmark on a 1600 × 400 / 4:1 viewBox; raster fallback 1600 × 400 | Emblem 512 × 512 / 1:1; wordmark retains 4:1 | Required transparent background for all logo files | Header at approximately 168 × 42 CSS px; hero may render at 560 × 140 CSS px; footer at 144 × 36 CSS px. Original lettering and lantern/leaf emblem; no MapleStory logo imitation. Provide cream, dark-teal and single-color variants; leave clear space equal to the emblem's width around lockups. |
| 3 | Launcher background: reserved `launcher-background.webp` | 1920 × 1080 / 16:9 | Optional narrow launcher crop 1080 × 1440 / 3:4 | Opaque background; optional mascot cutout 1200 × 1600 / 3:4 with alpha | Future launcher panel behind patch state and PLAY controls. Keep central-right 50% low detail for controls and lower 20% clear for progress/errors. This is an artwork handoff only; native in-game ID/password login remains the login flow. |
| 4 | Download banner: `public/art/download-banner.webp` | 1920 × 640 / 3:1 | 1080 × 810 / 4:3 | Opaque | `/download` title and current-release introduction. Village gate with an original travel pack/lantern motif on the right. Reserve left 55% for HTML; installation steps and checksum text sit outside artwork. |
| 5 | Rankings header: `public/art/rankings-header.webp` | 1920 × 480 / 4:1 | 1080 × 720 / 3:2 | Opaque; optional podium/emblem 900 × 900 / 1:1 with alpha | Shared heading for `/rankings`, `/rankings/daily` and `/rankings/weekly`. Three original stone plinths and a gold pennant on the right; no baked names, scores, winner portraits or rank numbers. Keep left 60% subdued. |
| 6 | Achievements header: `public/art/achievements-header.webp` | 1920 × 480 / 4:1 | 1080 × 720 / 3:2 | Opaque; optional medal illustration 1024 × 1024 / 1:1 with alpha | `/achievements` header above catalog and progress. Original lantern-shaped medal and parchment journal on the right. Keep left 60% clear; use HTML for points and unlock state. |
| 7 | Database header: `public/art/database-header.webp` | 1920 × 480 / 4:1 | 1080 × 720 / 3:2 | Opaque; optional book/quill cutout 1024 × 1024 / 1:1 with alpha | `/database` header above search and category filters. Original archive shelf, illustrated book and constellation map. Keep center-left 65% quiet; search controls appear in a separate high-contrast surface. |
| 8 | Free Market header: `public/art/free-market-header.webp` | 1920 × 480 / 4:1 | 1080 × 720 / 3:2 | Opaque; optional merchant cutout 1200 × 1600 / 3:4 with alpha | `/free-market` heading above public shop listings. Original canopy, hanging lanterns and crates on the right. No game NPC sprites or baked prices/currency/stock. Reserve left 60% for title and shop context. |
| 9 | Explorer/class and feature panels: `public/art/features/explorer-remaster.webp`; related `public/art/features/{slug}.webp` | Scene 1600 × 1000 / 8:5; separate character 1200 × 1600 / 3:4 | Scene 1080 × 1350 / 4:5 | Scene opaque; separate character/equipment cutouts require alpha | Homepage Explorer Remaster and custom-system cards; class/feature detail pages. Original adventurer archetypes and equipment in teal, cream and gold. Keep lower 30% of cards quiet and avoid fine details below 320 CSS px. Art must not imply a class or system is released; the HTML status label controls that claim. |
| 10 | Demon Avenger promotion: `public/art/features/demon-avenger.webp` | Scene 1600 × 1000 / 8:5; separate original warrior 1200 × 1600 / 3:4 | Scene 1080 × 1350 / 4:5 | Scene opaque; separate warrior/weapon cutouts require alpha | Dedicated homepage Demon Avenger card and class-detail promotion. Commission an original dark warrior silhouette, with restrained garnet light against teal shadows; do not reproduce an existing game sprite, costume or official illustration. Put the figure in the right 45%, keep left 50% and lower 30% quiet for HTML, and retain the visible development/release status. |
| 11 | Discord/community banner: `public/art/community-banner.webp` | 1920 × 640 / 3:1 | 1080 × 810 / 4:3 | Opaque; optional original adventurer group 1600 × 900 / 16:9 with alpha | Homepage community CTA and `/discord` section. Original travelers around a lantern-lit plaza, with left 55% clear for copy. Do not bake an invite URL, live member count or Discord logo into art. An approved service icon, if used, remains a separate UI element. |

## Desktop and mobile crop behavior

Slot 1's hero safe areas are specified above. For the remaining slots, use the following behavior rather than stretching art. Transparent foreground subjects always use `contain`; crop only their separate opaque background. HTML text and controls must remain inside the quiet areas in both compositions.

| Slot | Desktop | Mobile | Safe area that must survive |
|---|---|---|---|
| 2 · Logo | `contain` the complete 4:1 wordmark; never trim letters or emblem. | `contain` the wordmark, or use the separate 1:1 emblem when space is limited. | Preserve the full logo and its emblem-width clear space; no background crop may obscure it. |
| 3 · Launcher | `cover` the 16:9 background with focal point at 25% horizontal / 50% vertical; `contain` any mascot cutout. | Use the separate 3:4 composition with subject in the upper-left third; `cover` its background and `contain` foreground. | Keep the central-right 50% quiet for controls on desktop; move controls to a quiet lower-middle region on narrow layouts. The bottom 20% stays clear for progress and errors in both. |
| 4 · Download | `cover`, focal point 75% / 50%, preserving the gate on the right. | Use the 4:3 recomposition with gate in the lower-right third; `cover` at 70% / 65%. | Left 55% stays quiet on desktop; upper 45% stays quiet on mobile. Installation steps and checksums remain outside the art. |
| 5 · Rankings | `cover`, focal point 78% / 50%; `contain` a separate podium/emblem. | Use the 3:2 recomposition, placing podiums in the lower-right third; `cover` at 70% / 65%. | Left 60% stays quiet on desktop and upper 45% on mobile. Complete podium/emblem silhouettes remain visible; names and scores remain HTML. |
| 6 · Achievements | `cover`, focal point 78% / 55%; `contain` the medal cutout. | Use the 3:2 recomposition with the medal in the lower-right third; `cover` background at 70% / 65%. | Left 60% stays quiet on desktop and upper 45% on mobile. The complete medal must remain visible, with points and progress outside its silhouette. |
| 7 · Database | `cover`, focal point 80% / 50%; `contain` any book/quill cutout. | Use the 3:2 recomposition with archive detail in the lower-right third; `cover` at 70% / 65%. | Center-left 65% stays quiet on desktop and upper 45% on mobile. Search controls stay in their separate high-contrast surface, outside artwork. |
| 8 · Free Market | `cover`, focal point 78% / 55%; `contain` a merchant cutout. | Use the 3:2 recomposition with canopy and crates toward the lower-right; `cover` at 70% / 65%. | Left 60% stays quiet on desktop and upper 45% on mobile. Keep the complete merchant visible; never place prices or shop rules over the subject. |
| 9 · Explorer/class panels | `cover` the 8:5 scene at 70% / 45%; `contain` character/equipment cutouts. | Use the separate 4:5 scene with the subject centered in the upper half; `cover` background at 60% / 40%. | Lower 30% stays quiet on both layouts. Preserve faces, hands and weapon silhouettes; HTML release labels remain unobstructed. |
| 10 · Demon Avenger | `cover` the 8:5 scene at 78% / 45%; `contain` the separate warrior. | Use the 4:5 recomposition with warrior in the upper-right half; `cover` background at 70% / 40%. | Left 50% stays quiet on desktop; lower 30% stays quiet on both. Preserve the complete face and weapon silhouette and keep the release label visible. |
| 11 · Community | `cover` the 3:1 scene at 78% / 55%; `contain` any separate traveler group. | Use the 4:3 recomposition with travelers along the lower half; `cover` background at 60% / 65%. | Left 55% stays quiet on desktop and upper 45% on mobile. Keep faces visible and place the Discord CTA outside the group silhouette. |

## Current hero and provenance

An original hero was generated for this task on 2026-09-12, depicting the floating autumn village and lantern direction above. Its source master is **1672 × 941 px** (1672:941, approximately 16:9). This is smaller than the recommended future 2560 × 1440 master; do not claim it has native 2560-pixel detail or upscale solely to satisfy a filename specification.

- Local-only master: `C:\Users\Studio PC\.codex\generated_images\01a096f8-f33a-7270-bff1-229e9dad7ff2\exec-1d7d6325-4c1f-4b47-bdc2-fe33f532bf58.png`.
- Master SHA-256: `DC8A1A9FCC6FA3F857CFE16DDC480C3403C2C2CAF0EB3F628465C0DEB009617E`.
- Website derivative: `public/art/trixter-world.webp`, optimized from that master by this lane.
- Role: decorative original concept artwork, not a screenshot or evidence of an implemented in-game map.
- Current mobile presentation may crop this master. A separately composed 3:4 mobile hero remains a future art deliverable.

Website V2's inherited `world-key-art.jpg` has SHA-256 `5BDA9FFCF232A207F95976FB29322309A6643DD31226CC5435DF31F4BC2A9526` and dimensions 1440 × 810. It remains preserved in the unchanged source worktree. Its original generation receipt was not found; it is not the provenance source for the new hero. The original typography/CSS treatment and decorative UI can fill uncommissioned slots without presenting unfinished art as delivered.

## Export and implementation rules

Deliver sRGB masters as layered source files where available, plus lossless PNG; optimize web backgrounds to WebP or AVIF. Keep the local master, prompt/commission reference, creation date, author/tool and SHA-256 in the asset record. Repository content should include only the web derivative and a concise safe provenance record. Do not commit generation caches or unrelated local files.

Recommended budgets: hero derivative at most 300 KB, route headers at most 160 KB, feature scenes at most 160 KB each, wordmark under 25 KB. These are targets to verify after visual inspection, not assertions about current file sizes. Export responsive widths of 640, 960 and 1672 for the current master; use up to 2560 only when a native-size master exists. Set explicit dimensions to avoid layout shifts. Load the visible hero eagerly and below-fold artwork lazily.

Keep decorative image alt text empty. Give informative standalone character or feature art a short description when the image adds meaning beyond the nearby heading. Respect reduced motion; use no flashing light or autoplay video. Verify text contrast against the darkest and brightest parts of the image at 360, 390, 768, 1280 and 1440 CSS px viewport widths before release.
