# WorkWorth — notes for Claude Code

Read SPEC.md first. It is the source of truth. Do not add features not in it.

## Already done (in chat, 2026-09-06)
- Supabase project `workworth` exists (ref btfmiviujsftuxzxslwt, us-east-1, free plan).
- Schema, RLS policies, triggers, `create_organization()` RPC, and seat-limit enforcement are ALREADY APPLIED to the live database. The SQL is mirrored in `supabase/migrations/` for version control — do not re-run it against the live DB.
- Env vars are in `.env.local` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` is blank until Darby pastes it from the dashboard; only needed for server-side admin operations.

## Conventions
- Next.js App Router, TypeScript strict, Tailwind. Server actions for all writes.
- Money in integer cents. Times in UTC; group by org timezone.
- Every org-scoped query relies on RLS; never bypass with service role from client-reachable code.
- Commit small, commit often. Conventional commit messages.
- Hosting is Netlify, not Vercel.

## Current sprint
Sprint 1 — Foundation (SPEC.md §14): project scaffold, Supabase client setup (@supabase/ssr), auth (email/password + magic link), onboarding flow (§5.7) calling `create_organization` RPC, nav shell with the five sections.
