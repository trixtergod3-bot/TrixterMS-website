# Implement website registration V1

Status **BLOCKED** only on production access/deployment and final acceptance. Owner explicitly directed completion without production deployment.

IMPLEMENTED=true; TESTED=true; VERIFIED=false; ACCEPTED=false; DEPLOYED=false.

Repository: `trixtergod3-bot/TrixterMS-website`. Branch: `codex/website-registration-v1-01a09c08`. Source checkpoint: `109d7cc56dade0801954c93ddd9e1a883ddc6811`, verified on GitHub. Development checkout: `C:/Users/Studio PC/Documents/ChatGPT/TrixterMS/local/website-registration-v1-01a09c08`. Base is the approved production candidate `7abc5c3`; no unrelated telemetry or launch-flow branch merged.

Implemented a separate loopback registration service behind the existing Next.js `/api/register` gateway. Normal-player account insert uses the unchanged native salted SHA-512 format, prepared statements, unique-key protection and transactional persistent rate limits. Startup verifies grants, schema and the limiter key. Existing page design retained; secrets clear after submissions/errors and synchronous duplicate submits are blocked. No email, auto-login, native-auth change or production account creation.

Files: `components/portal/registration-form.tsx`; `registration/.env.example`, `package.json`, `package-lock.json`; five modules under `registration/src`; `registration/tests/registration.test.mjs`; the local integration harness and Java password probe under `registration/tools`; `docs/WEBSITE_REGISTRATION_V1.md`; this JSON/MD and directory entry.

Validation: 58 website tests; six backend groups; production build; typecheck; lint; real browser -> Next.js -> authenticated HTTP service -> isolated MariaDB -> actual Java password verifier. Verified safe default fields, case-insensitive duplicates, restricted grants, missing-limiter-key rejection, persistent limits, ten extra concurrency rounds, generic DB failures, and browser mismatch/duplicate/429/503/unexpected responses with cleared passwords and a single request from two rapid submit events. Security scan: 124 publishable text files, 55 production browser bundles, zero findings. Earlier dependency/cache, Java sandbox, cleanup and concurrency/lint failures are documented with their fixes in the runbook.

Local-only artifacts: `registration/local/test-db` (synthetic test database), `registration/local/java` and copied MINA dependency (compiled verifier), `registration/local/registration-mobile-duplicate.png` (synthetic browser evidence), node_modules and .next. No database, Java dependency/binary, credentials, game assets or sensitive logs published. Next dev generated local untracked AGENTS.md/CLAUDE.md; they are not part of the checkpoint. Temporary preview and task-owned database were stopped; existing game processes unchanged.

Blocker: owner confirms no verified administration session on authoritative `trixterms-beta-host`; Hostinger deployment provider remains disconnected. No production schema, firewall or deployed login revision is claimed verified. Existing first-login registration policy needs confirmation on that host before activation. Website release selection must be reconciled with any newer owning lane without overwriting its changes.

Minimum owner action: restore the beta-host admin session and existing Hostinger Git deployment. Follow [the account contract, environment inventory and deployment runbook](../../WEBSITE_REGISTRATION_V1.md). Then perform one clean-laptop production canary: register fresh credentials on trixterms.com, confirm one normal row privately, Update/Play through the approved launcher, and authenticate using the same credentials on the native MapleStory screen with LOGIN_PASSWORD observed. Never send credentials into task text. That gate remains unperformed.
