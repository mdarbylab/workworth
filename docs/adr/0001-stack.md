# ADR 0001: Stack

- **Status:** Accepted (decision taken in SPEC §10 on 2026-09-06; recorded here on 2026-10-16)
- **Date:** 2026-09-06
- **Requirements:** REQ-028, REQ-036, REQ-038, REQ-039, REQ-041

## Context

WorkWorth is a commercial multi-tenant web app built and run by one person with Claude sessions (SPEC §1.4). It needs auth, a relational store with per-organization isolation, subscriptions, hosting with preview deploys, and product analytics, at near-zero fixed cost until it has paying customers.

## Options considered

1. **Next.js on Netlify, Supabase (Postgres, Auth, RLS), Stripe, PostHog.** One language end to end; isolation enforced in the database rather than in every query; free tiers for all of it. Ties access control to Postgres RLS and to Supabase's free-plan limits (no automated backups, project pauses after 7 idle days).
2. **A separate API server with its own ORM and auth.** More control, much more to build and secure for one person.

## Decision

Option 1. Next.js App Router with TypeScript (strict) and Tailwind; all writes through server actions. Supabase for Postgres, Auth (email/password and magic link) and Row Level Security. Netlify hosting with preview deploys per branch, production deploying from `main`. Stripe Checkout and Customer Portal for Pro (added 2026-10-04). PostHog for analytics and error tracking. Vitest for unit tests. Node 22 everywhere (CI, Netlify functions).

## Consequences

- Access control lives in RLS and a few security-definer helpers (ADR 0002); the app never holds a service-role key.
- Free-plan gaps are covered by our own controls: a nightly encrypted dump (`.github/workflows/backup.yml`) and a health check that also keeps the project from pausing (docs/operations.md).
- The repository is public, so it must never hold customer data or credentials (handbook security-and-data.md).
- No format checker was chosen; see ADR 0004.
