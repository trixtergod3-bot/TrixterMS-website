# Website registration V1

Status: implementation and local verification complete; production deployment blocked and explicitly deferred by the owner. VERIFIED=false, ACCEPTED=false. No production account was created.

## Architecture and source authority

Browser -> existing same-origin `POST /api/register` in Next.js -> authenticated HTTPS registration service -> loopback MariaDB on the authoritative beta host. The browser never receives database connectivity or service secrets. The service listens on `127.0.0.1:4317`, route `POST /api/register`; publish only this route through a TLS reverse proxy. Database port 3306 stays private.

Website base: owner-approved midnight production candidate `7abc5c3` in `trixtergod3-bot/TrixterMS-website`. It already contained `app/register/page.tsx`, the registration form and the CSRF/origin-checked API proxy. This lane uses an isolated branch and preserves that design and unrelated download/telemetry behavior. Later launch-flow and telemetry branches are separate lanes and are not merged here. Before deployment reconcile the selected website release with its owning lane.

Production website is the existing Hostinger Node deployment for trixterms.com. Latest coordination evidence reports its Git provider disconnected. The authoritative game/database host remains `trixterms-beta-host`; the owner confirmed no verified administration path is restored. No live schema, deployed auth revision, firewall, HTTPS routing or settings are claimed inspected. Local Windows Java/MySQL processes are not evidence of beta-host authority and were left untouched.

Earlier account work: `server/src/handling/login/AccountRegistrationService.java` implements an isolated JDBC writer, not a public API. Existing rankings bridge uses a loopback Node/MariaDB design with a SELECT-only database identity. Registration follows the same process boundary but uses a separate service, token and writer identity; it never expands the rankings reader's grants. No mandatory beta invitation mechanism was found in the inspected registration source or its readiness document; no invite code was added. No email, password reset, game auto-login or authentication migration is introduced.

## Account contract and evidence

Authoritative development source inspected:

- `server/src/client/MapleClient.java`: parameterized `accounts.name` lookup and `LoginCrypto.checkSaltedSha512Hash` in native login; banned/logged-in checks remain authoritative.
- `server/src/client/LoginCrypto.java`: lowercase hexadecimal SHA-512 of UTF-8 `password + salt`. New salt is 16 cryptographically random bytes, represented as 32 lowercase hex characters. Only ASCII passwords are accepted, matching the existing writer and avoiding the legacy Java character/byte-length ambiguity. This is compatibility with the existing format, not a change to its cryptographic strength.
- `server/src/handling/login/AccountRegistrationService.java`: IDs 4–13 ASCII alphanumerics, passwords 8–32 ASCII characters in `!` through `~`, no spaces; explicit normal-player insert fields.
- `server/sql/seperate/1-accounts.sql`: name varchar(13), password varchar(128), nullable salt varchar(32), unique name index. The complete AIO schema additionally makes id AUTO_INCREMENT. The separated accounts file alone does not establish auto-increment; startup refuses its absence. Never import its historical seed data into production.

No trimming, case conversion or password normalization occurs. Database collation decides username equivalence; the source is latin1 and the isolated test used latin1_swedish_ci, where case-only duplicates collide. Confirm the actual production collation and unique index before activation. Rate-limit username keys are lowercased conservatively, without changing stored IDs.

Insert explicitly sets `gm=0`, `banned=0`, `greason=1`, `NxPrepaid=NxCredit=mPoints=points=vpoints=0`, `PicEnabled=0`. No privilege/status/currency field is accepted from callers. id is generated. Source defaults: loggedin/gender/vote counters zero; createdat and birthday current timestamp; lastlogin/lastlogon/tempban/banreason/email/macs/SessionIP/lastvoteip and PIC fields nullable. No character is created. Startup verifies transactional storage, auto-increment, unique name, credential column types, critical zero/null defaults and limiter table access.

Legacy password acceptance/migration, launcher auth and first-login auto-registration code remain unchanged. The prior readiness audit flags first-login auto-registration as a separate release review item: the beta-host operator must confirm its deployed policy before enabling website registration. This lane does not silently modify native authentication or claim that policy is resolved.

## API and security

Existing public request: `{ username, password, passwordConfirmation, website: "" }`; the last field is the existing honeypot. Private service receives only the first three fields. Responses contain only `code`: 201 ACCOUNT_CREATED, 400 INVALID_REGISTRATION, 409 USERNAME_TAKEN, 429 RATE_LIMITED, 503 REGISTRATION_UNAVAILABLE. Unauthenticated/malformed service calls are rejected. Database exceptions and ambiguous upstream replies become unavailable, without automatic retries.

Protections: production HTTPS configuration; exact canonical origin and signed double-submit CSRF; authenticated edge client-IP assertion; no permissive CORS; constant-time service-token comparison; 4096-byte body cap and read deadlines; server-side validation at both hops; restricted connection counts/pool/query timeouts; SQL parameters; a single transaction for rate budgets and account insert; unique-key race handling; no raw exception/body/header/password logs. Logs contain only fixed event, status and code. Frontend clears both password inputs immediately on submit, including mismatch and errors; a synchronous ref prevents duplicate submissions before React renders.

Persistent backend limits use database time and transactional row locks: 100 valid attempts globally/hour, 5 per authenticated client address/hour, 3 per normalized ID/hour. Counters survive process restart and are shared by replicas using the same database and rate secret. Store HMAC digests, not account names/IPs; prune old buckets in bounded batches after global admission. Fixed-hour boundaries can admit adjacent-window bursts; the existing website rolling window and the service's 60-request token bucket add protection. IP changes are still subject to the global budget. Adjust capacity only after measured beta traffic and abuse review.

No Turnstile dependency is added: deployment routing/provider capability is not yet verified. Existing authenticated edge guard plus persistent backend limits are the implemented baseline. Do not assert a reviewed gateway solely by setting its environment marker; the edge header boundary below must actually be configured and tested. A future challenge can be layered on this route without altering native passwords.

## Required private environment

Website (server-only, existing names):

| Variable | Required value/purpose |
| --- | --- |
| TRIXTER_SITE_URL | `https://trixterms.com` |
| TRIXTER_REGISTRATION_ENABLED | `false` until activation; `true` enables configured page/API |
| TRIXTER_REGISTRATION_URL | HTTPS URL ending `/api/register` on the registration service proxy |
| TRIXTER_REGISTRATION_GATEWAY_TOKEN | Strong random secret, identical to service token; at least 32 characters |
| TRIXTER_REGISTRATION_CSRF_SECRET | Independent random secret, at least 32 characters |
| TRIXTER_REGISTRATION_PROXY_SECRET | Independent edge-to-website secret, at least 32 characters |
| TRIXTER_REGISTRATION_ABUSE_GUARD | `reviewed-distributed-gateway` only after verifying the edge boundary |

Registration service, private `registration/local/registration.env` (ignored):

| Variable | Required value/purpose |
| --- | --- |
| REGISTRATION_ENABLED | `false` initially; service kill switch independent of website |
| REGISTRATION_GATEWAY_TOKEN | Same strong service token as website |
| REGISTRATION_RATE_SECRET | Independent persistent random HMAC secret, at least 32 characters; same across replicas |
| REGISTRATION_DB_NAME | Confirmed authoritative schema name |
| REGISTRATION_DB_USER | Exactly `trixter_registration_writer` |
| REGISTRATION_DB_PASSWORD | Private random writer password, at least 24 characters |

Never use NEXT_PUBLIC for any of these. Service database host/port are fixed to loopback:3306, listener loopback:4317. If the actual host uses another private port, make and test a scoped configuration change; never open the database to Hostinger or the Internet.

## Deployment procedure after access is restored

1. Open a Codex/admin session on the authoritative beta host. Confirm repository root, running executable paths, deployed account schema/collation, auto-increment/unique key, native password format and current registration policy. Confirm a verified website deployment path in Hostinger. Keep both switches false. Back up any configuration before changing it.
2. Using the existing protected database-admin workflow, create only the InnoDB `registration_limits` table defined by `registration/src/schema.mjs`. Provision a new localhost-only writer using private credentials. Grant only SELECT and INSERT on `<authoritative_schema>.accounts`, and SELECT/INSERT/UPDATE/DELETE on `<authoritative_schema>.registration_limits`. Grant nothing globally or at schema scope, no roles, no GRANT OPTION, no account UPDATE/DELETE and no character access. Startup checks these grants. The writer can read accounts for uniqueness/schema validation; protect its host and credentials accordingly.
3. Install pinned dependencies with `npm ci` in `registration`, create the private env file via a protected editor/secret manager, and supervise `npm start`. Startup validates grants and schema before listening. Do not run an unreviewed bootstrap migration or replace the game database. No game restart is needed for account insertion.
4. Configure TLS routing to the loopback registration listener. Only the website server holds its bearer token. At the website ingress, strip any incoming `X-Trixter-Edge-Token` and `X-Trixter-Client-IP`, then set the former from protected configuration and the latter from the actual trusted client connection. If ingress itself is behind a CDN, trust only its verified proxy ranges and canonical source-IP mechanism. Pass these headers on GET and POST `/api/register`. Unauthenticated direct-origin traffic must fail closed. Preserve all other routes, `/beta` downloads and telemetry settings. Do not log request bodies or Authorization. Keep public CORS closed.
5. Configure the website variables, deploy this reviewed checkpoint through the restored Hostinger connection, and verify HTTPS, origin/CSRF/forged-IP rejection, disabled 503, authenticated service routing and rate limiting. Enable service and website switches only after those checks. Do not replace the deployed website with a stale candidate if another lane has since shipped.
6. Prepare exactly one owner-operated canary on the clean laptop. Create fresh credentials at https://trixterms.com/register; confirm exactly one normal-player row privately; use approved Public Beta launcher, Update, Play, native ID/password screen; enter those same credentials. Confirm LOGIN_PASSWORD and successful live-beta login without recording credentials or player identifiers. Only this can satisfy ACCEPTED. Website/endpoint production observations are required before VERIFIED.

Rollback: set website switch false and deploy/restart its configuration; set service switch false and restart only that supervised service, or stop its listener. Existing accounts and native login remain intact. Do not delete canary rows or migrate passwords automatically. Keep rate secret stable during ordinary restarts. Restore backed-up proxy configuration only if needed.

Minimum owner action: restore an administration session on trixterms-beta-host and reconnect the existing Hostinger repository deployment; then an operator can follow steps 1–5. The owner performs the single clean-laptop canary. No credentials should be sent into this task.

## Local evidence and reproduction

The local test uses a newly initialized, task-owned MariaDB on loopback port 14317, never either existing runtime database. `registration/tools/verify-local.mjs` checks the exact task-local datadir before writes and refuses an existing fixture schema. It reads only the CREATE TABLE segment of the source account schema, never seed rows; then applies required keys/auto-increment in the isolated fixture. Synthetic inputs only. Database password is randomly generated in memory and never written or printed.

Compile `RegistrationPasswordProbe.java` together with the actual `LoginCrypto.java`, `HexTool.java`, `StringUtil.java` and existing MINA dependency into ignored local output. Set `TRIXTER_ACCOUNT_SCHEMA`, `TRIXTER_TEST_JAVA` and `TRIXTER_TEST_CLASSPATH` to those local paths, then run `node --experimental-strip-types tools/verify-local.mjs` from registration. The harness exercises a real browser -> Next.js -> HTTP service -> MariaDB path and passes the inserted credential to the actual Java verifier over stdin; it also rejects a wrong password. This is not a running game-server/native-client acceptance test. The test preview uses port 14318 and is stopped by the harness.

Checks executed: website 58 tests; backend six test groups; typecheck; lint; production build; real database/browser/Java integration; generated browser/source security scan. Browser tests include real creation/duplicate and intercepted rate-limited/unavailable/unexpected responses, password clearing and two immediate submit events producing one request. Initial npm install failed on sandbox cache permissions; dependencies were copied from the version-matched existing website/bridge installations. Initial Java compilation hit sandbox archive access and passed in an approved narrowly scoped compile. Initial integration assertions passed but cleanup double-closed the pool; corrected and rerun successfully. A repeated concurrency check failed; the writer now explicitly uses READ COMMITTED to avoid expired-counter cleanup gap-lock contention, with row locks still protecting shared limits. Final integration includes ten additional concurrent duplicate rounds. New-test floating-promise lint errors were fixed. No failing check is represented as a pass.

Next milestone: restore deployment access, provision the reviewed private service, verify production guards, then complete the single native-login canary.
