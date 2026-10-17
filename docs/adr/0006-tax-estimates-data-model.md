# ADR 0006: Tax estimates data model

- **Status:** Accepted (owner merged PR #36, 2026-10-17)
- **Date:** 2026-10-17
- **Requirements:** REQ-047, REQ-048

## Context

Slice SL-02 starts tax estimates (SPEC §14): a one-time disclaimer that each account must agree to before the feature unlocks, then self-employment tax shown as a quarterly "set aside" amount against the four IRS due dates. SL-03 adds federal income tax by filing status and SL-04 a state estimate, on the same tables. The spec requires rates from a table versioned by `tax_year`, never hardcoded, so a new year is a data change and an old year's estimate does not move when rates change.

The figures are a planning estimate, not a filing tool (non-negotiable candidate NN-06). They are built from the same profit the Reports screen shows, so a business sees one number for "what I made" everywhere.

## Options considered

1. **Rates in a `tax_years` table, one row per year, typed integer columns; consent in a `tax_consents` table keyed by user and disclaimer version.** Rates are inspectable in SQL and change by migration; consent is an explicit, dated record that survives sign-out and device changes.
2. **Rates in a TypeScript constant per year.** Simplest to read and test, but the spec rules out hardcoding, and a rate fix would need a deploy rather than a data change.
3. **Consent as a column on `memberships` or in `auth.users` metadata.** No new table, but `memberships` is per business rather than per account (a person who leaves and joins another business would lose or carry it oddly), and user metadata is writable by the user from the client with no record of when or to which wording they agreed.

## Decision

Option 1.

- **`tax_years`** (`tax_year` primary key). Rates are integer basis points (1240 = 12.40%) and amounts are integer cents, so no float ever stores a rate: `se_earnings_factor_bp` (9235), `social_security_rate_bp`, `social_security_wage_base_cents`, `medicare_rate_bp`, `additional_medicare_rate_bp`, and the additional-Medicare thresholds for single, married filing jointly and married filing separately. The thresholds are stored per filing status now so SL-03 needs no migration for them; until SL-03 adds filing status, the estimate uses the single threshold and says so. `source` records where the year's figures came from. Readable by any signed-in user (it is public reference data); nobody writes it from the app. A new year is added by migration.
- **`tax_consents`** (`user_id`, `disclaimer_version`, `agreed_at`), primary key on the first two. A user reads and inserts only their own rows (`user_id = auth.uid()`); there is no update or delete policy, so agreement can't be edited after the fact. Rows go when the account is deleted (`on delete cascade` from `auth.users`). Changing the disclaimer wording bumps `TAX_DISCLAIMER_VERSION` in `lib/tax.ts`, which asks everyone to agree again.
- The calculation is pure code in `lib/tax.ts`. Each quarter's set-aside is the tax on year-to-date profit through the end of that quarter minus what earlier quarters already set aside, never below zero. Working from year-to-date totals keeps the Social Security wage base, the additional-Medicare threshold and fixed-price jobs (which count their full price in any period with activity) correct across quarters.
- Only someone with full access (`auth_is_owner()`, ADR 0002) sees estimates, because they need the whole business's profit; on Pro a member sees only their own expenses, so their numbers would be wrong.

## Consequences

- Each January someone must add the new year's row; until then the screen says the year's rates aren't loaded rather than guessing. Claude proposes it by migration each December and the owner approves it (SPEC §14, settled 2026-10-17).
- Two new tables with RLS enter the SL-05 security re-audit list. Neither is org-scoped: `tax_years` holds no customer data and `tax_consents` holds only a user id, a version and a timestamp.
- The estimate inherits the Reports definition of profit (tracked time × rate, fixed prices, expenses), not cash received. The disclaimer says so.
