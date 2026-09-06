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

The schema is designed so invoicing and tax estimates can be added without migration pain (see §7), but no code is written for them in v1.

## 4. The rule for adding anything

A feature ships only if it answers yes to: *Does this make it easier for a small independent business to understand time, money, or profit?*

---

## 5. Screens

Navigation is a bottom bar on phone and a left rail on desktop. Five items:

`Today · Jobs · Time · Expenses · Reports` (Settings lives under the avatar).

### 5.1 Today (home)

- Greeting + date.
- Job picker (defaults to the last-used job).
- Big timer. One button: **START** / **STOP**.
- Below the line: today's entries grouped by job, total time, estimated earnings, expenses, estimated profit.
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

Then a breakdown table by job. **Export CSV** for time entries and for expenses.

### 5.6 Settings

- Business: name, timezone, currency (USD only in v1, field exists).
- People: list of members (max 2 on free). **Invite** by email. Remove member.
- Account: email, password, delete account.
- Plan: shows "Free — 2 of 2 seats used" and, when both seats are used, the only upsell in the product: *Add another person → upgrade.* (Upgrade is a waitlist link in v1, not a checkout.)

### 5.7 Auth & onboarding

1. Sign up (email + password) or magic link.
2. "What's your business called?" → creates the organization, user becomes owner.
3. "What are you working on first?" → creates first job.
4. Lands on Today with the timer ready.

Three screens, no tour.

---

## 6. Two-person model

- **Organization** is the fundamental object. Every record belongs to an organization.
- A user can belong to exactly one organization in v1.
- Roles: `owner` (full access, business-level view) and `member` (own time and expenses, sees own activity only).
- Free plan = max 2 members. Enforced server-side on invite acceptance, not only in the UI.
- Removing a member keeps their historical entries attributed to them.

---

## 7. Data model (Postgres / Supabase)

All tables have `id uuid`, `created_at`, `updated_at`. All org-scoped tables have `organization_id` and Row Level Security keyed on it.

| Table | Purpose | Key columns |
|---|---|---|
| `organizations` | the business | name, timezone, currency, plan (`free`), seat_limit (2) |
| `memberships` | user ↔ org | user_id, organization_id, role, invited_email, accepted_at, removed_at |
| `clients` | who the work is for | name, email, phone, notes |
| `jobs` | unit of work | client_id, name, billing_type (`hourly`/`fixed`), hourly_rate_cents, fixed_price_cents, estimated_minutes, status (`active`/`archived`), notes |
| `time_entries` | tracked time | job_id, user_id, started_at, stopped_at (null = running), duration_seconds (derived on stop), notes, source (`timer`/`manual`) |
| `expenses` | money out | job_id (nullable), user_id, amount_cents, spent_on (date), category, description, receipt_path (unused in v1) |
| `audit_events` | change history | actor_user_id, table_name, record_id, action, before (jsonb), after (jsonb) |
| `invoices`, `invoice_lines` | **created empty in v1** for later | — |
| `subscriptions` | **created empty in v1** for later | stripe ids, status |

Rules:
- Money is stored in integer cents. Never floats.
- Timestamps are `timestamptz` in UTC. Day grouping uses the organization's timezone.
- One running timer per user (partial unique index on `user_id where stopped_at is null`).

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
- Reports: org-level totals sum the same numbers across jobs. Expenses with no job count toward the org total but no job.
- Everything is labeled "estimated" until invoicing exists.

### 8.4 Edit history
- Every create/update/delete on `time_entries` and `expenses` writes an `audit_events` row with before/after snapshots.
- The UI shows "Edited" on changed entries; tapping shows the original values.
- Nothing is silently overwritten. This is the trust feature.

---

## 9. Free vs paid boundary

**Free — $0 forever:** 2 people, unlimited jobs and time entries, expenses, dashboard, reports, CSV export.

**Pro (later, ~$15/mo):** more people, invoicing, tax estimates, mileage, receipt storage, rounding rules, integrations.

v1 builds only the free plan. The `plan` and `seat_limit` columns exist so Pro is a data change, not a rewrite.

---

## 10. Technical stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind. Responsive web app; installable as a PWA. No native apps.
- **Backend/DB/Auth:** Supabase (Postgres, Auth, Row Level Security). Email/password + magic link. Google/Apple sign-in later.
- **Hosting:** Netlify (already connected). Preview deploys per branch.
- **Payments:** Stripe, not until Pro exists.
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

---

## 12. Analytics events

`signup`, `org_created`, `job_created`, `timer_started`, `timer_stopped`, `time_entry_manual`, `time_entry_edited`, `expense_added`, `report_viewed`, `csv_exported`, `member_invited`, `member_joined`, `seat_limit_hit`, `upgrade_clicked`.

**North-star metric for v1:** % of new users who track time on 3 different days in their first 2 weeks. If this is bad, we fix the product before adding features.

---

## 13. Acceptance criteria (v1 done when all pass)

1. New user reaches a running timer within 60 seconds of landing on signup.
2. Timer survives page refresh, tab close, and phone lock; elapsed time is correct.
3. Two people in one org can each track time and expenses; owner sees both, member sees only their own.
4. A third invite is refused server-side with a clear message.
5. Job summary numbers match a hand calculation for one hourly job and one fixed job with expenses.
6. Editing a time entry keeps the original visible in history.
7. Reports for "this month" match the sum of the underlying entries.
8. CSV export opens cleanly in Excel with correct times in the org's timezone.
9. No org can read another org's data (tested with two accounts).
10. Works on iPhone Safari, Android Chrome, and desktop Chrome at 375px and 1280px widths.
11. Deployed on Netlify with a production Supabase project; env vars not in repo.

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
