# TRIXTERMS approved visual direction

Recorded 2026-09-12 for `codex/web-production-candidate-v1`. This document records the owner's latest approved design direction for the production candidate. The owner-generated reference mockup establishes the composition and atmosphere below. This direction supersedes the earlier autumn-village/green-and-gold portal treatment where they conflict.

**Direction approved; completed candidate owner QA pending.** Approval of the reference does not mean the current responsive implementation, artwork derivative, live integrations, launcher release or public deployment has been accepted. Keep those evidence and acceptance states independent.

## Selected candidate and preview

The owner reaffirmed this midnight/navy and electric cyan direction on 2026-09-12 after multiple website candidates had been prepared. Use **`codex/web-production-candidate-v1`** in `local/web-production-candidate-v1`, with the local production preview at **http://127.0.0.1:4316**. Its implemented website source checkpoint is `0c7e134e87cf07af57611da08330fc982068da99`; later documentation-only checkpoints do not change that application build.

The separate `codex/website-final-beta-visual-pass` candidate and port 4315 retain the earlier autumn/village treatment. They do not replace this approved visual target. Preserve their work separately; evaluate any useful functional fixes before applying them to the selected candidate while retaining this document's artwork, palette, branding and route requirements. A branch name containing “final” does not override the owner's visual lock.

This selection does not authorize a main merge, hosting deployment, DNS change or public cutover. The finished responsive candidate still needs its own owner acceptance.

## Public name

The public brand is **TRIXTERMS**, one word, all capital letters. Use that exact spelling in the primary wordmark and every public mention of the brand: header/footer, page copy, navigation context, buttons, accessible names, image descriptions, browser titles, metadata, social cards and player-facing documentation.

Keep technical identifiers unchanged: repository names and URLs, local paths, package names, branch names, environment variables, API fields, schema identifiers and existing executable/artifact filenames retain their exact operational values. A branding pass must not break a route, download URL, manifest reference or integration contract.

## Composition and atmosphere

The approved direction is a fantasy game portal with a midnight/navy foundation and luminous cyan-blue magic. The page should feel like an invitation into an illustrated game world.

| Element | Approved treatment |
| --- | --- |
| Palette | Midnight and navy backgrounds, cyan/ice-blue highlights, layered blue light and readable pale text. Preserve the nighttime treatment across all routes and loading/error/empty states. |
| Left foreground | Original chibi adventurers or creatures with friendly game-like proportions, framing the scene from the left. |
| Sky | A visible moon above the main composition, atmospheric stars/mist and blue magical light. |
| Right world | Floating islands, castles, waterfalls and a luminous portal, with depth behind the content. |
| Center | A prominent HTML **TRIXTERMS** wordmark over deliberate quiet space in the artwork. |
| Primary actions | Clearly visible, functional **PLAY NOW** and **REGISTER** actions using the real download and registration routes. |
| Content panels | Blue magical/translucent panels for account/getting-started actions, world/server status, news, events and rankings. Provide enough fill/contrast for text to remain readable over the art. |
| Supporting UI | Cohesive blue borders, glows, tabs, form controls, badges and focus states; restrained motion that respects reduced-motion preferences. |

The earlier green visual fallback is not part of this direction. Do not restore it for a secondary page, empty state or mobile breakpoint. Original art must remain independent of HempMS or other private-server branding, illustrations, sprites and source code. Reference portal information architecture may inform usability; it does not authorize copying assets.

## Real application implementation

The current candidate's original background asset is served at **`/art/trixterms-midnight-world.webp`**, from `public/art/trixterms-midnight-world.webp`. It is a separate decorative background. The logo/wordmark, navigation, text, actions, data and panels remain real HTML/CSS/React components.

Do not use the reference screenshot as the website, bake the complete interface into an image, or overlay nonfunctional hotspots over a screenshot. Users must be able to select text, operate links/forms, navigate by keyboard and use the page at mobile sizes. Treat the image as concept artwork, not evidence of an implemented in-game area or released class.

Preserve every existing primary and secondary route and its current functionality while applying the direction. Primary sections remain Home, Download, Register, Rankings, Achievements, Database, Free Market, Vote, Donate and Discord. Retain news, character profiles, server status, patch notes, daily/weekly views and existing supporting routes/redirects.

Status, online counts, channels, rankings, achievement unlocks, events and account panels must reflect actual supported data and availability. An account panel may offer registration/getting-started actions; it must not fabricate a signed-in account. Unknown populations remain unknown. Unconnected feeds remain visibly unavailable. Future tournaments, events, vote/payment providers and unpublished downloads retain truthful disabled or planned states. Design polish does not authorize invented players, winners, balances, release claims or credentials.

## Responsive composition

Desktop retains the left chibi foreground, moon above, quiet center wordmark/actions and the right-side world. Panels should visually belong to that scene without hiding required navigation or turning the page into a wall of unreadable glass.

The shipped mobile hero uses `/art/trixterms-midnight-mobile.webp`, a separate original portrait composition with the complete adventurer and companion at lower left and a visible portal at lower right. Future mobile artwork must keep these subjects recognizably in frame. Prioritize the centered brand, primary actions, moon/magic atmosphere and useful content. Reposition or reduce decorative foreground elements when necessary; keep text and controls in HTML with clear contrast. Stack panels in a useful reading order, preserve navigation access and avoid horizontal page overflow. Do not shrink the desktop mockup into a single small image.

Verify the hero, navigation, panels, empty/error states and forms at 320, 390, 768, 1024 and 1440 CSS pixels. Inspect actual screenshots and interaction behavior; a passing build or matching colors alone is not visual QA.

## Background replacement contract

A replacement for `/art/trixterms-midnight-world.webp` must preserve the approved composition and nighttime palette while remaining a textless, original asset:

- Keep the center sufficiently quiet for the HTML wordmark, supporting copy and primary actions. Do not fill this negative space with high-contrast faces, architecture or light beams.
- Preserve the left chibi framing, moon above and right-side floating islands/castles/waterfalls/portal. Create original characters and creatures rather than importing recognizable game or competitor art.
- Include no baked **TRIXTERMS** lettering, branding, navigation, button labels, statistics, panel copy, screenshots, watermark or interface elements.
- Retain sufficient dark background behind HTML content. Test desktop/mobile crops before replacing the shipped derivative; preserve responsive behavior and avoid clipping important faces or the central title area.
- Record the actual source dimensions, creation provenance, master/derivative hashes and export settings in the artwork record. Do not claim higher native resolution or owner acceptance from an upscale or a new generation alone.
- Keep the web derivative separate from local generation caches and source masters. Only approved publishable artwork belongs in website Git; no proprietary MapleStory/WZ extraction belongs in the asset pipeline.

## Acceptance record

The owner has approved this **direction and naming rule**. The candidate still needs its own responsive visual review, route/interaction checks, metadata/branding check and owner acceptance. Record the candidate's actual QA results and release SHA in its current receipt; do not reuse predecessor screenshots or infer deployment, live backend readiness, client acceptance or native-login verification from design approval.
