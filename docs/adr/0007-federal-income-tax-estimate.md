# ADR 0007: Federal income tax estimate

- **Status:** Proposed
- **Date:** 2026-10-17
- **Requirements:** REQ-047

## Context

Slice SL-03 adds federal income tax to the tax estimates screen (SPEC §5.10, §14): bracket-based, with filing status as an input. ADR 0006 set the pattern: rates live in tables versioned by `tax_year`, the math is pure code in `lib/tax.ts`, and the estimate is built from the profit Reports shows. Self-employment tax (SL-02) is set aside on actual year-to-date profit. Income tax is progressive, so the same approach would ask for too little early in the year and catch up late, which is exactly the surprise the feature exists to prevent.

## Options considered

1. **Brackets in a `tax_brackets` table (year, filing status, lower bound, rate), standard deductions as columns on `tax_years`, filing status stored per account in `tax_profiles`; income tax to date annualized from year-to-date profit.** Data-driven like ADR 0006, and the early-quarter figures reflect the year's real bracket.
2. **Brackets as JSON on `tax_years`.** One row per year, but the shape isn't checked by the database and is harder to inspect.
3. **Filing status on `organizations`.** One setting per business, but the business isn't the taxpayer; the person is, and a business may change hands.

## Decision

Option 1.

- **`tax_years`** gains `standard_deduction_{single,joint,separate,head}_cents`.
- **`tax_brackets`** (`tax_year`, `filing_status`, `lower_cents`, `rate_bp`), primary key on the first three: each row is the rate on income above its lower bound, up to the next row's. Read-only reference data, readable by any signed-in user, added by migration.
- **`tax_profiles`** (`user_id` primary key, `filing_status`, `updated_at`): per account, own row only (select, insert, update), gone with the account. Without a row the estimate uses single and the screen says so.
- Filing statuses are single, married filing jointly, married filing separately and head of household. Head of household uses the single threshold for additional Medicare, as the IRS does.
- **The estimate:** taxable income = profit − half the self-employment tax − the standard deduction, never below zero; tax from the brackets. It assumes the business is the person's only income and takes no other deductions or credits. It does **not** take the qualified business income deduction: that can lower the tax by up to a fifth of business income, but its limits depend on things WorkWorth doesn't know (the kind of business, wages paid, total income), so leaving it out keeps the estimate on the side of setting aside too much. Whether to add a simplified version is put to the owner in the SL-03 pull request.
- **Annualized to date:** income tax to date = the tax on year-to-date profit annualized over the share of the year elapsed (days through the period end, or through today for the period in progress), times that share. Each period's set-aside is then the combined self-employment and income tax to date less what earlier periods set aside, never below zero, as in ADR 0006.

## Consequences

- Each new year needs bracket rows and standard deductions as well as the `tax_years` row; the screen says a year isn't loaded until both exist.
- The early-quarter income tax follows the pace of the year so far; a business with a strongly seasonal year will see it move more than a steady one.
- `tax_brackets` and `tax_profiles` join the SL-05 security re-audit list. `tax_profiles` holds one personal fact (filing status) per account and is never shown to anyone else.
