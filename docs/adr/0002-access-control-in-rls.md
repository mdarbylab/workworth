# ADR 0002: Enforce access control in Postgres RLS

- **Status:** Accepted (decision taken in v1 and reshaped on 2026-09-26; recorded here on 2026-10-16)
- **Date:** 2026-09-26
- **Requirements:** REQ-023, REQ-024, REQ-025, REQ-026, REQ-038, REQ-039

## Context

Every record belongs to an organization (SPEC §6). A bug in one query must not leak another business's data. On the free plan the two people are peers; on Pro, owner and member roles separate access; only the creator may remove someone or delete the business.

## Options considered

1. **Row Level Security on every org-scoped table, through shared helper functions.** One place decides access; queries cannot forget a filter. Policies are SQL and need care to test.
2. **Filter by organization in application code.** Easy to read, and one missed `where` clause leaks data.

## Decision

Option 1. Every org-scoped policy calls security-definer helpers:

- `auth_org_id()`: the caller's organization.
- `auth_is_owner()`: has full access. True for everyone in the org on the free plan; on paid plans it follows `role`. (The name outlived its meaning; renaming it would touch nine policies.)
- `auth_is_creator()`: who created the business; only they can remove someone or delete it.

`memberships_guard_update` blocks self-promotion. Seat limits are triggers on `memberships` (`enforce_invite_limit`, `enforce_seat_limit`) reading `organizations.seat_limit`. The helpers are granted to `anon` so that anonymous reads return no rows instead of raising a permission error. No client-reachable code uses the service-role key.

## Consequences

- Isolation holds even if a query forgets a filter; a policy or trigger mistake, though, affects every query at once, so migrations touching them need extra review.
- `/api/health` checks that the seat-limit triggers are attached and enabled (REQ-043).
- An automated cross-tenant leak test suite does not exist yet; it is **(planned)** in slice SL-05 (ADR 0004). Until then isolation is verified by inspection and by the two-account test at launch.
