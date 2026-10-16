# ADR 0004: Adopt the firm handbook 1.0.0

- **Status:** Proposed (the owner accepts it by merging the PR that adds it)
- **Date:** 2026-10-16
- **Requirements:** REQ-040, and the process behind every other requirement

## Context

The firm now has one handbook for every project (`mdarbylab/handbook`, version 1.0.0): Kanban with thin vertical slices and a living spec (firm ADR 0002), requirement IDs, ADRs, one gate script that CI also runs, pinned Actions, a secret scan and a dependency audit. WorkWorth predates it. It was built in sprints, kept its rules, live-system notes and project history together in a 500-line `CLAUDE.md`, had no requirement IDs or ADRs, ran CI on unpinned Actions, and its `npm run verify` had no secret scan or dependency audit. `npm audit` reported 7 high-severity findings: two with a lockfile-only fix (`sharp`, `source-map-js`), and the `braces` chain in `eslint-config-next`, already deferred because its only fix is a breaking downgrade of lint tooling.

## Options considered

1. **Adopt the handbook in full, moving files to the template's layout** (`docs/spec.md` and so on). Uniform with new projects, and churns every link to `SPEC.md` for no gain.
2. **Adopt the handbook's method and gates, keep WorkWorth's file layout, and record each deviation here.**

## Decision

Option 2. WorkWorth follows handbook 1.0.0 (`HANDBOOK_VERSION`):

- **Method.** Sprints are retired. The scoped Sprints 8 to 10 become slices SL-01 to SL-06 plus an unscoped backlog item, in the same order (SPEC §14). At most two slices in progress.
- **Records.** `SPEC.md` stays at the repository root as the spec. Requirement IDs live in `docs/requirements.md` and each spec section names its own. ADRs live in `docs/adr/`; 0001 to 0003 record decisions already taken. Non-negotiables live in `docs/non-negotiables.md`, with candidates for the owner to approve. `CLAUDE.md` holds rules only; live-system facts moved to `docs/operations.md` and the dated narrative to `docs/history.md`.
- **Gate script.** `npm run verify` is the gate script, run by CI on every PR and every push to `main`. It now runs, in order: secret scan (`scripts/secret-scan.sh`, the template's patterns plus Stripe, Supabase, Resend and PostHog key shapes), dependency audit (`scripts/audit.mjs`), `next typegen`, `tsc --noEmit`, `eslint .`, `vitest run`, `next build`.
- **Dependency audit.** Any known vulnerability fails the gate, with one mechanism for deliberate deferral: `scripts/audit-allowlist.json` lists a dev-only advisory with a reason and a review-by date. The gate fails once that date passes, or at once if the advisory reaches a production dependency. The one entry is `braces` (GHSA-vfj7-8cjw-p6xm), review by 2026-11-16, in step with the monthly audit. The `sharp` and `source-map-js` findings are fixed in this change by `npm audit fix` (lockfile only, patch versions within the existing ranges; no `package.json` range changed).
- **CI.** Actions are pinned to commit SHAs with the version in a comment (`actions/checkout` and `actions/setup-node` at v4.4.0, read from the actions' own repositories). The CI job keeps `permissions: {}`, stricter than the handbook's `contents: read` and sufficient for a public repository, and checks out with `persist-credentials: false`. The npm cache is dropped (handbook: no cache unless justified). The backup workflow keeps persisted credentials on its checkout because its last step pushes with them.

### Deviations from the handbook

| Handbook expects | WorkWorth now | Until |
|---|---|---|
| Format check in the gate | None. Adding Prettier is a new dependency and a repository-wide reformat; it gets its own PR | **(planned)** 2026-11-30 |
| Cross-tenant leak test suite (multi-tenant data) | Isolation verified by inspection (ADR 0002) | **(planned)** with slice SL-06; date set when SL-06 is pulled |
| Dependency audit clean | Clean except the allowlisted, dev-only `braces` advisory | Review by 2026-11-16 |
| Spec at `docs/spec.md` | `SPEC.md` at the root | Permanent; this ADR |
| Branch protection on `main` where the plan enforces it (firm ADR 0003); this repository is public, so it does | Not yet turned on | **(planned)** 2026-10-23, an owner action in repository settings |
| GitHub Projects board | Slices listed in SPEC §14 | **(planned)** 2026-10-23, an owner action |
| Changelog from the first tagged release | No release tagged yet | First tag |

## Consequences

- One method across the firm's projects; a session reads `CLAUDE.md` for rules and the docs for state.
- A new advisory in any dependency turns CI red until it is fixed or deliberately allowlisted with a date, so an unrelated PR can go red because of a newly published advisory. That is intended: the handbook's rule is that a red gate is fixed, never skipped.
- The dependency audit needs the npm registry, so `npm run verify` no longer runs fully offline.
- Netlify still builds with `npm run build`, so a gate failure never blocks a production deploy by itself; the owner checks CI before merging (firm ADR 0003).
- Most requirements are verified by inspection or demonstration today. That is recorded, not hidden, in `docs/requirements.md`.
