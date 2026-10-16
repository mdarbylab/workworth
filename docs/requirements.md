# Requirements and traceability

Derived from [SPEC.md](../SPEC.md) on 2026-10-16, when WorkWorth adopted the firm handbook (ADR 0004). The spec stays the source of intent; this file gives each testable obligation a stable ID so code, tests and PRs can point at it. Each spec section names the IDs it owns.

Status: `Proposed` → `Approved` → `Implemented` → `Verified`. `Verified` only when a named automated test passes in CI (`npm run verify`). Never reuse or renumber an ID; a retired one is `Withdrawn`. Verification: **T** automated test, **I** inspection, **D** demonstration.

Everything shipped before 2026-10-16 was approved by the owner when its sprint merged, so it starts at `Implemented`, or `Verified` where a named test already covers it. Most of the product is still checked by inspection and demonstration; that is a known gap, not a claim.

| ID | Requirement | Spec ref | Verify | Slice | Status |
|---|---|---|---|---|---|
| REQ-001 | The free plan is free forever for up to 2 people, with no trial and no time limit | 1.2, 9 | I | v1 | Implemented |
| REQ-002 | Onboarding is three screens (name, business, first job) with no tour, landing on Today with the timer ready | 1.3, 5.7 | D | v1 | Implemented |
| REQ-003 | A new user reaches a running timer within 60 seconds of landing on signup | 2, 13.1 | D | v1 | Implemented |
| REQ-004 | A signed-out visitor at `/` sees the marketing page; a signed-in visitor is redirected to `/today` | 5.0 | D | Sprint 4 | Implemented |
| REQ-005 | The Open Graph image, `robots.txt` and `sitemap.xml` are reachable without a session | 5.0 | I | Sprint 4 | Implemented |
| REQ-006 | Today has one START/STOP timer that defaults to the last-used job, and a running timer is shown running with correct elapsed time after refresh, tab close or phone lock | 5.1, 13.2 | D | v1 | Implemented |
| REQ-007 | Today's Expenses tile counts everything spent today; earnings and profit count hourly jobs only, and profit subtracts only hourly-job or unassigned expenses | 5.1 | D | v1 | Implemented |
| REQ-008 | A user has at most one running timer (partial unique index on `time_entries`) | 7 | I | v1 | Implemented |
| REQ-009 | A job is hourly or fixed-price; its card shows hours, revenue, expenses, profit and effective rate; an archived job is hidden from pickers but still counts in reports | 5.2 | D | v1 | Implemented |
| REQ-010 | Time can be added manually; an entry cannot stop before it starts; an entry over 24h warns but is allowed | 5.3, 8.1 | D | v1 | Implemented |
| REQ-011 | Expenses carry one of the listed categories; a mileage expense's amount is computed server-side as miles × the org's mileage rate and never taken from the client | 5.4 | I | Sprint 7 | Implemented |
| REQ-012 | Report periods resolve to this week, this month, last month or a custom range in the org's timezone, falling back to this month on missing or invalid input | 5.5 | T | v1 | Verified |
| REQ-013 | Reports answer the four questions for the period, with a per-job table, and "this month" matches the sum of the underlying entries | 5.5, 13.7 | D | v1 | Implemented |
| REQ-014 | CSV export of time entries and expenses opens cleanly in Excel with times in the org's timezone | 5.5, 13.8 | D | v1 | Implemented |
| REQ-015 | Settings covers business details, mileage rate, people, account, plan and legal links | 5.6 | D | v1 | Implemented |
| REQ-016 | Signup requires a display name; the forgot-password response is the same whether or not an account exists | 5.7 | I | v1 | Implemented |
| REQ-017 | An invite link shows who invited the visitor and to what, and goes to sign-up with the email filled in | 5.7 | D | v1 | Implemented |
| REQ-018 | The client report never shows expenses, profit or effective rate; it includes only stopped entries, shows amounts only when the toggle is on, and excludes unpriced work from the total with an on-screen (non-printing) warning | 5.8, 13.12 | I | v1 | Implemented |
| REQ-019 | An invoice is created from a client report and numbered `INV-0001` onward, sequential per org, without collisions under concurrent creates | 5.9 | T, I | Sprint 6 | Implemented |
| REQ-020 | Invoice status moves `draft → sent → paid`, or to `void` from draft or sent, never backward; marking sent locks the invoice | 5.9 | I | Sprint 6 | Implemented |
| REQ-021 | Tracked hours are invoiced at most once; a fixed-price job is invoiced once in full; voiding an invoice frees its hours | 5.9 | T | Sprint 6 | Verified |
| REQ-022 | Invoicing is Pro only, and only the org's full-access person can create or change an invoice | 5.9, 9 | I | Sprint 6 | Implemented |
| REQ-023 | Every record belongs to one organization, and a user belongs to exactly one organization | 6 | I | v1 | Implemented |
| REQ-024 | On the free plan both people have full access; only the creator can remove someone or delete the business; nobody can promote themselves | 6, 13.3 | I | v1 | Implemented |
| REQ-025 | On Pro, owner and member roles separate access, and a member sees only their own activity | 6, 9 | I | Sprint 3 | Implemented |
| REQ-026 | The seat limit is enforced server-side on invite and on acceptance: 2 on Free, 10 on Pro; a downgraded org keeps its members but cannot invite past the new limit | 6, 13.4 | I | Sprint 5 | Implemented |
| REQ-027 | People are shown by display name, never by email address | 6 | I | v1 | Implemented |
| REQ-028 | Money is stored and computed in integer cents, never floats | 7 | I | v1 | Implemented |
| REQ-029 | Timestamps are stored in UTC and grouped into days in the org's timezone, correct across DST transitions | 7 | T | v1 | Verified |
| REQ-030 | `subscriptions` and `organizations.plan` are written only by the Stripe webhook, after verifying the Stripe signature | 7, 9 | I | Sprint 3 | Implemented |
| REQ-031 | Stored durations are never rounded; billing rounding (Pro, off by default, 5/10/15/30 minutes, up/nearest/down) rounds each entry individually | 8.1 | T | Sprint 7 | Verified |
| REQ-032 | Billing rounding applies only where revenue is computed (job revenue, Reports, Client report, Invoices), and effective rate still divides by real tracked hours | 8.1 | I | Sprint 7 | Implemented |
| REQ-033 | Hourly revenue is unrounded hours × rate, rounded to the cent; fixed revenue is the fixed price regardless of hours | 8.2, 13.5 | T | v1 | Verified |
| REQ-034 | Profit is revenue minus the job's expenses; effective rate is profit ÷ hours, shown as "—" at zero or under one minute of tracked time | 8.3, 13.5 | T | v1 | Verified |
| REQ-035 | Every create, update and delete on time entries and expenses writes an audit event with before and after snapshots, and the UI shows "Edited" with the original values | 8.4, 13.6 | I | v1 | Implemented |
| REQ-036 | Pro is sold through Stripe Checkout (monthly or annual, 14-day trial); billing is creator-only; cancellation and payment methods go through Stripe's Customer Portal | 9 | D | Sprint 3 | Implemented |
| REQ-037 | The plan label reflects the subscription's state, using Stripe's `cancel_at` for a scheduled cancellation | 9 | T | Sprint 3 | Verified |
| REQ-038 | No organization can read or write another organization's rows (RLS on every org-scoped table) | 11, 13.9 | I | v1 | Implemented |
| REQ-039 | All writes go through server actions that re-check membership and role; no client-reachable code uses a service-role key | 11 | I | v1 | Implemented |
| REQ-040 | No secrets or customer data are committed; secrets live in Netlify, Supabase and GitHub settings | 11, 13.11 | T, I | v1 | Implemented |
| REQ-041 | Browser analytics load only after the visitor accepts the cookie banner; events carry ids only, never emails or free text | 11, 12 | I | v1 | Implemented |
| REQ-042 | `/privacy`, `/terms` and `/impressum` are public and linked from Settings and every signed-out screen | 11 | I | v1 | Implemented |
| REQ-043 | `/api/health` returns 503 when the database does not answer or the seat-limit triggers are missing or disabled | 11 | I | Sprint 5 | Implemented |
| REQ-044 | The database is dumped nightly, encrypted, to a separate private repository | 11 | I | v1 | Implemented |
| REQ-045 | The app works on iPhone Safari, Android Chrome and desktop Chrome at 375px and 1280px | 13.10 | D | v1 | Implemented |
| REQ-046 | Receipts (Pro only) are stored in a private Supabase Storage bucket under `{organization_id}/{expense_id}/{file}`, visible only to someone who can see the expense; uploads are images or PDF up to 4 MB; viewing is only through a signed link that expires after a minute | 5.4, 11 | T, I | Sprint 8 | Implemented |
| REQ-047 | Tax estimates show a quarterly "set aside" amount (self-employment tax, federal income tax by filing status, and a state estimate) against the four IRS due dates, from rate tables versioned by `tax_year`; progressive-bracket states are labelled as an effective-rate approximation | 14 (SL-02 to SL-04) | T | SL-02 to SL-04 | Approved |
| REQ-048 | Tax estimates unlock only after the account explicitly agrees to a one-time disclaimer, recorded per account | 14 (SL-02) | T | SL-02 | Approved |

## Verification evidence

| ID | Named tests (all run by `npm run verify` in CI) |
|---|---|
| REQ-012 | `lib/periods.test.ts`: `resolvePeriod — month (default/fallback)`, `— week`, `— last-month`, `— custom`, `periodQuery` |
| REQ-019 | `lib/invoices.test.ts`: `formatInvoiceNumber` (format only; sequence atomicity was checked live on 2026-10-09, see docs/history.md) |
| REQ-021 | `lib/invoices.test.ts`: `deriveInvoiceLines` |
| REQ-029 | `lib/dates.test.ts`: `tzOffsetMs`, `zonedToUtc`, `dateKey`, `startOfDay`, `parseDateTime` |
| REQ-031 | `lib/calc.test.ts`: `roundSeconds`, `roundingConfigFor` |
| REQ-033 | `lib/calc.test.ts`: `revenueCents` |
| REQ-034 | `lib/calc.test.ts`: `profitCents`, `effectiveRateCents`, `the formatDuration / effectiveRateCents boundary`, `formatRate` |
| REQ-037 | `lib/billing.test.ts`: `subscriptionStatusLabel` |
| REQ-046 | `lib/receipts.test.ts`: `checkReceipt`, `receiptPath` (file checks and path shape only; storage policies were checked live on 2026-10-16, see docs/history.md) |
| REQ-040 | `scripts/secret-scan.sh` (`npm run scan:secrets`) covers committed secrets; customer data is by inspection |
