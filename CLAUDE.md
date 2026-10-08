# WorkWorth — notes for Claude Code

Read SPEC.md first. It is the source of truth. Do not add features not in it.
When a change does belong in the product, edit SPEC.md in the same PR rather
than letting the code and the spec drift apart.

## Where things stand (2026-09-26)

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
- **Supabase** project `workworth` (ref `btfmiviujsftuxzxslwt`, us-east-1, free plan).
- **Netlify** site `merry-biscuit-d35e20`, building from `main`. Production deploys
  on merge. Hosting is Netlify, not Vercel.
- **Backups**: `.github/workflows/backup.yml` dumps the database nightly,
  encrypts it, and pushes it to the private `workworth-backups` repo. See
  `docs/backups.md` to restore. The free plan has no automated backups; this is
  the substitute.
- **Monitoring**: UptimeRobot hits `/api/health` every 5 minutes. That endpoint
  runs a real query, so it also keeps the free-plan project from pausing after
  7 days of inactivity.
- **Email**: Supabase Auth SMTP is Resend (`smtp.resend.com`, sender
  `noreply@workworth.de`, no reply-to, no inbox). Domain verified with SPF,
  DKIM and a `p=none` DMARC record at Spaceship. Confirmed end-to-end
  2026-09-27: signup mail passes SPF/DKIM/DMARC and links to
  `workworth.de/auth/callback`. The "Confirm sign up" and "Magic link or OTP"
  templates are branded (WorkWorth mark, navy button); the others are
  Supabase's stock templates because the app doesn't send them yet — invites
  are a custom mailto link. Password reset (`/forgot-password` →
  `/reset-password`) is live and its template is branded too.
- **Analytics**: PostHog (product analytics + error tracking). Events are the
  §12 list; ids only, never emails or free text. The browser SDK only starts
  after the visitor accepts the cookie banner (`components/cookie-banner.tsx`);
  server-side events in `lib/analytics/server.ts` are unaffected, since
  they're keyed to the account id directly and set no cookie.
- **Legal**: `/privacy`, `/terms`, `/impressum` are public, linked from
  Settings and every signed-out screen. Operator is Michael Darbyshire, an
  individual in the United States — the Impressum is a good-faith notice
  rather than a claim of strict German-law compliance, since whether that
  law applies to a non-EU individual not targeting the German market is a
  genuinely open question. A lawyer (or a service like e-recht24.de) should
  still review before treating any of this as final. Public contact is
  `hello@workworth.de`, forwarding to the owner's inbox — confirm that
  forwarding is actually live before relying on it.

## Database

Schema, RLS policies, triggers and RPCs are applied to the live database and
mirrored in `supabase/migrations/`. **Do not re-run existing migrations against
the live DB.** New migrations are applied to the live project and committed as
a file in the same change.

Access is enforced entirely in RLS. Two helpers do the work, and every
org-scoped policy calls them:

- `auth_org_id()` — the caller's organization.
- `auth_is_owner()` — *has full access*. True for everyone in the org while the
  plan is `free`; on paid plans it follows `role`. Renaming it would mean
  touching nine policies, which is why the name outlived its meaning.
- `auth_is_creator()` — who created the business. Only they can remove someone
  or delete it.

`memberships_guard_update` blocks self-promotion: a person may edit their own
row (their display name) but not their `role`, and cannot remove the creator.

All three helpers are granted to `anon`, which returns null/false without a
JWT. Without that grant, anonymous reads raise `permission denied for function
auth_org_id` instead of returning no rows — that bug made `/api/health` report
a healthy database as unreachable.

## Conventions

- Next.js App Router, TypeScript strict, Tailwind. Server actions for all writes.
- Money in integer cents, never floats. Times stored UTC; grouped by org timezone.
- Every org-scoped query relies on RLS; never bypass it with the service role
  from client-reachable code. Nothing in the codebase uses a service role key.
- People are shown by **display name**, never by email address.
- **Brand** (from the logo, a deer reaching for one apple): `ink-*` is the navy
  and is the whole interface; `slate-*` are the neutrals; `font-display`
  (Fraunces) is for `h1` and the wordmark, Geist for everything else. `apple`
  (`bg-apple`) is a single tiny splash, like the fruit. It appears only as
  small dots and hairlines: the logo, the running-timer dot, the active nav
  dot, link underlines on hover, the text-selection tint, the loading dot.
  Do not use it for text, buttons or backgrounds, and add a new use only
  deliberately. Errors and losses keep
  Tailwind's `red-*`. The mark lives in `components/logo.tsx` (traced from the
  artwork; `public/brand/mark.svg` is the same drawing).
- Secrets live in Netlify and GitHub, never in the repo. `.env*` is gitignored.
- Commit small, commit often. Conventional commit messages.
- The repo is **public**. Never write customer data into it, and never store a
  dump as a workflow artifact.

## Verifying changes

`npm run verify` chains `next typegen`, `tsc --noEmit`, `eslint .`,
`vitest run` and `next build` — run it before claiming something works.
(`next typegen` has to come first: `tsc` depends on the route-level
`PageProps`/`LayoutProps` types Next.js generates into `.next/types`, which
don't exist yet on a clean checkout — CI caught this the first time, since
a local run already had a stale `.next` lying around.) `.github/workflows/ci.yml`
runs the same command on every push and PR, so this is no longer "no CI
beyond Netlify's build". Tests live beside the module they cover:
`lib/calc.test.ts`, `lib/dates.test.ts`, `lib/periods.test.ts`
(`vitest run`, aliased via `vitest.config.mts` so `@/` imports resolve the
same as in the app). A green build proves only that the code compiles —
still:

- `npx tsc --noEmit`, `npx eslint .`, `npx next build`, `npm test` (or just `npm run verify`).
- Exercise the real screen. `scripts/mock-supabase.mjs` stands in for Supabase
  Auth + PostgREST so the UI can be driven without network access:
  `node scripts/mock-supabase.mjs` then
  `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock npm run dev`.
  Sign in by setting the cookie it exports. `MOCK_EMPTY=1` exercises empty states.
- Check phone width (375px) as well as desktop. Three real bugs in this project
  were invisible until the page was actually rendered.

The sandbox cannot reach `*.supabase.co` or `*.netlify.app` over HTTPS. Use the
Supabase and Netlify MCP tools to read live state instead.

## Next up

The v1 gap list is closed (see "Verifying changes" above for the
tests/CI/verify-script work that closed the last item).

**Sprint 3 (Stripe billing)**, **Sprint 4 (landing page)**, and **Sprint 5
(10-person seat cap for Pro)** are all done and live — see "Billing" and
"Landing page" above.

**Open from Sprint 5**: real multi-user/multi-org testing against the new
10-seat cap — inviting real accounts up to 10 on the live Pro org and
confirming the 11th is correctly refused. Needs the user's own
participation (real email accounts), not something the sandbox can do.

The rest of what SPEC §9 calls Pro beyond seats — invoicing, tax
estimates, mileage, receipt storage, rounding rules, integrations — stays
unscoped future work. Pick up whichever of those (or something else) once
the Sprint 5 multi-user test is done.

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
