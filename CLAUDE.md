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
  `eslint-config-next@14`.
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

There's still no CI, and the only tests so far are `lib/calc.test.ts`
(vitest — `npm test`) — nothing else in the gap's "start with the money math
in `lib/calc.ts`, `lib/periods.ts` and `lib/dates.ts`" is covered yet. A
green build proves only that the code compiles. Before claiming something
works:

- `npx tsc --noEmit`, `npx eslint .`, `npx next build`, `npm test`.
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

v1 is done; there is no active sprint. Before building Sprint 2 features, close
the gaps found at the end of Sprint 1, in this order. Custom SMTP, password
reset, the legal pages and `/api/health`'s error handling (were #1–#4) are
done — see "Where things stand" above and SPEC §5.7/§11.
`/api/health` now returns `db: "ok" | "error" | "timeout" | "unreachable"`,
distinguishing a real Postgres error (with its SQLSTATE `code`, safe to
expose) from a connectivity failure, from the service's own 5s timeout. The
raw error message only goes to the server log and PostHog, never the public
response.

1. **Tests, CI and a verify script.** `lib/calc.test.ts` (vitest, `npm test`)
   is the first slice — `effectiveRateCents`'s subminute-suppression bug (see
   below) needed real regression coverage to fix honestly, so that's where
   the test runner started. `lib/periods.ts` and `lib/dates.ts` are still
   uncovered, and there's no CI step running `npm test` yet, no `npm run
   verify` script, and no coverage of `revenueCents`/`profitCents` beyond
   what `calc.test.ts` exercises indirectly.

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
page. Still queued (see the `pinned-ux-fixes` memory): Today's profit
mixing an hourly-only earnings figure with all-jobs expenses — that one
needs a product decision before touching it.

Supabase's performance lints (unindexed foreign keys, per-row `auth.uid()`
re-evaluation) are known and **deliberately deferred**: real at scale,
premature at two users.
