# History

The dated record of how WorkWorth got to where it is: what shipped, what broke
on the way, and why things are the way they are. Moved out of `CLAUDE.md` on
2026-10-16 when the project adopted the firm handbook (ADR 0004); the text is
unchanged apart from headings. New entries go in the changelog and in PR
descriptions, not here. Live infrastructure is in [operations.md](operations.md);
open work is in SPEC §14.

## Where things stood (2026-09-26 onward)

v1 is **live at https://workworth.de** and the launch checklist is closed. All
seven sprints in SPEC §14 are built, and two real accounts have been tested
against each other.

- **Dependencies**: `next` pinned to `16.3.8` (patched a critical RCE in
  `next/og` present in `16.2.0–16.3.5`, GHSA-vcvr-r3jv-pc5j — found 2026-10-04
  while installing an unrelated dev dependency, not something anyone was
  tracking). `eslint-config-next` kept in lockstep at the same version, as it
  already was. One remaining `npm audit` finding — `braces` via
  `eslint-config-next`'s own `fast-glob`/`@next/eslint-plugin-next` chain —
  is deliberately deferred: lint-tooling only, never runs in the deployed
  app, and the only fix path is a breaking downgrade to
  `eslint-config-next@14`. `@types/node` bumped `^20` → `^22` to match
  vitest's peer requirement and the Node 22 runtime this already deploys on
  (Netlify functions run `nodejs22.x`) — found by reproducing Netlify's
  `npm ci` locally (`npm install --legacy-peer-deps` had been silently
  masking a real peer conflict that `npm ci` rejects outright).
- **Billing**: Pro plan ($25/mo or $240/yr — $20/mo billed annually — 14-day
  trial) is live via Stripe
  Checkout + Customer Portal (Sprint 3, 2026-10-04). Flat fee per org, not
  per-seat. The Stripe webhook (`app/api/webhooks/stripe`) is the only
  writer of `subscriptions`/`organizations.plan` — it verifies the Stripe
  signature, then calls `apply_stripe_subscription_event` (security-definer,
  granted to `anon` since the webhook has no user session, same pattern as
  `auth_org_id()`). Flipping `plan` to `pro` is the entire feature on the
  app side: `auth_is_owner()` already gives real owner/member role
  separation once that happens, so no new role UI was needed. Billing
  (upgrade/manage) is creator-only. `seat_limit` was unchanged by Sprint 3
  — still 2 on every plan at that point; raised to 10 for Pro in Sprint 5
  (see below). Needs
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`,
  `STRIPE_PRICE_ANNUAL` in Netlify env (see `.env.example`).
  **Verified end-to-end in Stripe test mode 2026-10-06** via `stripe
  listen` against a real checkout — caught and fixed a real bug in the
  process: `apply_stripe_subscription_event`'s `case when ... then 'pro'
  else 'free' end` defaulted to `text`, which Postgres won't implicitly
  cast to the `plan_type` enum on assignment, so every webhook call
  failed 500 with Postgres error 42804. The failure was easy to miss —
  most *other* forwarded event types (customer.created,
  invoice.payment_succeeded, etc.) returned 200 since the webhook just
  no-ops on event types it doesn't act on, which buried the one 500 that
  mattered (`checkout.session.completed`) in the noise. Fixed with an
  explicit `::plan_type` cast
  (`supabase/migrations/20261005220000_fix_stripe_plan_cast.sql`),
  confirmed by resending the originally-failed Stripe event
  (`stripe events resend <event_id>`) and reading the resulting
  `subscriptions` row and `organizations.plan` directly.

  Testing the Customer Portal + cancellation path caught a second real bug,
  2026-10-06: canceling a **trialing** subscription through the portal
  schedules the cancellation via Stripe's general `cancel_at` timestamp, not
  the `cancel_at_period_end` boolean the webhook was reading — the portal
  correctly showed "canceled"; our DB and the Settings page both missed it.
  Confirmed via `stripe subscriptions retrieve` directly against Stripe's
  API: `cancel_at_period_end` was `false`, `cancel_at` was set to the
  trial's end. `cancel_at` is strictly more general (whenever
  `cancel_at_period_end` would've been `true`, `cancel_at` already equals
  `current_period_end`), so `subscriptions.cancel_at_period_end` (boolean)
  was replaced outright with `subscriptions.cancel_at` (nullable
  timestamp) rather than keeping both
  (`supabase/migrations/20261006030000_stripe_cancel_at.sql`). Also
  re-confirmed by resend-and-read-the-DB.

  **Live as of 2026-10-06.** Live Product + two Prices, a live webhook
  endpoint (`workworth-billing`, same 3 events), and a properly scoped live
  secret key (`Checkout Sessions`/`Customer Portal`: write,
  `Subscriptions`: read only — not blanket access) are all set up in
  Stripe, with the four `STRIPE_*` vars in Netlify's **production**
  context only (never deploy-preview/branch-deploy, so a PR build can
  never run with live keys). Confirmed with a real live checkout on a real
  card: `organizations.plan` flipped to `pro`, status `trialing`; then a
  real cancellation through the portal correctly set `cancel_at` to the
  trial's end without an immediate plan flip (both bugs above, re-verified
  against live data, not just test mode). The trial runs through
  2026-10-20; `customer.subscription.deleted` firing when it ends is the
  one event type still unexercised anywhere, live or test — same code
  path as everything else already proven correct, so low risk.

  One more bug the live test surfaced, 2026-10-06: `createPortalSession`
  swallowed any Stripe API error silently (`catch { return; }`, no message)
  — surfaced as "the Manage billing button does nothing" when stale
  test-mode data (`stripe_customer_id` from before go-live) got passed to
  the live API key. The stale data was a one-off (cleaned up directly in
  the DB), but the silent failure was real and would hit any genuine
  transient error the same way. Fixed to return `BillingState` like
  `createCheckoutSession` does, surfaced in `ManageBillingButton` via
  `useActionState` the same way `UpgradeForm` already worked.

  **Sprint 3 is done.**

  **Repriced 2026-10-07**: $15/mo or $150/yr → **$25/mo or $240/yr
  ($20/mo billed annually)**. The original number was picked without real
  grounding; this one is value-based — conservative math on admin time
  saved (≈1hr/week × $50–75/hr billed, the midpoint of what SPEC §1's
  target trades actually charge clients, per BLS wage data and several
  trade-pricing sources) priced at the standard ~10% SaaS value-capture
  rate lands at $21.50–32.50/mo, and the closest direct competitor
  (BusyBusy, $9.99–14.99/user/mo) costs $20–30/mo for an equivalent 2
  seats — both independently pointed at the same range. New live Stripe
  Prices (`price_1UO52fELrJ03FflRgfAArEdT` monthly,
  `price_1UO52tELrJ03FflR6gj1mmZV` yearly) replace the old ones in
  Netlify's env; the one existing (already-canceled) trial subscription
  on the old price just lapses naturally — no real paying customers yet,
  so no grandfathering needed. Explicit decision: fill out Pro's actual
  feature list at this price before scoping any higher tier — see "Next
  up".

  **Sprint 5 (2026-10-07, merged as [#28](https://github.com/mdarbylab/workworth/pull/28)):**
  raised the Pro seat cap from 2 to 10, matching SPEC §1's own stated
  target market ("1–10 people"); Free stays at 2 (duos). Turned out to be
  a smaller change than the open questions in the prior "Next up" entry
  assumed: direct inspection of the live DB (`pg_get_functiondef`) showed
  `enforce_invite_limit()` and `enforce_seat_limit()` already read
  `organizations.seat_limit` dynamically — neither had the hardcoded `2`
  the prior note worried about. The only actually-hardcoded thing was the
  *value*, which nothing ever wrote after org creation. So the real change
  was just teaching `apply_stripe_subscription_event` (already the sole
  writer of `plan`) to also write `seat_limit` — 10 for `pro`, 2 for
  `free` — plus a one-time backfill for the org already on Pro from
  testing (`supabase/migrations/20261007100000_pro_seat_limit.sql`,
  applied live and confirmed via direct SQL: the Pro org backfilled to
  10, both free orgs stayed at 2). Pricing model is unchanged — still
  flat-fee-per-org, not per-seat; a higher tier for teams past 10 is a
  deliberate later decision, not named or priced here.

  Also fixed a real bug found while tracing the enforcement path: the
  seat-limit-hit error message in `app/(app)/settings/actions.ts`
  hardcoded "the free plan" regardless of actual plan — a Pro org hitting
  its own 10-seat cap would have nonsensically been told "the free plan
  includes 10 people." Now branches on `ctx.organization.plan`.

  Landing page Pro card and the Settings free-plan description were
  updated to advertise the real number. Verified via `npm run verify`
  (142 tests) and the mock server at both desktop and 375px.

  **Real multi-user/multi-org testing against the new 10-seat cap is
  still open** — inviting real accounts up to 10 on the live Pro org and
  confirming the 11th is refused needs real email accounts the sandbox
  can't create, so it's the user's own next action, not something done in
  this session.
- **Landing page** (Sprint 4, 2026-10-06): root `/` used to unconditionally
  redirect a signed-out visitor to `/login` with zero marketing content —
  confirmed live, it really was just a bare login form. Replaced with a
  real public page (`app/landing-page.tsx`) grounded entirely in SPEC
  wording — hero is SPEC's own promise, the "aha moment" card is SPEC
  §2's own numbers, pricing is SPEC §9's real numbers — so it can't drift
  into overclaiming. Added SEO that didn't exist at all before:
  `metadataBase` + Open Graph/Twitter metadata, a branded OG image via
  `next/og`'s `ImageResponse`, `robots.ts`, `sitemap.ts`. Caught in testing:
  the new `/opengraph-image`, `/robots.txt`, `/sitemap.xml` routes were
  being redirected to `/login` by the auth middleware, same as any other
  protected route — added to `lib/supabase/proxy.ts`'s public-path
  allowlist. See SPEC §5.0.
- **Invoicing** (Sprint 6, 2026-10-09, Pro only — SPEC §5.9): created from
  a client report, not a separate form — "Save as invoice" on the
  statement page turns `buildStatement()`'s job breakdown directly into a
  numbered, trackable `invoices`/`invoice_lines` pair, reusing the
  statement's own revenue math (`revenueCents()`) rather than a second
  calculation path.

  The `invoices`/`invoice_lines` tables existed live since v1 ("created
  empty... for later") but had never been written into a tracked
  migration — closed with a reconciliation migration
  (`supabase/migrations/20261009000000_invoices_schema_reconciliation.sql`)
  that also converted `status` from plain `text` (no check constraint,
  the one holdout against every other status-like column in this schema
  being a proper enum) to a real `invoice_status` enum, and added the
  INSERT/UPDATE/DELETE RLS policies that never existed before (so nothing
  could write to these tables until this sprint).

  Numbering (`INV-0001`, sequential per org) is a security-definer RPC,
  `next_invoice_number()`, incrementing `organizations.invoice_seq` via
  `update ... returning` for atomicity under concurrent creates — same
  shape as `apply_stripe_subscription_event`. Verified live (not just
  reasoned about): simulated a real authenticated session via
  `set_config('request.jwt.claims', ...)` inside a transaction, confirmed
  two sequential calls return `INV-0001`/`INV-0002` with no collision,
  confirmed the wrong-org case is correctly rejected, then rolled back so
  nothing persisted. That same test caught a real Postgres gotcha before
  it became a bug: inserting the invoice and its lines in a single
  multi-statement CTE fails RLS, because a data-modifying CTE's sibling
  writes aren't visible to another CTE's RLS subquery in the same
  statement — confirmed the real server action must do two separate
  round-trips (which the natural Next.js server-action code already
  does), not one clever combined query.

  A minimal double-billing guard: `time_entries.invoiced_in_invoice_id`
  marks which invoice billed an entry's hours, so a second invoice for
  the same client correctly offers only the not-yet-billed remainder (and
  a fixed-price job, once any of its hours are billed, is never
  re-offered at all — the whole price was already captured). Voiding an
  invoice frees its hours back up. `invoices.total_cents` is trigger-
  maintained from `invoice_lines` (`invoice_lines_set_total`), never
  written by app code.

  Caught and fixed via the mock-server visual pass, not left as a latent
  bug: `deriveInvoiceLines()` originally checked `invoicedInvoiceId ===
  null` with strict equality; the mock fixture's hand-written rows simply
  omitted the column (`undefined`, not `null`), which would have silently
  treated every entry as "already billed" the first time this ran against
  real Postgres data shaped slightly differently than expected. Fixed at
  the root (the mock's `entry()` helper now sets the field explicitly,
  matching what PostgREST always sends), not papered over with a loose
  equality check that would have masked the same class of bug later.

  Sent invoices lock (SPEC §8.4's "nothing silently overwritten"
  principle) — fixing one means voiding and creating a replacement, not
  editing in place. Verified end-to-end via the mock server: created an
  invoice from a real statement, marked it sent (confirmed the 14-day due
  date and that line-editing controls disappeared), marked it paid
  (confirmed terminal — no further status actions render).
- **Sprint 7 (2026-10-10/11, two PRs):** mileage expenses and billing
  rounding — the two small, mechanical features pre-scoped together.

  **Mileage** ([#31](https://github.com/mdarbylab/workworth/pull/31)): a
  mileage expense records miles driven instead of a dollar amount.
  Selecting "Mileage" on the expense form swaps the dollar input for a
  miles input; `amount_cents` is always computed server-side as
  `miles × organizations.mileage_rate_cents` — never trusted from the
  client. `mileage_rate_cents` is a plain editable Settings field,
  deliberately not re-derived from any "current IRS rate" in code, since
  that changes every year and a hardcoded value would silently go stale.
  **Not Pro-gated** — expense tracking is already free-plan, mileage is
  just another category. New `expense_category` enum value (its own
  migration, since `ALTER TYPE ... ADD VALUE` can't safely share a
  transaction with DDL referencing the new value) + `expenses.miles` +
  `organizations.mileage_rate_cents`.

  **Billing rounding** (SPEC §8.1, Pro only): raw
  `time_entries.duration_seconds` is never touched — rounding only ever
  affects the *billing* surface (job revenue, Reports, Client Report,
  Invoices), rounding each entry individually before summing (not the
  period total), via `roundSeconds()`/`roundingConfigFor()` in
  `lib/calc.ts`. "Effective hourly rate" deliberately keeps dividing by
  real tracked hours, not billed hours, so it still measures what your
  actual time turned into. A new per-org `time_rounding_minutes`
  (nullable, off by default, `CHECK ... IN (5,10,15,30)`) +
  `time_rounding_mode` (new `rounding_mode` enum) pair, read through five
  call sites (`today/page.tsx`, `lib/jobs.ts`, `lib/reports.ts`,
  `lib/statement.ts`, `lib/invoices.ts`) — all five were confirmed by
  direct exploration to pre-sum raw per-entry seconds before reaching
  `revenueCents()`, so rounding had to be inserted at each accumulation
  loop rather than inside `revenueCents()` itself.

  The Client Report/statement — "the one place worth showing both
  numbers explicitly," since it's what an invoice is built from — shows
  a job's real tracked hours in its table and per-line amounts as
  before, but the subtotal and total reflect rounded hours, with an
  explicit note when they differ ("9.75h tracked, billed as 10.00h per
  your billing rounding settings..."), deliberately not silently
  presenting a total that wouldn't match hand-adding the visible rows.

  Verified live against real fixture data, not just unit tests (8 new
  ones in `lib/calc.test.ts` cover `roundSeconds`'s three modes at a
  7-minute/15-minute boundary and `roundingConfigFor`'s free-plan/
  no-increment/configured cases): with 30-minute "up" rounding on a job
  whose entries summed to 9.75h, the Job page correctly showed "9h 45m"
  tracked but "$750" revenue (10h-equivalent at $75/hr) while "Effective
  rate" stayed at $44.92/hr (profit ÷ the real 9.75h, not 10h); Reports'
  total and the Client Report's subtotal/note matched; "Save as invoice"
  correctly carried the rounded $750 and 10h quantity onto the invoice
  line. Switching to 15-minute "nearest" (under which every existing
  fixture entry happens to already be an exact multiple) correctly
  reverted revenue to the raw $731.25 — confirming the Settings change
  actually propagated, not just that rounding could visually differ.

- **Sprint 8 (2026-10-16): receipt storage** (Pro only, SPEC §5.4) — the
  first use of Supabase Storage. A private `receipts` bucket (4 MB, images
  + PDF, both enforced by the bucket itself) at
  `{organization_id}/{expense_id}/{file}`; policies in
  `supabase/migrations/20261016000000_receipt_storage.sql`. Select requires
  the path's org to be yours *and* the expense to be visible to you through
  `expenses`' own RLS, so Pro role separation carries over to receipts for
  free. Insert additionally requires `plan = 'pro'`. Insert/delete also
  allow an expense id that doesn't exist at all (via the security-definer
  `expense_id_unused()`), because a new expense's receipt is uploaded
  *before* the row is inserted (so history shows one insert, not insert +
  edit) and the file is removed *after* the row is deleted. No update
  policy — every upload gets a fresh filename. Viewing is
  `/expenses/[id]/receipt`, which mints a 60-second signed URL per click.

  Why 4 MB: uploads go through a server action, and Netlify functions cap
  a request at 6 MB after base64-encoding the body
  (`serverActions.bodySizeLimit` is raised to 5 MB in `next.config.ts`).
  Direct browser-to-Storage upload would lift that, at the cost of trusting
  a client-sent path — revisit only if 4 MB proves too small.

  Verified live (inside a rolled-back transaction with simulated JWTs): a
  Pro owner can upload under their own org and a new expense id, but not
  under another org's path or another org's existing expense id; a free
  owner can't upload; a free owner sees their own seeded receipt, and the
  Pro owner and `anon` see nothing. **Delete couldn't be tested this way**
  — `storage.protect_delete` refuses direct SQL deletes on
  `storage.objects` — so it was exercised only through the mock server.
  The full UI flow (upload, wrong-type refusal, view via signed URL with
  byte-identical content, replace, remove, delete-with-expense, free plan
  hiding the control) was driven against `scripts/mock-supabase.mjs`, which
  now fakes Storage too (`MOCK_PLAN=pro` for Pro-only screens).

  **Known gap:** the nightly backup dumps only the database, so receipt
  *files* aren't backed up (see `docs/backups.md`).

## Done 2026-10-04 and earlier notes

**Not actually doable on the free plan**: "Prevent use of leaked passwords"
(Authentication → Sign In / Providers → Email → Attack Protection) is a
Supabase **Pro-plan feature** — the toggle doesn't respond on this project.
Confirmed 2026-10-04, not just an unflipped switch. Revisit if/when the
project upgrades; until then this isn't a thing to keep retrying.

Also done, 2026-10-04: `guard_membership_update` is revoked from the API —
and four siblings turned out to have the same unintended grant
(`enforce_invite_limit`, `enforce_seat_limit`, `set_updated_at`,
`time_entries_set_duration`). All five now match `write_audit_event`, which
was already configured correctly: EXECUTE revoked from `public`, `anon` and
`authenticated`. Not an exploitable hole — Postgres refuses to call a
trigger function outside trigger context regardless of grants — but it was
needless API surface, and the linter now reports it clean. Confirmed the 9
triggers across 5 tables are all still attached and enabled after the
revoke. See `supabase/migrations/20261004000000_lock_down_trigger_functions.sql`.

Also done, 2026-10-04: the subminute effective-rate display. A job/period
whose entire tracked time is under a minute now shows "—" instead of a rate
with no visible denominator (`effectiveRateCents` in `lib/calc.ts`, SPEC
§8.3). Verified the fix is real by reverting it and watching 3 of the 10
new tests fail exactly as expected, then confirmed visually against
`scripts/mock-supabase.mjs` (temporarily, not committed) on the Reports
page.

Also done, 2026-10-04: Today's profit asymmetry — the other pinned fix.
Decision was "split scope": the **Expenses** tile still shows everything
spent today, any job (honest, unchanged); **Est. profit** now subtracts
only hourly-job/unassigned expenses from hourly earnings, so a fixed-price
job's cost logged today no longer drags profit negative on an otherwise
fine day — that job's own profit already shows on its job page. Verified by
adding a temporary fixed-price expense to `scripts/mock-supabase.mjs` (not
committed) and confirming Expenses grew while Est. profit stayed identical;
checked at 375px too. Both pinned fixes are now closed; the
`pinned-ux-fixes` memory is stale and can be deleted next time it's seen.

Also done, 2026-10-04: tests, CI and a verify script — the last gap-list
item. `lib/dates.test.ts` (25 tests) and `lib/periods.test.ts` (16 tests)
now cover both modules, including the real 2026 `America/New_York` DST
transitions (spring forward 2026-03-08, fall back 2026-11-01) rather than
guessed offsets; `lib/calc.test.ts` gained direct `revenueCents`/
`profitCents` tests (hourly rounding, fixed-price, zero/null rates,
negative profit) on top of the existing `effectiveRateCents` coverage.
Needed a `vitest.config.mts` (didn't exist before) so vitest resolves the
app's `@/*` path alias the same way Next.js does. `npm run verify` chains
`tsc --noEmit && eslint . && vitest run && next build`, and
`.github/workflows/ci.yml` runs it on every push/PR — confirmed green
against a clean `npm ci` (no `.env.local`), matching how Netlify builds.

Supabase's performance lints (unindexed foreign keys, per-row `auth.uid()`
re-evaluation) are known and **deliberately deferred**: real at scale,
premature at two users.

## The v1 build order (retired 2026-10-16)

SPEC §14 as it stood before sprints were retired:

| Sprint | Scope |
|---|---|
| 1 — Foundation | repo, Next.js, Supabase project, schema + RLS, auth, org creation, onboarding, nav shell |
| 2 — Time | jobs, timer, manual entries, edit with history, Today screen totals |
| 3 — Money | hourly/fixed pricing, expenses, revenue/profit/rate on jobs |
| 4 — Reports | period selector, four questions, per-job table, CSV export |
| 5 — Team | invites, member role, seat limit, Settings |
| 6 — Polish | empty states, errors, loading, PWA, mobile QA |
| 7 — Beta | Netlify prod, analytics, feedback link, monitoring, upgrade waitlist |

Then launch the free 2-person version. Post-launch work reused the numbers
3 to 7 for a second series (billing, landing page, seat cap, invoicing,
mileage and rounding); SPEC §14 now lists both under "Done".
