# Private registration gateway

This version supersedes the direct Node account writer in the earlier registration lane.
The gateway reserves persistent database rate budgets, then invokes the Java
`handling.login.RegistrationGatewayWriter`. That worker calls
`AccountRegistrationService.register(username, password, connection)` using a
dedicated least-privilege JDBC connection. No Node code inserts accounts or hashes passwords.

## Deployment prerequisites

Keep both website and service registration switches false until all checks pass.
The service binds **only 127.0.0.1:4317**. It requires an authenticated HTTPS reverse
proxy path from the website backend to this loopback listener. Never expose this
HTTP listener or database port publicly. TLS certificates, keys, bearer credentials,
database credentials and HMAC secrets belong only in protected runtime settings.

The website additionally requires a verified ingress that strips untrusted
`X-Trixter-Edge-Token` and `X-Trixter-Client-IP` and sets authenticated values from
the actual connection. Do not substitute arbitrary `X-Forwarded-For`, merely set
the reviewed-gateway marker, or disable certificate validation to make it work.

Confirm the F: runtime identity, active classpath, current website production SHA,
database name and unique username constraint first. Preserve runtime/configuration
rollback. Use the owner-approved current local beta host; older Tailscale instructions
in prior handoffs are obsolete. Preserve download routes and the independent patch feed.

Apply the additive `registration_limits` table in `src/schema.mjs` only to the verified
database. No account migration is needed. Provision `trixter_registration_writer`
on loopback with exactly SELECT/INSERT on accounts and SELECT/INSERT/UPDATE/DELETE
on registration_limits. Startup rejects broader privileges, missing keys or unsafe
schema defaults. Do not reuse game-admin or rankings-reader credentials.

Compile the game sources `AccountRegistrationService.java` and
`RegistrationGatewayWriter.java` with the actual LoginCrypto/HexTool/StringUtil and
the existing game dependencies into a separate ignored runtime classes directory.
Do not replace the game JAR to launch the gateway. Set `REGISTRATION_JAVA` to the
absolute approved Java executable and `REGISTRATION_JAVA_CLASSPATH` to those classes,
the dependency game JAR, MINA and Connector/J. The subprocess never loads game
configuration, starts the server, or exposes a listener. Only source-code classpaths
appear in arguments; submitted credentials use stdin and database credentials use
an explicitly restricted child environment. stderr is discarded, stdout is capped
and allowlisted, concurrency is bounded to four, and requests are never retried.

Install locked service dependencies with `npm ci` in this directory. Fill the ignored
`local/registration.env` from `.env.example`, then supervise `npm start` through the
existing runtime administration workflow. Do not put credentials in shell arguments.
Production database/listener addresses and ports are loopback-only and fixed in
`src/main.mjs`. The Java worker accepts another loopback database port only for the
explicit isolated integration harness.

## Controls and limitations

Browser JSON has exactly username, password, passwordConfirmation. The website
enforces exact origin, signed cookie/header CSRF, 4096-byte bounded JSON and response
reads, timeouts, trusted edge identity, and supplemental IP/username limits.
The private hop rejects browser Origin headers, compressed bodies, invalid bearer
authentication, extra fields, non-JSON, oversized bodies and unexpected routes.

Persistent limits are 100 admitted valid attempts globally/hour, five per IP/hour,
three per case-folded username/hour. Subjects are HMAC digests. Counters use database
time and row locks and are committed before the writer runs. Writer failures consume
attempts. Fixed-hour windows allow adjacent-window bursts; the token bucket and website
limits supplement them. The global database row serializes admission across replicas.
Account uniqueness is enforced by the case-insensitive database unique index; only
MySQL error 1062 maps to USERNAME_TAKEN, not all integrity errors.

Registration responses are 201 ACCOUNT_CREATED, 400 INVALID_REGISTRATION,
409 USERNAME_TAKEN, 429 RATE_LIMITED and 503 REGISTRATION_UNAVAILABLE. GET on the
website is a separate CSRF-bootstrap operation returning 200 with a form token.
No registration response contains an account ID or login token. Infrastructure
connection errors may close a socket without an application response.

Before enabling, explicitly set `trixterms.closedBeta.autoRegister=false` and the
legacy `trixterms.login.autoRegister=false` in the deployed configuration; keep
`trixterms.launcherAuth.enabled=false`. Verify the active binary honors its policy;
do not use LauncherAuthServer as this backend. Preserve native LOGIN_PASSWORD login.

## Validation

`npm test` runs backend security tests. The website has its own tests/build/typecheck/
lint/security scan. `node --experimental-strip-types registration/tests/integration.mjs`
from the website root uses only a separately initialized loopback MariaDB instance on
14327 with the exact task datadir suffix checked by the harness. It refuses an existing
writer identity, creates synthetic data only, and never resets a real account.
Set `TRIXTER_ACCOUNT_SCHEMA`, `REGISTRATION_JAVA`, and `REGISTRATION_JAVA_CLASSPATH`
to the local fixture schema/source and compiled real worker dependencies. It tests real
Java account creation, privilege defaults, case-only duplicates, five concurrent race
rounds, durable IP/name limits, and website-handler-to-gateway-to-database responses.
This does **not** establish production HTTPS or native-client login acceptance.

Activation still requires real-domain HTTPS/edge spoof rejection, one controlled live
registration, exactly one normal account, official launcher/manual credentials and
observed server LOGIN_PASSWORD. Never put that account's credentials in receipts or Git.
