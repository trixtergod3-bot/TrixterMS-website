# Deploy telemetry rankings to the website

Status: **BLOCKED** on 2026-09-26. The source release is published to GitHub `main` at `037a8f839e0a2a324b30af38cc43a31a632c8658`; it is not deployed to the Hostinger runtime.

The release combines the telemetry/NX/class-filtered ranking system with the current production registration and download work. The merge passed 93 website tests, 40 bridge tests and 4 registration-service tests, plus lint, typecheck, production build and security scan. A local production smoke at `127.0.0.1:4316` rendered the rankings selector with NX Credit and class filters.

Public verification remains negative: `https://trixterms.com/rankings` still displays the older Level/Fame-only form and unavailable standings after the main push. Hostinger redirects to an unauthenticated login page and no safe non-interactive host deployment configuration is available. Local registration/database secrets were not used and cannot publish the website.

The next action is owner authentication to Hostinger, followed by inspection of the existing Node app and its `/beta` patch-route preservation. Configure the reviewed HTTPS read bridge and server-only token, deploy the published `main` commit, then repeat the public rankings/API check. No MapleStory runtime, database, client, patch payload or Hostinger setting was changed by this lane.
