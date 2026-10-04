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
- **Billing**: Pro plan ($15/mo or $150/yr, 14-day trial) is live via Stripe
  Checkout + Customer Portal (Sprint 3, 2026-10-04). Flat fee per org, not
  per-seat. The Stripe webhook (`app/api/webhooks/stripe`) is the only
  writer of `subscriptions`/`organizations.plan` — it verifies the Stripe
  signature, then calls `apply_stripe_subscription_event` (security-definer,
  granted to `anon` since the webhook has no user session, same pattern as
  `auth_org_id()`). Flipping `plan` to `pro` is the entire feature on the
  app side: `auth_is_owner()` already gives real owner/member role
  separation once that happens, so no new role UI was needed. Billing
  (upgrade/manage) is creator-only. `seat_limit` is unchanged by this —
  still 2 on every plan; raising it for Pro is future work. Needs
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`,
  `STRIPE_PRICE_ANNUAL` in Netlify env (see `.env.example`); not yet
  verified end-to-end against live Stripe test mode — see "Next up".
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

**Sprint 3 (Stripe billing) is code-complete but not yet live-verified.**
Everything in "Billing" above is written, migrated, and passing
`npm run verify`, but nobody has run a real checkout through Stripe test
mode yet — this sandbox can't reach Stripe or Supabase over HTTPS, so that
step is yours:
1. Create a Stripe account (test mode), one Product ("WorkWorth Pro") with
   two Prices — monthly $15, annual $150 (two months free; adjust in
   Stripe's dashboard if you want a different number, no code change
   needed).
2. `stripe listen --forward-to localhost:3000/api/webhooks/stripe` for a
   local webhook during testing; put the test secret key, that listen
   command's webhook signing secret, and both price ids into `.env.local`
   (see `.env.example`).
3. Run a real test-mode checkout against `npm run dev` (needs the live
   Supabase project, not the mock server, since the webhook writes to
   `subscriptions`/`organizations.plan` for real) and confirm the org's
   `plan` flips to `pro`, the Settings page shows the right status, and
   `createPortalSession` opens a real Stripe portal.
4. Only after that passes: live-mode keys, product, prices and webhook
   endpoint (pointing at `workworth.de/api/webhooks/stripe`), added to
   Netlify env.

After that's verified, the rest of what SPEC §9 calls Pro — more seats,
invoicing, tax estimates, mileage, receipt storage, rounding rules,
integrations — is unscoped future work, not part of Sprint 3.

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
