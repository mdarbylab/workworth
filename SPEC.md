# WorkWorth — v1 Product Specification

**Status:** Draft 1 — 2026-09-06
**Owner:** Darby
**Promise:** Know where your time goes, what you earned, and what you actually made.

---

## 1. Locked requirements

These do not change without Darby's say-so.

1. **Target user:** independent service professionals and small contractors with 1–10 people (handyman, cleaner, landscaper, electrician, plumber, photographer, consultant, small remodeling company).
2. **Free tier:** free forever for up to 2 people. No trial, no time limit.
3. **Usability:** a self-employed person can use it without instructions.
4. **Ambition:** a real commercial product, not a prototype. Foundation must handle real customers, multiple organizations, billing, and data security even though the v1 feature set is small.

## 2. What v1 is

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

Not in v1: invoicing, tax estimates, mileage, receipt scanning, payments, scheduling, payroll, HR, CRM, native mobile apps, integrations, AI features, multiple businesses per user, roles beyond owner/member.

The schema is designed so invoicing and tax estimates can be added without migration pain (see §7), but no code is written for them in v1. The client report (§5.8) is not an invoice: it has no invoice number, no payment terms, no tax, and nothing is marked paid.

## 4. The rule for adding anything

A feature ships only if it answers yes to: *Does this make it easier for a small independent business to understand time, money, or profit?*

---

## 5. Screens

### 5.0 Signed-out landing (Sprint 4, 2026-10-06)

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

- List of active jobs. Each card: name, client, billing type, hours tracked, revenue, expenses, profit, effective rate.
- **+ New Job** → name, client (optional, type-ahead creates if new), billing type (hourly rate or fixed price), rate/price, estimated hours (optional), notes.
- Job detail: the summary block above + time entries for that job + expenses for that job + Archive button.
- Archived jobs are hidden from pickers but still count in reports.

### 5.3 Time

- Chronological list of time entries, grouped by day, filterable by job and person.
- **+ Add time** for manual entries (job, start, stop OR duration, notes).
- Tap an entry to edit. Editing never overwrites history (see §8.4).
- Owner sees everyone; member sees only their own.

### 5.4 Expenses

- List grouped by day; month total at top.
- **+ Add expense** → amount, date (defaults today), job (optional), category, description.
- Categories are fixed in v1: Materials, Fuel, Tools, Supplies, Software, Subcontractor, Other.
- Receipt attachment: **not in v1** (column exists, UI does not).

### 5.5 Reports

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

- Business: name, timezone, currency (USD only in v1, field exists), and optional address, phone and contact email used only as the letterhead on client reports (§5.8).
- People: list of members (max 2 on free). **Invite** by email. Remove member.
- Account: email, password, delete account.
- Plan: shows "Free — 2 of 2 seats used" and, when both seats are used, the only upsell in the product: *Add another person → upgrade.* (Upgrade is a waitlist link in v1, not a checkout.)
- Legal: links to the Privacy Policy, Terms of Service and Impressum, plus a
  control to revisit the cookie-analytics choice.

### 5.7 Auth & onboarding

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

---

## 6. Two-person model

- **Organization** is the fundamental object. Every record belongs to an organization.
- A user can belong to exactly one organization in v1.
- **On the free plan the two people are peers.** Both see all of the business's time, expenses and reports, both can edit jobs and business settings, and both can invite. Role separation is what an upgrade buys, not something the free plan withholds.
- `role` still records who created the business. Two things stay with them: only they can remove someone, and only they can delete the business. Peers cannot evict each other.
- On Pro, `owner` and `member` mean what they say, and a member sees only their own activity. Enforced in `auth_is_owner()`, which every org-scoped policy already calls.
- Free plan = max 2 members. Enforced server-side on invite acceptance, not only in the UI.
- Removing a member keeps their historical entries attributed to them.
- Everyone has a **display name**, required at signup and when accepting an invite, editable in Settings. People are shown by name; email addresses are never used as a person's label.

---

## 7. Data model (Postgres / Supabase)

All tables have `id uuid`, `created_at`, `updated_at`. All org-scoped tables have `organization_id` and Row Level Security keyed on it.

| Table | Purpose | Key columns |
|---|---|---|
| `organizations` | the business | name, timezone, currency, plan (`free`/`pro`), seat_limit (2), address, contact_email, contact_phone (all three optional, letterhead only) |
| `memberships` | user ↔ org | user_id, organization_id, role, display_name, invited_email, accepted_at, removed_at |
| `clients` | who the work is for | name, email, phone, notes |
| `jobs` | unit of work | client_id, name, billing_type (`hourly`/`fixed`), hourly_rate_cents, fixed_price_cents, estimated_minutes, status (`active`/`archived`), notes |
| `time_entries` | tracked time | job_id, user_id, started_at, stopped_at (null = running), duration_seconds (derived on stop), notes, source (`timer`/`manual`) |
| `expenses` | money out | job_id (nullable), user_id, amount_cents, spent_on (date), category, description, receipt_path (unused in v1) |
| `audit_events` | change history | actor_user_id, table_name, record_id, action, before (jsonb), after (jsonb) |
| `invoices`, `invoice_lines` | **created empty in v1** for later | — |
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
- Duration = `stopped_at − started_at`, in seconds. Displayed as `Xh Ym`.
- No rounding in v1. (Rounding is a paid feature later.)
- An entry cannot stop before it starts; max single entry 24h (longer → warn, allow).

### 8.2 Revenue
- Hourly job: `revenue = hours × hourly_rate` where hours = total tracked seconds ÷ 3600 (not rounded).
- Fixed job: `revenue = fixed_price` regardless of hours.

### 8.3 Profit and rate
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
- Every create/update/delete on `time_entries` and `expenses` writes an `audit_events` row with before/after snapshots.
- The UI shows "Edited" on changed entries; tapping shows the original values.
- Nothing is silently overwritten. This is the trust feature.

---

## 9. Free vs paid boundary

**Free — $0 forever:** 2 people, unlimited jobs and time entries, expenses, dashboard, reports, CSV export.

**Pro — $25/mo or $240/yr ($20/mo billed annually), 14-day free trial,
self-serve via Stripe Checkout (Sprint 3, 2026-10-04; repriced 2026-10-07
— see "Where things stand" in CLAUDE.md for the reasoning):** real **roles
and permissions** — `auth_is_owner()` already splits owner/member once
`plan = 'pro'`, so this activates the moment a checkout completes, with no
separate UI to build. Still just a data change for everything else Pro is
meant to unlock later: more seats, invoicing, tax estimates, mileage,
receipt storage, rounding rules, integrations — `seat_limit` stays at 2 for
Pro orgs for now; raising it is the next scoped sprint (2026-10-07).

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

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind. Responsive web app; installable as a PWA. No native apps.
- **Backend/DB/Auth:** Supabase (Postgres, Auth, Row Level Security). Email/password + magic link. Google/Apple sign-in later.
- **Hosting:** Netlify (already connected). Preview deploys per branch.
- **Payments:** Stripe Checkout (subscriptions) + Stripe Customer Portal, live as of Sprint 3.
- **Analytics:** PostHog free tier (or Plausible). Events listed in §12.
- **Repo:** github.com/<darby>/workworth (private).

---

## 11. Security

- RLS on every org-scoped table; no client query can read another org's rows.
- All writes go through server actions that re-check membership and role.
- Seat limit enforced server-side.
- Secrets in Netlify/Supabase env vars, never in the repo. `.env*` is gitignored from commit one.
- Supabase daily backups on. Point-in-time recovery when there are paying customers.
- No selling or sharing of user data. Minimal personal data collected (email only).
- Browser analytics only run after the visitor accepts the cookie banner; a
  decline (or no answer) means the PostHog client never loads. `/privacy`,
  `/terms` and `/impressum` are public pages, linked from Settings and from
  every signed-out screen.

---

## 12. Analytics events

`signup`, `org_created`, `job_created`, `timer_started`, `timer_stopped`, `time_entry_manual`, `time_entry_edited`, `expense_added`, `report_viewed`, `client_report_viewed`, `csv_exported`, `member_invited`, `member_joined`, `seat_limit_hit`, `checkout_started`, `checkout_completed`.

**North-star metric for v1:** % of new users who track time on 3 different days in their first 2 weeks. If this is bad, we fix the product before adding features.

---

## 13. Acceptance criteria (v1 done when all pass)

1. New user reaches a running timer within 60 seconds of landing on signup.
2. Timer survives page refresh, tab close, and phone lock; elapsed time is correct.
3. Two people in one org can each track time and expenses, and on the free plan each sees the whole business. Neither can remove the other; only the creator can delete the business, and neither can promote themselves.
4. A third invite is refused server-side with a clear message.
5. Job summary numbers match a hand calculation for one hourly job and one fixed job with expenses.
6. Editing a time entry keeps the original visible in history.
7. Reports for "this month" match the sum of the underlying entries.
8. CSV export opens cleanly in Excel with correct times in the org's timezone.
9. No org can read another org's data (tested with two accounts).
10. Works on iPhone Safari, Android Chrome, and desktop Chrome at 375px and 1280px widths.
11. Deployed on Netlify with a production Supabase project; env vars not in repo.
12. A client report shows hours, and amounts only when the toggle is on. It never shows expenses, profit, or effective hourly rate, and it prints on one clean page per few jobs with no app chrome.

---

## 14. Build order

| Sprint | Scope |
|---|---|
| 1 — Foundation | repo, Next.js, Supabase project, schema + RLS, auth, org creation, onboarding, nav shell |
| 2 — Time | jobs, timer, manual entries, edit with history, Today screen totals |
| 3 — Money | hourly/fixed pricing, expenses, revenue/profit/rate on jobs |
| 4 — Reports | period selector, four questions, per-job table, CSV export |
| 5 — Team | invites, member role, seat limit, Settings |
| 6 — Polish | empty states, errors, loading, PWA, mobile QA |
| 7 — Beta | Netlify prod, analytics, feedback link, monitoring, upgrade waitlist |

Then launch the free 2-person version.
