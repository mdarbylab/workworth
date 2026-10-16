# WorkWorth: working agreements

This project follows the firm's handbook (`HANDBOOK_VERSION`): the method, quality gates, security rules and audit manual in the `handbook` repository. Read `docs/method.md` there if you have not.

Read these before changing anything:

- `SPEC.md`: what we are building and why. The source of truth; do not add features not in it.
- `docs/requirements.md`: requirement IDs. Every change traces to one.
- `docs/non-negotiables.md`: what defines the product. Never weaken or bypass one; if a task seems to require it, stop and ask.
- `docs/adr/`: decisions already made and why.
- `docs/operations.md`: what is live and where it is configured. `docs/history.md` has the story behind it.

## Rules

1. Trace every change to requirement IDs. If none fit, add one (status Proposed), and update SPEC.md if intent changes, in the same PR; the owner approves at merge.
2. Structural, interface, dependency or data-format changes need an ADR before the code.
3. Write the failing test first.
4. Work in thin end-to-end slices (SPEC §14), with at most 2 in progress.
5. Run the gate script (`npm run verify`) before every push. CI runs the same script.
6. Never commit real data, secrets or personal identifiers. Fixtures are synthetic. The repository is **public**: never write customer data into it, and never store a database dump as a workflow artifact.
7. Conventional Commits. Feature branches and pull requests using the PR template. Merge with a merge commit, never squash or rebase.
8. Do not change the spec's scope or open decisions on your own; propose them in the PR.
9. Do not claim a requirement is `Verified` unless a named automated test passes in CI.
10. A PR that touches a non-negotiable says so and names the test that still holds. Only the owner changes one, through an ADR.
11. Never state a control as in place unless it is. Mark it **(planned)** with a date.

Keep this file to rules. Status and history belong in issues, the changelog, `docs/operations.md` and `docs/history.md`.

## Stack

See `docs/adr/0001-stack.md`. Next.js App Router, TypeScript strict, Tailwind, Supabase, Netlify, Stripe, PostHog. Production is https://workworth.de, deployed by Netlify from `main`.

## Database

- Schema, RLS policies, triggers and RPCs are applied to the live database and mirrored in `supabase/migrations/`. **Do not re-run existing migrations against the live DB.** A new migration is applied to the live project and committed as a file in the same change.
- Access is enforced entirely in RLS through `auth_org_id()`, `auth_is_owner()` (has full access: everyone on free, by role on paid plans) and `auth_is_creator()`. See ADR 0002 before touching a policy, a helper or a `memberships` trigger.
- The helpers are granted to `anon`, which returns null or false without a JWT. Removing that grant makes anonymous reads raise instead of returning no rows.
- `subscriptions` and `organizations.plan` are written only by the Stripe webhook (ADR 0003). App code never writes them.

## Conventions

- Server actions for all writes.
- Money in integer cents, never floats. Times stored UTC; grouped by org timezone.
- Every org-scoped query relies on RLS; never bypass it with the service role from client-reachable code. Nothing in the codebase uses a service-role key.
- People are shown by **display name**, never by email address.
- **Brand** (from the logo, a deer reaching for one apple): `ink-*` is the navy and is the whole interface; `slate-*` are the neutrals; `font-display` (Fraunces) is for `h1` and the wordmark, Geist for everything else. `apple` (`bg-apple`) is a single tiny splash, like the fruit. It appears only as small dots and hairlines: the logo, the running-timer dot, the active nav dot, link underlines on hover, the text-selection tint, the loading dot. Do not use it for text, buttons or backgrounds, and add a new use only deliberately. Errors and losses keep Tailwind's `red-*`. The mark lives in `components/logo.tsx` (traced from the artwork; `public/brand/mark.svg` is the same drawing).
- Secrets live in Netlify and GitHub, never in the repo. `.env*` is gitignored.
- Commit small, commit often.

## Verifying changes

`npm run verify` is the gate: secret scan, dependency audit, format check (`prettier --check .`; fix with `npm run format`), `next typegen`, `tsc --noEmit`, `eslint .`, `vitest run`, `next build`. `next typegen` must come before `tsc`, which needs the route types Next.js generates into `.next/types`. The dependency audit needs the npm registry; a deliberately deferred advisory goes in `scripts/audit-allowlist.json` with a reason and a review-by date, never by weakening the gate (ADR 0004).

Tests live beside the module they cover (`lib/*.test.ts`). A green build proves only that the code compiles, so also:

- Exercise the real screen. `scripts/mock-supabase.mjs` stands in for Supabase Auth and PostgREST so the UI can be driven without network access: `node scripts/mock-supabase.mjs`, then `NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock npm run dev`. Sign in by setting the cookie it prints. `MOCK_EMPTY=1` exercises empty states.
- Check phone width (375px) as well as desktop. Three real bugs in this project were invisible until the page was actually rendered.

The sandbox cannot reach `*.supabase.co` or `*.netlify.app` over HTTPS. Use the Supabase and Netlify MCP tools to read live state instead. Production account creation and sign-in are off-limits to Claude.
