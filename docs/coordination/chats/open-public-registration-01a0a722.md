# Open public registration safely

Status: **BLOCKED on production access/routing**, 2026-09-16.
IMPLEMENTED=true (source); TESTED=true (local scope below); VERIFIED=false
(production/native login); DEPLOYED=false; OWNER ACCEPTED=false.
No production game process, database or website settings were changed. A backed-up
additive DNS record now points `register-gateway.trixterms.com` to the existing
public beta host `46.122.17.208`; no listener or certificate is active yet.

## Verified source checkpoints

- Website/gateway: `5afe006af8482e3aadc2928b9630d956db06248e`,
  `trixtergod3-bot/TrixterMS-website`, `codex/open-public-registration-01a0a722`.
- Java worker/service: `ee3411c5d81b973900b105e036d0c3a513f350af`,
  `trixtergod3-bot/TrixterMS`, `codex/registration-writer-01a0a722`.
- Website base is verified main `6cec77b`, containing the official-download merge.
  Only scoped registration source/tests/docs were added. Both remote source SHAs
  were verified with ls-remote through the approved transport.
- Development is under the authoritative Documents workspace, with website checkout
  `local/website-open-public-registration-01a0a722`; Java source remains in the main
  Documents checkout (`codex/openbeta`) and is selectively published through
  `local/registration-writer-publication-01a0a722`. No game runs from these worktrees.

## Implemented

Website accepts exactly username/password/passwordConfirmation. Origin and CSRF
rejections now use the documented 400 code; all supported HTTP method handlers
stay within the application allowlist. Compressed bodies are rejected. Both password
inputs clear immediately, and a synchronous guard prevents double submission.

The prior direct Node-to-accounts writer is superseded: persistent HMAC IP/username/
global rate budgets are committed before a bounded Java subprocess invokes the real
AccountRegistrationService using a dedicated connection. Node no longer inserts accounts
or hashes passwords. The worker accepts bounded stdin, uses loopback JDBC, suppresses
private errors and emits only a fixed result enum. Only error 1062 means duplicate;
other integrity failures remain server errors. Invalid input is rejected before DB access.

Gateway HTTP is **loopback only** and still requires a provisioned authenticated HTTPS
reverse-proxy route. It is not yet a deployed public HTTPS service. The website also
requires trusted ingress header stripping/injection; no bypass of that gate was added.
See [the gateway runbook](../../../registration/README.md).

## Checks actually run

- 66 website tests passed, including exact origin/CSRF, strict input, bounded bodies,
  response filtering, duplicate outcomes, IP/name throttles and download preservation.
- Website production build, typecheck and lint passed.
- Security scanner: 132 publishable text files, 55 browser bundles, zero findings.
- Website and gateway production dependency audits: zero vulnerabilities.
- Four gateway security test groups passed, including real HTTP malformed requests,
  bearer checks, kill switch, body/origin rejection, limits and fixed-field logging.
- Real Java sources compiled; enhanced AccountRegistrationServiceSelfTest passed,
  including password verification, unique-key races and non-duplicate integrity errors.
- Isolated MariaDB on loopback 14327: actual Java worker created normal accounts;
  case-only duplicate and five concurrent duplicate rounds passed; persistent IP/name
  limits passed; website handler -> authenticated HTTP gateway -> Java -> MariaDB passed.
  Fixture identity was checked and the instance was gracefully stopped. No production
  account was created. Local fixture/classes remain ignored beneath
  `local/open-public-registration-01a0a722` and must never be published.
- Initial local dependency junction failed the security scanner; replaced with a normal
  dependency copy and reran successfully. Initial sandbox Java archive access failed;
  scoped approved compilation passed. These are resolved local checks, not live evidence.

## Production observations and blockers

Live register page still showed disabled inputs. Live download page showed both public
launcher and full-client links for `v111.1-beta.1-character-select.1`. Independent
`releases/current.json` returned HTTP 200, sequence 10; health.txt returned HTTP 200/ok.
No patch feed or client file changed.

Verified running Java PID 1344 referred to the F: single-pc runtime, its local
server.properties and beta003 overlay; MariaDB listened only on loopback 3306.
Inspected active classpath did not contain AccountRegistrationService. No registration
listener or registration_limits table was present. Account schema metadata showed
InnoDB, auto-increment id, name varchar(13), password varchar(128), salt varchar(32),
case-insensitive latin1_swedish_ci name and a single-column unique name index.
No account rows or private configuration values were printed.

Explicit registration flags were absent in the inspected local override files. The
runtime world file still contains the legacy login.autoRegister=true, while development
world configuration contains closedBeta.autoRegister=true. **These are not yet changed
or certified disabled**. Before opening registration, back up and explicitly disable
both properties and launcherAuth.enabled, then verify the actual loaded policy.

Hostinger is now accessible in the Codex in-app browser. The account shows `trixterms.com`
as a Next.js web app (2 of 5 web-app slots used) and no VPS. DNS was inspected and backed
up: apex ALIAS and `www` CNAME remain on Hostinger CDN, while `register-gateway` was added
as an A record to `46.122.17.208` with TTL 300. The F: host has public game forwarding,
but no registration listener, reverse proxy or TLS certificate. Current production
deployment settings still require readback before activation.

## Exact next actions

1. Owner action: create one router NAT rule forwarding TCP WAN port 443 for
   `register-gateway.trixterms.com` to `192.168.1.84:8443`. Do not change database or
   MapleStory game-port rules. Keep registration disabled until this is verified.
2. Provision TLS/reverse proxy on 8443, verify trusted client-IP handling and Hostinger
   egress, then inspect current production SHA/branch and environment setting names.
3. Preserve configuration rollback, provision the additive limiter table and least-privilege
   writer on the confirmed database, compile/stage the matching worker, supervise gateway,
   and disable alternate public writers. Never move the game DB onto the public web host.
4. Deploy reviewed website over the newest production base; preserve downloads/feed.
5. Check real-domain API guards, one controlled live registration and native LOGIN_PASSWORD
   through the official launcher. No credentials in scripts, Git, logs or handoff records.

There is **no registration deployment commit** yet. Local test success does not establish
production HTTPS, live registration, native login or owner acceptance.
