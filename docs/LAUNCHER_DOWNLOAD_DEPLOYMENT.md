# Launcher download integration

The approved midnight website is preserved. PLAY NOW routes to `/download`.
The primary action is DOWNLOAD FOR WINDOWS, driven exclusively by the existing
`TRIXTER_RELEASE_DOWNLOADS_JSON` contract. A launcher takes precedence over any
legacy full-client archive metadata. No version or download URL is compiled
into the page. Invalid or absent configuration remains unavailable.

## Production activation

1. In the existing Hostinger Node application, record the currently deployed
   branch/commit and back up its settings through the protected hosting UI.
   Do not copy secret values into documentation or task logs.
2. Confirm the application uses the approved midnight production candidate.
   This integration branch starts at `7abc5c3882370a50232d12ab82017083881a09d0`;
   it excludes the separate telemetry candidate. Review any newer deployed
   revision before replacing it.
3. Obtain the latest verified `docs/releases/explorer-beta-public-downloads.json`
   from the TrixterMS patcher lane. Require successful release publication,
   HTTPS digest verification, complete clean-room installation, and a
   zero-managed-download second check. Do not select a release merely because
   its manifest was uploaded. In particular, intermediate launcher 1.3.2 /
   sequence 3 failed its Ready check and must not be activated.
4. Set the exact reviewed JSON as `TRIXTER_RELEASE_DOWNLOADS_JSON`, with
   `fullClient: null`. Leave unrelated service settings and secrets intact.
5. Deploy the reviewed website integration through the existing Node app:
   root `.`, `npm ci --include=dev`, `npm run build`, `npm start`, Node 24,
   platform-provided PORT. Preserve the independent Hostinger `/beta` patch
   origin and its files. Do not upload website output into that feed root.
6. Verify `https://trixterms.com` → PLAY NOW → `/download` → DOWNLOAD FOR WINDOWS.
   Compare the downloaded EXE's exact size and SHA-256 to the reviewed metadata.
   Confirm the existing patch health and signed manifest still pass readback.

Rollback uses the recorded website deployment/settings only. Do not roll back
the patch manifest sequence or modify immutable objects to undo a website edit.

## Local checks

Save public release metadata as ignored `local/release-downloads.json`. Supply
its contents to `TRIXTER_RELEASE_DOWNLOADS_JSON` when starting the production
preview on a free loopback port. The preview does not require account secrets.

```powershell
npm ci --include=dev
npm test
npm run lint
npm run build
npm run typecheck
npm run check:security
$env:TRIXTER_RELEASE_DOWNLOADS_JSON = Get-Content local/release-downloads.json -Raw
npm start -- --hostname 127.0.0.1 --port 4327
```

In a second terminal:

```powershell
$env:PORTAL_QA_URL = 'http://127.0.0.1:4327'
node tools/verify-browser.mjs
node tools/verify-production.mjs
node --experimental-strip-types tools/verify-download-flow.mjs local/release-downloads.json
```

The download test clicks PLAY NOW at desktop and phone widths and compares the
rendered download URL, release identity and checksum against the supplied
validated metadata. It checks instructions and overflow without downloading
game content. Actual public download hashes and launcher behavior are separate
release gates. Reports remain under ignored `local/qa`.

## Laptop acceptance

Use a new empty writable folder and obtain the launcher exclusively through the
production website. Keep its original filename. Confirm PLAY remains disabled
during CHECKING, UPDATE REQUIRED, UPDATING and final VERIFYING. Click UPDATE;
after every required file validates, READY TO PLAY must enable PLAY. Close and
reopen: the second check must download zero managed files.

Delete one small managed file, reopen, and repair it. Then corrupt a small
managed file and repair again. Use a harmless unmanaged text file or screenshot
to confirm player files survive. A failed check/update must keep PLAY disabled
and offer a retry. Do not alter the approved game executable for this test.

Click PLAY. Observe MapleStory's native ID/password screen and enter credentials
only there. Confirm login, character selection, channel entry, reconnect, and
Cash Shop entry/return. The runtime operator should record only a sanitized
`LOGIN_PASSWORD` observation, with no account identifiers or credentials.
Record distribution, native login, runtime connectivity and owner acceptance
separately; a local TCP probe cannot substitute for this outside-network test.
