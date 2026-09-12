# Registration, downloads, and external integrations

This portal implements a disabled-by-default registration gateway and validated
public download metadata. It does not create accounts, operate the game database,
publish client files, enable a payment service, or change the game launcher.

## Registration route

`GET /api/register` creates a 30-minute CSRF form session when all required
configuration is present. It returns `{ "csrfToken": "..." }` and an HttpOnly,
SameSite=Strict cookie. HTTPS uses a Secure `__Host-` cookie with Path=/ and no
Domain attribute. The token has a random 256-bit value, timestamp, and HMAC.

`POST /api/register` accepts JSON with exactly these fields:

```json
{
  "username": "Example42",
  "password": "<entered password>",
  "passwordConfirmation": "<same entered password>",
  "website": ""
}
```

The browser also sends `X-CSRF-Token`. The route requires an exact allowed Origin,
rejects cross-site Fetch Metadata, verifies the signed token and matching cookie,
accepts only JSON, limits request and upstream response bodies to 4 KiB, and bounds
body reads and upstream fetches to eight seconds. The hidden `website` honeypot
must be empty. Unknown fields, including GM, email, PIC, account ID, and currency
fields, are rejected. Usernames are 4–13 ASCII letters/digits; passwords are 8–32
ASCII characters from `!` through `~`, excluding spaces. Passwords are not trimmed
or normalized. Confirmation must match exactly.

Only username, password, and confirmation are forwarded over the server-to-server
connection. No database connection exists in this route. It does not retry account
creation. Bodies and credentials must remain excluded from hosting, proxy, APM,
and gateway request logs; the portal code logs none of them. There is no password
storage, browser local storage, automatic login, or credential-bearing URL.

The upstream must return a JSON `code` matching its HTTP status:

| HTTP | Code |
| --- | --- |
| 201 | `ACCOUNT_CREATED` |
| 400 | `INVALID_REGISTRATION` |
| 409 | `USERNAME_TAKEN` |
| 429 | `RATE_LIMITED` |
| 503 | `REGISTRATION_UNAVAILABLE` |

The portal returns only this allowlisted code. It never forwards an account ID,
login token, response cookie, private upstream error, or arbitrary response field.
Unrecognized status/code combinations, redirects, timeouts, and failed fetches
become 503. Origin/CSRF failures return 403 `REQUEST_REJECTED`.

## Server-only configuration

Do not prefix these settings with `NEXT_PUBLIC_` or commit real values. Defaults
leave registration off and omit download links and Discord invitations.

| Setting | Requirement |
| --- | --- |
| `TRIXTER_SITE_URL` | Exact public origin, such as `https://trixterms.com`; no subpath |
| `TRIXTER_REGISTRATION_ENABLED` | Explicit `true` only after the gateway is reviewed |
| `TRIXTER_REGISTRATION_URL` | Private gateway endpoint; HTTPS in production; no URL credentials/query/fragment |
| `TRIXTER_REGISTRATION_GATEWAY_TOKEN` | At least 32 characters; separate server-to-server bearer credential |
| `TRIXTER_REGISTRATION_CSRF_SECRET` | At least 32 characters; independent random signing secret |
| `TRIXTER_REGISTRATION_ABUSE_GUARD` | In production, exactly `reviewed-distributed-gateway` |
| `TRIXTER_REGISTRATION_PROXY_SECRET` | In production, at least 32 characters; independent trusted-proxy credential |
| `TRIXTER_DISCORD_INVITE_URL` | Existing approved HTTPS `discord.gg/<code>` or `discord.com/invite/<code>` |
| `TRIXTER_RELEASE_DOWNLOADS_JSON` | Reviewed public metadata matching the schema below |

Production requires a trusted reverse proxy that removes incoming
`X-Trixter-Edge-Token` and `X-Trixter-Client-IP`, then sets its own secret edge
token and the actual client address. The application rejects missing/invalid
edge authentication or an invalid IP address. It does not trust arbitrary
`X-Forwarded-For`. The private account gateway must authenticate the portal's
bearer token and accept its client-address header only from that authenticated
portal identity. No browser ever receives either secret.

The application adds bounded in-process limits: five POST attempts per address
per hour, three attempts per case-folded username per hour, and 30 CSRF sessions
per address per ten minutes. Successful requests do not reset limits. Address and
username limiter keys are hashed and held in memory. A full 5,000-entry limiter
fails closed until entries expire. These are supplemental controls; they do not
survive restarts or coordinate replicas.

The upstream therefore **must** atomically enforce durable/shared client-address
and username limits, bot/abuse policy, and the account unique constraint before
writing any account. Enabling the reviewed-distributed-gateway setting is an
operator assertion that this has been deployed and verified, not proof provided
by an environment variable. The feature remains unavailable without it in
production. A configuration-ready form can still receive 503 if proxy headers or
the upstream are unavailable; availability is never inferred from a flag alone.

For isolated unit/development tests only, loopback HTTP endpoints are permitted
outside production, and the supplemental client-address bucket is shared at
127.0.0.1. Do not expose that development mode publicly.

## Existing game-account compatibility

The inspected authoritative Documents checkout contains:

- `server/src/handling/login/AccountRegistrationService.java:50` — existing
  server-side account writer; validation at lines 83 and 97; fixed normal-account
  INSERT at line 137.
- `server/src/client/LoginCrypto.java:92` — lowercase hex SHA-512 of the ASCII
  password followed by the 32-character lowercase hex salt. This is the current
  native game-login format, not a frontend hashing operation.
- `server/sql/seperate/1-accounts.sql:1` — `accounts.name` varchar(13), password
  varchar(128), salt varchar(32); unique name index at line 44. Auto-increment is
  supplied separately in `server/sql/seperate/998-autoincements.sql:1`.
- `docs/BETA_ACCOUNT_REGISTRATION_READINESS.md` — proposed private writer
  contract and prerequisites. The public route in this portal is `/api/register`;
  the configured upstream may implement the documented `/api/v1/registrations`.

Reuse `AccountRegistrationService.register` behind the private gateway. It writes
`gm=0`, `banned=0`, `greason=1`, zero NX/point/vote balances, and `PicEnabled=0`;
creates no character; and uses both a preflight lookup and the unique index for
concurrent duplicate protection. New passwords must use the salted format. Do
not introduce legacy plaintext/SHA-1 rows or expose any legacy reset table.

The current salt implementation calls `java.util.Random`. A separately reviewed
account-service hardening change should switch new salts to a cryptographic
16-byte random source while preserving the 32-character hex format and native
login compatibility. This portal does not modify game authentication code.

Do not use `LauncherAuthServer /v1/register`: it is coupled to launcher-auth login,
has a divergent older password policy, and lacks the website's origin/CSRF and
confirmation contract. Native manual login remains mandatory.

The checked-out `server/worldGMS.properties:79` still contains
`trixterms.closedBeta.autoRegister=true`; that is source evidence, not a verified
statement about the live beta host. Before opening public registration, its own
auth lane must retire/reconcile alternate registration writers, verify the live
unique constraint, enforce the normal-account defaults, run duplicate/abuse
checks, and prove an owner-created account logs in through native `LOGIN_PASSWORD`.
No email verification or password reset workflow exists in this portal.

## Download metadata contract

The download page starts without a current release or download URL. Supply only
metadata for bytes already accepted and published by the release lane:

```json
{
  "schema": "trixterms.web-downloads.v1",
  "releaseVersion": "<published release label>",
  "clientVersion": "GMS v111.1",
  "publicationStatus": "published",
  "publishedAt": "<ISO timestamp>",
  "nativeLogin": true,
  "mapleExecutableSha256": "1281B9F49259EA78162DD00E6BC3A29932EBFF47B1DA9BB3B7DFA2B762B9E7B1",
  "launcher": {
    "filename": "<published launcher archive>.zip",
    "url": "https://<approved download host>/<published launcher archive>.zip",
    "sizeBytes": 0,
    "sha256": "<SHA-256 of that archive>"
  },
  "fullClient": null,
  "manifest": null
}
```

This template intentionally fails validation until actual positive sizes, hashes,
URLs, version, and timestamp are supplied. `fullClient` has the same artifact shape
and may be a ZIP/7z archive. The launcher may be a ZIP or EXE. At least one artifact
is required. Optional `manifest` is `{ "url": "https://<host>/beta/manifest.json",
"sequence": <positive integer> }`. Unsafe/non-HTTPS/local URLs, URL credentials,
query strings, fragments, invalid hashes, and a different game executable pin
disable the entire metadata record. No URL is derived from a template filename.

The archive checksum is distinct from the game executable checksum and from each
managed-file checksum. Displaying validated metadata does not verify remote bytes
or a manifest signature. The release lane must retrieve the exact published
archive, verify its size/hash, and verify the current signed manifest before
supplying this record. The website cannot determine whether a user's installed
files are current; the launcher does that locally.

Existing publisher contracts are defined in
`tools/patch-publisher/New-TrixterPatchRelease.ps1:251` and `:303` in the server
workspace. The outer `trixterms.signed-client-update-envelope.v1` contains base64
`payload` and `signature`. The signed `trixterms.client-update.v1` payload contains
`channel`, `releaseVersion`, monotonic `sequence`, `minimumLauncherVersion`,
`publishedUtc`, `files`, and `deletedPaths`. Each file has `path`, `downloadPath`,
`sizeBytes`, `sha256`, and `isLauncher`. ECDSA P-256/SHA-256 authenticity and replay
checks belong to the release verifier/launcher; merely decoding JSON is not
signature verification. No signing key or proprietary game binary belongs in the
website repository.

The approved executable remains `MapleStory v111.1.exe`, SHA-256
`1281B9F49259EA78162DD00E6BC3A29932EBFF47B1DA9BB3B7DFA2B762B9E7B1`.
Launch uses `GameLaunching <host> <port>` and native in-game account credentials.

## Hostinger and external services

Deploy this portal separately from the existing Hostinger `/beta/` patch channel.
Preserve its signed manifest, health sentinel, immutable files, and channel
`.htaccess`. Do not let SPA rewrites turn `/api` failures or missing binary URLs
into HTML. A static-only hosting target cannot run the Next registration route;
keep registration disabled until a compatible Node runtime and the reviewed
private gateway/proxy are configured. Confirm request-body logging is disabled.

No verified Discord invitation was found in the inspected website, safe server
source, tools, and project documentation. The route remains a clear pending state.
`VoteProviderAdapter` and `DonationProviderAdapter` define provider selection,
hosted redirect, and authenticated callback boundaries only. Both remain disabled;
no provider is invented. Callback verification, replay prevention, idempotent
reward fulfillment, product/reward approval, and operational reconciliation are
required in their own backend integrations before enabling live actions.

## Verification and next milestone

`node --test --experimental-strip-types tests/registration.test.ts` exercises
native validation, extra privilege fields, honeypot rejection, origin/CSRF/expiry,
body/content limits, default/production configuration gates, spoofed proxy headers,
secure cookies, response projection, upstream failure, non-resetting bounded
limits, release metadata, and Discord/provider defaults. It uses synthetic input
and an injected in-memory transport; no real account or network request is made.

Next milestone: deploy a private registration gateway around the existing writer
with distributed abuse controls, configure the trusted proxy, verify one owner
registration and native login, then enable the portal flag. In parallel, consume
the release lane's accepted public artifact URLs/hashes into download metadata.
