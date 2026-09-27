# WorkWorth — notes for Claude Code

Read SPEC.md first. It is the source of truth. Do not add features not in it.
When a change does belong in the product, edit SPEC.md in the same PR rather
than letting the code and the spec drift apart.

## Where things stand (2026-09-26)

v1 is **live at https://workworth.de** and the launch checklist is closed. All
seven sprints in SPEC §14 are built, and two real accounts have been tested
against each other.

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
- **Analytics**: PostHog (product analytics + error tracking). Events are the
  §12 list; ids only, never emails or free text.

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
  (`bg-apple`) is a single tiny splash, like the fruit. It appears in the
  logo and the running-timer dot. Do not use it for text, buttons or
  backgrounds, and add a new use only deliberately. Errors and losses keep
  Tailwind's `red-*`. The mark lives in `components/logo.tsx` (traced from the
  artwork; `public/brand/mark.svg` is the same drawing).
- Secrets live in Netlify and GitHub, never in the repo. `.env*` is gitignored.
- Commit small, commit often. Conventional commit messages.
- The repo is **public**. Never write customer data into it, and never store a
  dump as a workflow artifact.

## Verifying changes

There is no test suite and no CI beyond Netlify's build, so a green build
proves only that the code compiles. Before claiming something works:

- `npx tsc --noEmit`, `npx eslint .`, `npx next build`.
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
the gaps found at the end of Sprint 1, in this order:

1. **Custom SMTP.** Supabase's built-in mail refuses to deliver to addresses
   outside the project team, so no real beta user can finish signing up. This
   blocks every other kind of growth.
2. **Password reset.** No flow exists anywhere; `resetPasswordForEmail` is never
   called. Magic link is the only recovery and nothing tells the user that.
3. **Privacy policy, terms, Impressum.** None exist, on a `.de` domain that
   collects emails and runs analytics.
4. **Enable leaked-password protection** in Supabase Auth.
5. **`/api/health` swallows its own errors** — its bare `catch` reports
   "unreachable" for any failure, which made one real outage much harder to
   diagnose than it needed to be.
6. **Revoke `guard_membership_update` from the API.** It is a trigger function
   and does not belong in the exposed RPC surface.
7. **Tests, CI and a verify script.** Start with the money math in `lib/calc.ts`,
   `lib/periods.ts` and `lib/dates.ts` — pure functions where a silent bug costs
   a user real money.

Supabase's performance lints (unindexed foreign keys, per-row `auth.uid()`
re-evaluation) are known and **deliberately deferred**: real at scale,
premature at two users.
