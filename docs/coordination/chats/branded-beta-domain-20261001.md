# Move beta downloads to trixterms.com branding

Status: BLOCKED on access to the Hostinger account that owns the website and patch site.

The website branch `codex/branded-beta-domain` allows the exact `https://patch.trixterms.com/beta` feed while retaining the existing default Hostinger feed for older clients. It also updates Next.js to 16.3.8 to clear the critical production dependency advisory. Source checkpoint: `6dc8df76e3ce21bbffe9e4223d56911d5e925c51` (remote verified).

Verification: 94 tests, production build, security scan, and production npm audit pass. No public deployment or patch feed change occurred. `patch.trixterms.com` currently fails HTTPS. The signed public manifest is sequence 18, but `releases/current.json` still describes sequence 10, so changing the website setting alone would not enable downloads.

The connected Chrome Hostinger session is signed into an account with no websites or shared account access. The owner must sign into the account that contains the `trixterms.com` website and the existing patch hosting in the connected Chrome profile. Then bind `patch.trixterms.com` to the existing patch site, issue HTTPS, verify the complete feed and archives, publish matching branded metadata, and deploy the reviewed website branch with the branded metadata URL. Keep the default Hostinger hostname available for existing launchers until their migration is verified.
