# Website source discovery and migration

Inventory date: 2026-09-12. The authoritative TrixterMS development workspace is `C:\Users\Studio PC\Documents\ChatGPT\TrixterMS`.

## Selected source and destination

The recommended existing source is:

`C:\Users\Studio PC\Documents\ChatGPT\TrixterMS\local\worktrees\trixterms-website-v2\website`

Website V2 has the most complete portal, typed data providers and local public-read implementation. Its source worktree is preserved unchanged. The independent beta-portal repository is assembled at:

`C:\Users\Studio PC\Documents\ChatGPT\TrixterMS\local\web-portal-beta-v1`

Target repository: `trixtergod3-bot/TrixterMS-website`. Target branch: `codex/web-portal-beta-v1`. The migration is a reviewed website-source copy, not a merge of the game repository's history. No direct push to `main` is part of the task.

## Existing candidates

Every candidate below had a clean Git working tree when inspected. Exact paths and commits allow recovery without relying on the new repository.

| Candidate | Exact source directory | Branch | Inspected HEAD | Findings |
|---|---|---|---|---|
| Website V2 | `C:\Users\Studio PC\Documents\ChatGPT\TrixterMS\local\worktrees\trixterms-website-v2\website` | `codex/trixterms-website-v2` | `3b59bf05d78750c8a3cb14d871aeda448d3f6ac4` | Selected foundation; portal routes, typed public-read provider, fixtures, local API, tests and detailed architecture. |
| Website UX remaster | `C:\Users\Studio PC\Documents\ChatGPT\TrixterMS\local\worktrees\website-ux-remaster\website` | `codex/website-ux-remaster` | `e9ec22c3312a17acb2e315285fd93199ea37a080` | Descends from V2; only homepage, CSS, header and footer differ. Useful large-hero design reference; its homepage omits several requested portal previews. Preserved independently. |
| Website foundation V1 | `C:\Users\Studio PC\Documents\ChatGPT\TrixterMS\local\worktrees\website-foundation-v1\website` | `codex/website-foundation-v1` | `e936c84c7dc053ff898d6a7198f9b905c938941a` | Earlier responsive fixture-backed ranking/profile foundation, subsequently recovered into V2. |
| Earlier standalone M0/M1 | `D:\TrixterMS-Website` | `codex/website-m0-m1` | `9d63c583fd3678abcf98234054434c526576c609` | Independent Next.js 16.3.3 / React 19 / TypeScript project; structured feature content, SEO surfaces and mock telemetry. No configured remote. Preserved unchanged. |

V2 recovered V1's `website/` and `docs/website/` at `a6dff30`, then added the portal at `eb19cfb` and localhost public reads at `3b59bf0`. The UX remaster is a later visual variant, not a replacement source of backend truth.

The similarly named local branch **`codex/codex/trixterms-website-v2` is not Website V2 source**. Read-only `git show-ref`, `git show` and `git ls-tree` checks resolved it to `fa1682b600dac2864d62cc83b619c9a113372352`, titled `feat(beta-launcher): prepare isolated Explorer RC feed`. It contains no `website/` tree and `website/package.json` does not exist at that ref. The double-prefix name must not be selected for website recovery or deployment; the valid source is `codex/trixterms-website-v2` at the commit in the table above.

## What V2 already contained

- Homepage, rankings, player search, character profiles, status, classes, features, download, onboarding guide, news, patch notes, community and Discord routes.
- Prepared daily rankings, achievements, database, rare-drop, boss-record and world-event surfaces, mostly fixture-backed.
- React 19, TypeScript, Next.js App Router conventions, hand-authored responsive CSS and Lucide icons.
- Vinext/Vite build tooling with Sites/Cloudflare integration, plus lint, type checks and Node test suites.
- A localhost-only read API for status, rankings and character lookup, with safe DTOs and filtering. Its local database configuration discovery is a development mechanism, not an approved public-hosting backend.

V2's historical audit describes its then-current local database. Those old counts and release states must not be presented as September 12 production facts. Current implementation and API documentation in this repository supersede the historical audit where they differ.

## Migration decisions and preservation

The beta portal retains the React/App Router component model and adapts the foundation to **Next.js 16.3.3, React 19 and TypeScript** for a managed Node deployment. Vinext, Cloudflare Worker output and Sites-specific build coupling are removed from the new application. Existing provider boundaries and tests inform the adaptation; public capabilities continue to use explicit availability and fixture states.

Original worktrees, the independent D-drive repository and their commits remain untouched. The new repository owns its package lock, build configuration, expanded beta routes and reviewed documents. The game repository's uncommitted work, local database and client patches remain outside this migration. The original worktrees themselves are the preserved baseline; any additional backup artifact is reported separately by the lane rather than assumed here.

Excluded from publication: `.git` directories from source projects, dependencies, build outputs, runtime/configuration files, proprietary game binaries, WZ images/extractions, databases, credentials, account/player logs, and unrelated repository history. The new hero uses an original generation from this task; see [the visual asset brief](TRIXTERMS_WEB_VISUAL_ASSET_BRIEF.md). Inherited artwork remains preserved in the original worktrees rather than being treated as evidence of a new commission.

## Search coverage and caveats

Read-only filename and source searches covered Documents, Desktop, the configured Downloads location, `D:\Downloads`, `F:\DOWNLOADS`, `D:\ChatGPT`, `D:\Projects-Archive`, `D:\CodexWorktrees`, `F:\CodexWorktrees`, `F:\TrixterMS` and local Codex worktrees, excluding dependency/build directories where appropriate.

The configured `C:\Users\Studio PC\Downloads` directory did not exist. `F:\DOWNLOADS\project` is an unrelated React 18/Vite 5/Supabase starter; no TrixterMS or MapleStory references were found in its source. Other Bolt archives found belonged to unrelated Noetic work. No additional TrixterMS website source was found in accessible locations.

`F:\TRITER MS` and several private runtime directories denied read access. This is an inventory of accessible project sources, not a claim that every disk byte was inspected. Private `.beta` Hostinger configuration and the safe `tools/patch-publisher/hostinger-beta.htaccess.template` concern the existing patch publisher, not a deployable portal. They were excluded from migration.

## Remote and hosting evidence

The connected GitHub integration reported the private `trixtergod3-bot/TrixterMS-website` repository with zero size and no branches at initial inspection. That establishes its initial empty state. Earlier command-line checks returned HTTP 401 from `gh` and a Windows Schannel credential error from Git; the connector observation does not prove that CLI publication works.

Final publication must record the actual pushed branch and verified remote commit in the lane handoff. This document deliberately does not invent a final SHA or imply that the initial empty state remains true after publication. The separate Hostinger setup, private-repository access and `/beta` preservation requirements are documented in [HOSTINGER_DEPLOYMENT.md](HOSTINGER_DEPLOYMENT.md).

Historical V2 architecture/audit documents and screenshots were excluded from the migrated publication tree. They remain unchanged in the original worktrees. They describe obsolete runtime fixtures and some local-only observations; the new API document supersedes them. Reused algorithm tests use synthetic names only.
