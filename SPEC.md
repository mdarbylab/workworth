# WorkWorth — v1 Product Specification

**Status:** Draft 1 — 2026-09-06
**Owner:** Darby
**Promise:** Know where your time goes, what you earned, and what you actually made.

Requirement IDs for everything below are in [docs/requirements.md](docs/requirements.md);
each section names the ones it owns. Decisions are in [docs/adr/](docs/adr/). The
project follows the firm handbook named in `HANDBOOK_VERSION` (ADR 0004): this spec
is a living document, edited in the same PR as the code it describes.

---

## 1. Locked requirements

Requirements: REQ-001, REQ-002.

These do not change without Darby's say-so.

1. **Target user:** independent service professionals and small contractors with 1–10 people (handyman, cleaner, landscaper, electrician, plumber, photographer, consultant, small remodeling company).
2. **Free tier:** free forever for up to 2 people. No trial, no time limit.
3. **Usability:** a self-employed person can use it without instructions.
4. **Ambition:** a real commercial product, not a prototype. Foundation must handle real customers, multiple organizations, billing, and data security even though the v1 feature set is small.

## 2. What v1 is

Requirements: REQ-003.

The entire product revolves around one loop:

**Create job → Start timer → Stop timer → Add expenses → See profit → Export**

A new user should go from signup to a running timer in about 60 seconds.

### The v1 "aha" moment

```
Kitchen Remodel
14h 32m
Revenue:        $1,850
Expenses:       $312
Profit:         $1,538
Effective rate: $105.80/hr
```

## 3. What v1 is NOT

Not in v1: tax estimates, receipt scanning, payments, scheduling, payroll, HR, CRM, native mobile apps, integrations, AI features, multiple businesses per user, roles beyond owner/member. Invoicing shipped in Sprint 6 (§5.9); mileage shipped in Sprint 7 (§5.4); receipt *attachments* (not scanning) shipped in Sprint 8 (§5.4); tax estimates are being built as slices SL-02 to SL-04 (§5.10, §14) — the rest of this list stays deferred. Native mobile apps are deferred for v1 but not for good: the official release ships as iOS and Android apps (§14, Release).

The schema was designed so invoicing and tax estimates could be added without migration pain (see §7); invoicing used that room in Sprint 6, tax estimates still haven't. The client report (§5.8) is still not an invoice: it has no invoice number, no payment terms, no tax, and nothing is marked paid — that's what §5.9 is for.

## 4. The rule for adding anything

A feature ships only if it answers yes to: *Does this make it easier for a small independent business to understand time, money, or profit?*

---

## 5. Screens

### 5.0 Signed-out landing (Sprint 4, 2026-10-06)

Requirements: REQ-004, REQ-005.

A visitor with no session who hits `/` sees a real marketing page, not a
bare login form. Header (wordmark, Sign in / Get started) · hero (the
promise from the top of this doc, two CTAs) · the §2 "aha moment" example,
rendered as a real card, not a screenshot · the core loop as a step row ·
who it's for (§1's target-user list) · pricing (§9's real numbers, Free vs
Pro) · the legal footer. `/login` and `/signup` stay directly reachable and
unchanged; a signed-in visitor hitting `/` still redirects straight to
`/today` as before — this only changes what a signed-out visitor sees.

Navigation is a bottom bar on phone and a left rail on desktop. Five items:

`Today · Jobs · Time · Expenses · Reports` (Settings lives under the avatar).

### 5.1 Today (home)

Requirements: REQ-006, REQ-007.

- Greeting + date.
- Job picker (defaults to the last-used job).
- Big timer. One button: **START** / **STOP**.
- Below the line: today's entries grouped by job, total time, estimated earnings, expenses, estimated profit.
  Expenses shown is everything spent today, any job. Earnings and profit
  count hourly jobs only (§8.2: fixed-price revenue isn't earned per day) —
  so profit subtracts only the hourly-job (or unassigned) share of today's
  expenses, never a fixed-price job's cost. That job's own profit, including
  today's expense against it, shows on its job page.
- If a timer is running when the app opens, the screen shows it running with elapsed time — never a blank state.

### 5.2 Jobs

Requirements: REQ-009.

- List of active jobs. Each card: name, client, billing type, hours tracked, revenue, expenses, profit, effective rate.
- **+ New Job** → name, client (optional, type-ahead creates if new), billing type (hourly rate or fixed price), rate/price, estimated hours (optional), notes.
- Job detail: the summary block above + time entries for that job + expenses for that job + Archive button.
- Archived jobs are hidden from pickers but still count in reports.

### 5.3 Time

Requirements: REQ-010, REQ-025, REQ-035.

- Chronological list of time entries, grouped by day, filterable by job and person.
- **+ Add time** for manual entries (job, start, stop OR duration, notes).
- Tap an entry to edit. Editing never overwrites history (see §8.4).
- Owner sees everyone; member sees only their own.

### 5.4 Expenses

Requirements: REQ-011, REQ-046.

- List grouped by day; month total at top.
- **+ Add expense** → amount, date (defaults today), job (optional), category, description.
- Categories: Materials, Fuel, Tools, Supplies, Software, Subcontractor, Other, **Mileage**
  (Sprint 7, 2026-10-10). Mileage is free-plan like every other category — not a Pro
  feature. Selecting it swaps the dollar amount for a miles input; the amount is
  computed server-side as miles × the business's own mileage rate (Settings §5.6),
  never trusted from the client. The rate is a plain editable field, not derived from
  any "current IRS rate" in code — that number changes every year, so the business
  updates it themselves rather than WorkWorth silently going stale.
- **Receipt attachment** (Sprint 8, 2026-10-16, Pro only — §9): one photo (JPEG, PNG,
  WebP, HEIC) or PDF per expense, up to 4 MB, picked on the add/edit form. Choosing a
  new file replaces the old one; "Remove" clears it; deleting the expense deletes its
  receipt. The list marks expenses that have one. Files live in a **private** Supabase
  Storage bucket at `{organization_id}/{expense_id}/{file}`; storage policies let
  someone see a receipt only if they can see its expense (so on Pro, a member sees only
  their own). "View receipt" mints a signed link on every click that expires after a
  minute — there is never a permanent public URL. A business that drops back to free
  keeps viewing and removing the receipts it has, but can't add new ones. Not receipt
  *scanning*: nothing reads the file.

### 5.5 Reports

Requirements: REQ-012, REQ-013, REQ-014.

Answers four questions for a selected period (this week / this month / last month / custom):

```
How much did I work?          37h 42m
How much did I make?          $4,280
What did I spend?             $642
What did I actually make?     $3,638
Effective hourly rate:        $96.45
```

Then a breakdown table by job. **Export CSV** for time entries and for expenses. A client picker links through to the client report (§5.8).

### 5.6 Settings

Requirements: REQ-015.

- Business: name, timezone, currency (USD only in v1, field exists), and optional address, phone and contact email used only as the letterhead on client reports (§5.8).
- Mileage: rate per mile, used to compute mileage expenses (§5.4, Sprint 7). Free-plan too.
- People: list of members (max 2 on free). **Invite** by email. Remove member.
- Account: email, password, delete account.
- Plan: shows "Free — 2 of 2 seats used" and, when both seats are used, the only upsell in the product: *Add another person → upgrade.* (A waitlist link in v1; since Sprint 3 it opens Stripe Checkout, §9.)
- Legal: links to the Privacy Policy, Terms of Service and Impressum, plus a
  control to revisit the cookie-analytics choice.

### 5.7 Auth & onboarding

Requirements: REQ-002, REQ-016, REQ-017.

1. Sign up: name, email, password — or magic link. The name is required, because people are shown by name and never by email address.
2. "What's your business called?" → creates the organization, user becomes its creator.
3. "What are you working on first?" → creates first job.
4. Lands on Today with the timer ready.

Three screens, no tour.

Forgot password: the sign-in screen links to a page that asks for an email
and sends a reset link if an account exists for it. The response is the same
either way, so the flow can't be used to find out who has an account.
Following the link signs the browser in and lands on a page to set a new
password, then straight into the app — no separate sign-in step after.

An invite link is its own front door. Someone who follows `/invite/<token>` without an account sees who invited them and to what, and goes straight to sign-up with their email filled in — never to a bare login form they have to find their way out of.

### 5.8 Client report

Requirements: REQ-018.

The one screen whose output leaves the business. Picked from Reports: choose a client, get a printable document covering the selected period.

One document, one toggle — **Show rates and amounts**:

- **On** (default) → *Work summary*: dates, work done, hours, and amounts. For the client who is paying.
- **Off** → *Timesheet*: dates, work done, hours. For HR, or for a client who approves hours before an invoice.

Layout, top to bottom: business letterhead (name, plus whichever of address / phone / contact email are filled in) · document title and period · **Prepared for** the client · one table per job, grouped and subtotalled · grand totals · an **Approved by / Date** signature block · a footer naming the timezone.

Rules:

- **Expenses, profit, and effective hourly rate never appear.** Those are the business's numbers, not the client's.
- Only stopped time entries are included. A running timer is not work you can bill for yet.
- Fixed-price jobs show hours for the record and state the agreed price separately; hours do not change the price.
- Work on a job with no rate or price set is excluded from the total, and the screen warns about it. The warning does not print.
- Output is the browser's print-to-PDF. No PDF library in v1.

### 5.9 Invoices (Sprint 6, 2026-10-09, Pro only)

Requirements: REQ-019, REQ-020, REQ-021, REQ-022.

Created from a client report, not a separate form: on the Client report
screen, **Save as invoice** turns the statement's job breakdown into a
real, numbered invoice (`INV-0001`, sequential per business). One line
per priced job — hourly jobs bill the hours actually tracked, fixed jobs
bill the agreed price once. A job with no rate or price set is skipped
the same way it's excluded from the client report's total.

**Status:** `draft → sent → paid`, or `void` from `draft` or `sent`.
Never backward. A `draft` is freely editable — lines can be added,
changed, or removed, and the whole thing can be deleted. **Marking it
sent locks it**: the only way to fix a sent invoice is to void it and
create a replacement, the same "nothing silently overwritten" principle
as edited time entries (§8.4) — a document the client already has
shouldn't quietly change out from under them. Marking sent stamps the
issue date and a 14-day due date; marking paid is a plain record, not a
payment collection — WorkWorth doesn't take payments.

**Hours are only billed once.** An hourly job's tracked time is marked as
belonging to the invoice that billed it; a later invoice for the same
client correctly offers only the hours not yet billed, and the save
screen says so when some are skipped for this reason. A fixed-price job
bills its whole price the first time any of its hours are invoiced, so a
later invoice never re-offers it. Voiding an invoice frees its hours to
be billed correctly on a replacement.

The invoice list and each invoice's detail/print view live under
Reports, not a new nav item — SPEC §5.0's five-item nav is unchanged. The
detail view reuses the client report's printable layout exactly
(business letterhead, totals, no app chrome) via **Print or save as
PDF** — no PDF library here either.

Only the business's full-access person (same bar as Settings → Business)
can create, edit, or change an invoice's status — not just any member.
Invoicing itself is Pro only (§9); a free-plan business doesn't see the
"Save as invoice" control.

### 5.10 Tax estimates (SL-02 onward)

Requirements: REQ-047, REQ-048. Data model: ADR 0006.

Under Reports → **Tax estimates**, not a new nav item. A cash-flow planning
estimate of what to set aside for the IRS's quarterly estimated payments;
no filing, no return math, nothing paid.

- **Consent first.** The first visit shows a one-time disclaimer: an
  estimate, not tax advice, built from the profit Reports shows rather than
  money received, and to check with a tax professional. The account ticks a
  box to agree; the agreement is recorded per account and wording version
  (`tax_consents`) before any figure appears. New wording asks again.
- **Who sees it:** the full-access person only (same bar as Settings →
  Business), because the estimate needs the whole business's profit.
- **Self-employment tax (SL-02):** 92.35% of year-to-date profit, Social
  Security up to the year's wage base, Medicare on all of it, plus
  additional Medicare above the filing status's threshold; nothing under $400 of net earnings. Shown as a headline
  "set aside" for the next payment, then a row per IRS payment period
  (Jan–Mar, Apr–May, Jun–Aug, Sep–Dec) against its due date (Apr 15,
  Jun 15, Sep 15, Jan 15, moved past weekends and federal holidays). Each
  period sets aside the tax on year-to-date profit through its end less
  what earlier periods set aside, never below zero.
- **Federal income tax (SL-03, ADR 0007):** filing status (single,
  married filing jointly or separately, head of household) is picked on the
  screen and saved per account (`tax_profiles`); until then, single, and
  the screen says so. Taxable income is profit less half the
  self-employment tax and the standard deduction, through the year's
  brackets, assuming the business is the person's only income. No
  qualified business income deduction, so the estimate leans toward
  setting aside too much. Income tax to date is annualized: the year's tax
  at the pace so far, times the share of the year gone. Each period's
  set-aside covers both taxes together.
- **Rates** come from `tax_years` and `tax_brackets`, never from code.
  Until a year's rows exist the screen says so instead of guessing.
- A state estimate (SL-04) is added to the same screen.

---

## 6. Two-person model

Requirements: REQ-023 to REQ-027.

- **Organization** is the fundamental object. Every record belongs to an organization.
- A user can belong to exactly one organization in v1.
- **On the free plan the two people are peers.** Both see all of the business's time, expenses and reports, both can edit jobs and business settings, and both can invite. Role separation is what an upgrade buys, not something the free plan withholds.
- `role` still records who created the business. Two things stay with them: only they can remove someone, and only they can delete the business. Peers cannot evict each other.
- On Pro, `owner` and `member` mean what they say, and a member sees only their own activity. Enforced in `auth_is_owner()`, which every org-scoped policy already calls.
- Seat limit is per-org (`organizations.seat_limit`): Free = max 2 members
  (duos); Pro = max 10, matching §1's stated target market. Enforced
  server-side on invite and on acceptance, not only in the UI. A Pro org
  with more than 2 active members that downgrades keeps everyone — no
  forced removal — but can't invite past 2 again until back under the
  free limit.
- Removing a member keeps their historical entries attributed to them.
- Everyone has a **display name**, required at signup and when accepting an invite, editable in Settings. People are shown by name; email addresses are never used as a person's label.

---

## 7. Data model (Postgres / Supabase)

Requirements: REQ-008, REQ-028, REQ-029, REQ-030.

All tables have `id uuid`, `created_at`, `updated_at`. All org-scoped tables have `organization_id` and Row Level Security keyed on it.

| Table | Purpose | Key columns |
|---|---|---|
| `organizations` | the business | name, timezone, currency, plan (`free`/`pro`), seat_limit (2), invoice_seq (Sprint 6, per-org invoice counter), mileage_rate_cents (Sprint 7, default 67, business-editable), time_rounding_minutes (Sprint 7, nullable, Pro, off by default), time_rounding_mode (`up`/`nearest`/`down`), address, contact_email, contact_phone (all three optional, letterhead only) |
| `memberships` | user ↔ org | user_id, organization_id, role, display_name, invited_email, accepted_at, removed_at |
| `clients` | who the work is for | name, email, phone, notes |
| `jobs` | unit of work | client_id, name, billing_type (`hourly`/`fixed`), hourly_rate_cents, fixed_price_cents, estimated_minutes, status (`active`/`archived`), notes |
| `time_entries` | tracked time | job_id, user_id, started_at, stopped_at (null = running), duration_seconds (derived on stop), notes, source (`timer`/`manual`), invoiced_in_invoice_id (Sprint 6, nullable — which invoice, if any, billed this entry's hours) |
| `expenses` | money out | job_id (nullable), user_id, amount_cents, spent_on (date), category (incl. `mileage`, Sprint 7), miles (nullable, mileage only), description, receipt_path (Sprint 8, nullable — the receipt's object path in the private `receipts` Storage bucket) |
| `audit_events` | change history | actor_user_id, table_name, record_id, action, before (jsonb), after (jsonb) |
| `invoices` | a billed document for a client (§5.9, Sprint 6) | organization_id, client_id (nullable), number (`INV-0001`, sequential per org), status (`draft`/`sent`/`paid`/`void`), issued_on, due_on, total_cents (derived — see invoice_lines) |
| `invoice_lines` | one invoice's line items | organization_id, invoice_id, job_id (nullable, traceability only), description, quantity, unit_cents, total_cents (`invoices.total_cents` is a trigger-maintained sum of these, never written directly by app code) |
| `tax_years` | tax rates by year (§5.10, SL-02; not org-scoped, read-only reference data) | tax_year (key), se_earnings_factor_bp, social_security_rate_bp, social_security_wage_base_cents, medicare_rate_bp, additional_medicare_rate_bp, additional_medicare_threshold_{single,joint,separate}_cents, standard_deduction_{single,joint,separate,head}_cents (SL-03), source. Rates in basis points, amounts in cents |
| `tax_brackets` | federal income tax brackets (§5.10, SL-03; read-only reference data) | tax_year, filing_status, lower_cents, rate_bp: the rate on income above lower_cents, up to the next row's |
| `tax_profiles` | the account's filing status (§5.10, SL-03; per account) | user_id (key), filing_status (`single`/`joint`/`separate`/`head`), updated_at |
| `tax_consents` | the tax disclaimer agreement (§5.10, SL-02; per account, not org-scoped) | user_id, disclaimer_version, agreed_at (database clock) |
| `subscriptions` | Pro billing (Sprint 3) | organization_id (unique), stripe_customer_id (unique), stripe_subscription_id, status (`trialing`/`active`/`past_due`/`canceled`/`incomplete`/`incomplete_expired`/`unpaid`), current_period_end, cancel_at (nullable — Stripe's own cancellation-scheduled timestamp; not always equal to current_period_end, e.g. a trial cancels at the trial's end), price_interval (`month`/`year`) |

Rules:
- Money is stored in integer cents. Never floats.
- Timestamps are `timestamptz` in UTC. Day grouping uses the organization's timezone.
- One running timer per user (partial unique index on `user_id where stopped_at is null`).
- `subscriptions` and `organizations.plan` are written only by the Stripe
  webhook (`apply_stripe_subscription_event`, security-definer, granted to
  `anon` since the webhook has no user session). App code never writes
  either directly.

---

## 8. Calculation rules

### 8.1 Time

Requirements: REQ-010, REQ-031, REQ-032.
- Duration = `stopped_at − started_at`, in seconds. Displayed as `Xh Ym`.
- Stored duration is never rounded. **Billing rounding** (Pro, Sprint 7,
  2026-10-11) is a per-org setting (off by default) that rounds each time
  entry to the nearest 5/10/15/30 minutes — up, down, or to nearest — but
  only at the point revenue is computed (job revenue, Reports, Client
  Report, Invoices). Today, Time and Jobs' "hours tracked" always show the
  real duration; only the dollar amount (and, on an invoice line, its
  displayed hours) reflects rounding. "Effective hourly rate" still divides
  by real tracked hours, not billed hours — it measures what your actual
  time turned into, not a rounding artifact.
- An entry cannot stop before it starts; max single entry 24h (longer → warn, allow).

### 8.2 Revenue

Requirements: REQ-033.
- Hourly job: `revenue = hours × hourly_rate` where hours = total tracked seconds ÷ 3600 (not rounded).
- Fixed job: `revenue = fixed_price` regardless of hours.

### 8.3 Profit and rate

Requirements: REQ-034.
- `profit = revenue − sum(expenses on that job)`
- `effective_rate = profit ÷ hours`. If hours = 0, show "—", never divide by zero.
  Also "—" under one minute of tracked time: the duration display itself
  rounds anything under a minute to "0m" (§8.1), so a rate shown next to it
  would have no visible denominator behind it — a few seconds of tracked
  time could otherwise show as a wildly inflated rate alongside "0m". This
  doesn't round the stored duration, only suppresses the rate display.
- Reports: org-level totals sum the same numbers across jobs. Expenses with no job count toward the org total but no job.
- Everything is labeled "estimated" until invoicing exists.

### 8.4 Edit history

Requirements: REQ-035.
- Every create/update/delete on `time_entries` and `expenses` writes an `audit_events` row with before/after snapshots.
- The UI shows "Edited" on changed entries; tapping shows the original values.
- Nothing is silently overwritten. This is the trust feature.

---

## 9. Free vs paid boundary

Requirements: REQ-001, REQ-022, REQ-025, REQ-026, REQ-036, REQ-037, REQ-046.

**Free — $0 forever:** 2 people, unlimited jobs and time entries, expenses, dashboard, reports, CSV export.

**Pro — $25/mo or $240/yr ($20/mo billed annually), 14-day free trial,
self-serve via Stripe Checkout (Sprint 3, 2026-10-04; repriced 2026-10-07
— see [docs/history.md](docs/history.md) for the reasoning):** real **roles
and permissions** — `auth_is_owner()` already splits owner/member once
`plan = 'pro'`, so this activates the moment a checkout completes, with no
separate UI to build. **Up to 10 people** (Sprint 5, 2026-10-07) — §6 has
the enforcement detail. A tier for teams past 10 is a deliberate later
decision, not named or priced here. **Invoicing** (Sprint 6, 2026-10-09)
— §5.9 has the detail; a free-plan business doesn't see the "Save as
invoice" control. **Billing rounding** (Sprint 7, 2026-10-11) — §8.1 has
the detail; off by default, a free-plan business doesn't see the Settings
control at all. (Mileage, Sprint 7, 2026-10-10, is free-plan too — §5.4 —
not a Pro feature, just another expense category.) **Receipt
attachments** (Sprint 8, 2026-10-16) — §5.4 has the detail; a free-plan
business doesn't see the upload control. What's still unscoped future
work: tax estimates, integrations.

Billing (upgrade, cancel, payment method) is restricted to the person who
created the business (`role = 'owner'`) — the same "only the creator"
bucket as deleting the business or removing a member. Peers on free, and
non-creator members on Pro, see the plan/seat info read-only. Stripe's
hosted Customer Portal handles cancellation, payment-method changes and
invoice history; there's no custom UI for any of that.

v1 built only the free plan; Sprint 3 added Pro billing. The `plan` and
`seat_limit` columns on `organizations`, and the `subscriptions` table,
exist exactly so this was a data/webhook change, not a rewrite — see §7.

---

## 10. Technical stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind. Responsive web app; installable as a PWA. No native apps in v1; the official release ships as iOS and Android apps (§14, Release), and how is still open.
- **Backend/DB/Auth:** Supabase (Postgres, Auth, Row Level Security). Email/password + magic link. Google/Apple sign-in later.
- **Hosting:** Netlify (already connected). Preview deploys per branch.
- **Payments:** Stripe Checkout (subscriptions) + Stripe Customer Portal, live as of Sprint 3.
- **Analytics:** PostHog free tier (or Plausible). Events listed in §12.
- **Repo:** github.com/mdarbylab/workworth (public, so nothing in it may identify a customer or hold a credential).

---

## 11. Security

Requirements: REQ-030, REQ-038 to REQ-044, REQ-046.

- RLS on every org-scoped table; no client query can read another org's rows.
- All writes go through server actions that re-check membership and role.
- Seat limit enforced server-side.
- Receipts (§5.4) live in a private Storage bucket, never public. Storage policies key on
  the org id in the object path and on the caller's own access to the expense; viewing
  is only by signed links that expire after a minute.
- Secrets in Netlify/Supabase env vars, never in the repo. `.env*` is gitignored from commit one.
- Backups: the Supabase free plan has none, so a nightly GitHub Actions job dumps the database, encrypts it and stores it in a separate private repository ([docs/backups.md](docs/backups.md)). Point-in-time recovery **(planned)**: when there are paying customers, which needs the Supabase Pro plan.
- No selling or sharing of user data. Minimal personal data collected (email only).
- Browser analytics only run after the visitor accepts the cookie banner; a
  decline (or no answer) means the PostHog client never loads. `/privacy`,
  `/terms` and `/impressum` are public pages, linked from Settings and from
  every signed-out screen.

---

## 12. Analytics events

Requirements: REQ-041.

`signup`, `org_created`, `job_created`, `timer_started`, `timer_stopped`, `time_entry_manual`, `time_entry_edited`, `expense_added`, `report_viewed`, `client_report_viewed`, `csv_exported`, `member_invited`, `member_joined`, `seat_limit_hit`, `checkout_started`, `checkout_completed`, `invoice_created`, `invoice_sent`, `invoice_paid`, `invoice_voided`.

**North-star metric for v1:** % of new users who track time on 3 different days in their first 2 weeks. If this is bad, we fix the product before adding features.

---

## 13. Acceptance criteria (v1 done when all pass)

1. New user reaches a running timer within 60 seconds of landing on signup. (REQ-003)
2. Timer survives page refresh, tab close, and phone lock; elapsed time is correct. (REQ-006)
3. Two people in one org can each track time and expenses, and on the free plan each sees the whole business. Neither can remove the other; only the creator can delete the business, and neither can promote themselves. (REQ-024)
4. A third invite is refused server-side with a clear message. (REQ-026)
5. Job summary numbers match a hand calculation for one hourly job and one fixed job with expenses. (REQ-033, REQ-034)
6. Editing a time entry keeps the original visible in history. (REQ-035)
7. Reports for "this month" match the sum of the underlying entries. (REQ-013)
8. CSV export opens cleanly in Excel with correct times in the org's timezone. (REQ-014)
9. No org can read another org's data (tested with two accounts). (REQ-038)
10. Works on iPhone Safari, Android Chrome, and desktop Chrome at 375px and 1280px widths. (REQ-045)
11. Deployed on Netlify with a production Supabase project; env vars not in repo. (REQ-040)
12. A client report shows hours, and amounts only when the toggle is on. It never shows expenses, profit, or effective hourly rate, and it prints on one clean page per few jobs with no app chrome. (REQ-018)

---

## 14. Build order (slices)

Sprints are retired (ADR 0004, firm ADR 0002). Work now moves as thin
end-to-end slices on a Kanban board, at most two in progress, each tracing to
requirement IDs. The order below is the owner's, set on 2026-10-09 when the
last sprints were scoped; it carries over unchanged.

### Done

| Slice | Scope |
|---|---|
| v1, sprints 1–7 | Foundation, time, money, reports, team, polish, beta. Launched as the free 2-person version (2026-09-26). |
| Sprint 3 (post-launch) | Pro billing via Stripe Checkout and Customer Portal (§9) |
| Sprint 4 | Signed-out landing page and SEO (§5.0) |
| Sprint 5 | 10-person seat cap for Pro, plus the seat-limit health check (§6) |
| Sprint 6 | Invoicing (§5.9) |
| Sprint 7 | Mileage expenses (§5.4) and billing rounding (§8.1) |
| Sprint 8 | Receipt attachments on expenses (§5.4) |
| SL-02 | Tax estimates part 1: consent gate and self-employment tax (§5.10). Merged 2026-10-17 (PR #36); the owner applied its migration to the live database the same day |

What happened in each, and why, is in [docs/history.md](docs/history.md).

### Next, in order

| Slice | Scope | Requirements |
|---|---|---|
| SL-01 | Live check of the 10-seat cap through the real invite, signup and accept screens: invite up to 10 accounts on the live Pro org, confirm each accepts, confirm the 11th is refused with the plan-aware message. Needs the owner (real accounts and sign-in are off-limits to Claude). Not blocking anything: the database-level limit was already proven live on 2026-10-07. | REQ-026 |
| SL-03 *(in progress)* | **Tax estimates, part 2: federal income tax**, bracket-based, with filing status as an input. | REQ-047 |
| SL-04 | **Tax estimates, part 3: state.** No-tax and flat-rate states get an exact estimate; progressive-bracket states (CA, NY and others) get a clearly labelled single effective-rate approximation with extra caveat language, not full bracket modelling. | REQ-047 |
| SL-05 | **Security-hardening close**, before any integration opens an external connection: re-audit every RLS policy and security-definer function added since Sprint 5 (seat limit, invoicing, mileage, receipts and their storage policies, tax estimates) for consistency and least privilege; re-check the receipt bucket's policies; revisit the deferred Supabase performance lints; run the `security-review` skill as a structured pass; add an automated cross-tenant leak test suite (handbook quality gate, **(planned)** here). | REQ-038, REQ-039 |

Tax estimates are a cash-flow planning estimate, not a filing tool: no
e-filing and no return math. Two decisions were taken knowingly on
2026-10-09: federal **and** state, not federal only; and approximating
progressive-bracket states rather than modelling them. Who updates the
rate tables each January was settled when the owner merged SL-02
(2026-10-17): Claude adds the new year's rows by migration each December
once the SSA publishes the wage base (October) and the IRS publishes the
year's figures, the owner approves it like any other PR, and until it
lands the screen says the year isn't loaded rather than guessing. Open with
SL-03, for the owner at merge: whether to add a simplified qualified
business income deduction (ADR 0007 leaves it out).

### Release

The owner set this on 2026-10-17: **the official release ships as iOS and
Android apps** (REQ-049, Proposed), alongside the web app at
workworth.de. It is not yet a slice. Still open, each needing the owner and
an ADR before any code: how the apps are built (a wrapper around the
existing web app, such as Capacitor, or a separate native codebase); what
"official release" means against today's live web v1; how Pro is sold
inside the apps, since Apple and Google have their own rules for in-app
subscriptions; and where the work sits relative to SL-01 to SL-05.

### Backlog (not yet scoped)

- **Integrations.** No target named yet; "integrations" alone names nothing
  concrete. Comes after SL-05 on purpose: more external connections want a
  harder perimeter first. Scope it, with a requirement ID, once there is a
  specific integration in mind.
