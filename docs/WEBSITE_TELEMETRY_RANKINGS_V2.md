# Website telemetry rankings V2

This source update connects the existing public rankings bridge to the lifetime
telemetry implemented by TrixterMS checkpoint
`a6c517a0af70bbdab1c76a2bd8aa3cf303b8bec0`. It is implemented and covered by
synthetic contract tests. It does not apply the SQL view, provision grants,
restart a bridge, or deploy the website. Follow the current
[bridge runbook](../bridge/README.md) for those separate host actions.

## Public ranking choices

The overall page now supports these allowlisted sorts:

| Sort | Public score | Scope |
| --- | --- | --- |
| `level` | Current EXP | Character |
| `fame` | Fame | Character |
| `exp-earned` | `progress.exp_earned/all` | Character lifetime |
| `current-mesos` | Current character mesos | Character |
| `mesos-earned` | `economy.mesos_earned/all` | Character lifetime |
| `current-nx` | `accounts.NxCredit + accounts.NxPrepaid` | One representative character per account |
| `nx-earned` | `economy.nx_earned/all` | Character lifetime |
| `nx-credit-earned` | `economy.nx_earned/nx_credit` | Character lifetime |
| `nx-prepaid-earned` | `economy.nx_earned/nx_prepaid` | Character lifetime |

Maple Points are deliberately excluded. Missing lifetime counter rows mean zero.
Metric scores are exact decimal strings. Rankings order by score descending,
then level, current EXP, and the private internal stable ID. The stable ID never
leaves the bridge.

NX wallet balances are account-scoped. `current-nx` includes only the eligible
character with the highest level, then current EXP, then lowest internal ID on
each account. The response does not disclose account IDs, individual wallet
components, credentials, contact fields, network identifiers, or staff flags.

## Eligibility and class filters

The V2 SQL view includes existing characters only when both `characters.gm=0`
and the joined account has `accounts.gm=0` and `accounts.banned=0`. Level 1,
offline, unguilded, and unfamiliar-job characters remain eligible. No player
row is written by this system.

The class selector is driven by one reviewed list covering Beginner, Explorer
class lines, Cygnus, Aran, Evan, Mercedes, Phantom, Demon Slayer, Demon Avenger,
and Resistance classes. A class key covers the lower advancements in that line.
Demon Avenger still requires the exact supported carrier marker; marked
carriers do not appear under Warrior or Paladin.

## Security and deployment boundary

The Next.js application still has no MariaDB driver or database credential. A
locked SQL SECURITY DEFINER reads only the documented columns. The runtime
reader retains SELECT on the single `trixter_public_rankings_v2` view and is
tested to have no base-table reads. Browser input selects only fixed sort and
class keys; it cannot supply SQL, a metric key, a database name, or an upstream
URL.

Activation requires a protected database backup, actual schema/index review,
creation of the V2 view and grants, sanitized boundary validation, real-host
EXPLAIN/latency inspection, one bridge restart, a website preview deployment,
and owner QA. Do not drop the V1 view until rollback requirements and all
consumers have been inspected. The schema source intentionally uses no
`CREATE OR REPLACE`.

## Owner QA after activation

1. Confirm staff and banned-account characters are absent.
2. Compare each ranking score with one controlled character's database-backed
   total without publishing private rows.
3. Verify two characters on one account produce one row in Current NX, while
   character-scoped lifetime NX earned remains separate.
4. Earn both NX Credit and NX Prepaid through approved game paths and confirm
   the component rankings and combined lifetime ranking update after commit.
5. Exercise several class filters, including marked Demon Avenger versus
   unmarked Paladin.
6. Inspect the browser response and bundle for the strict public field set and
   absence of the bridge token, account identifiers, and private columns.

Only after these checks may the work move from `TESTED` to live `VERIFIED` and
owner `ACCEPTED`.
