# ADR 0003: The Stripe webhook is the only writer of plan and subscription state

- **Status:** Accepted (decision taken in Sprint 3 on 2026-10-04; recorded here on 2026-10-16)
- **Date:** 2026-10-04
- **Requirements:** REQ-030, REQ-036, REQ-037

## Context

Pro is sold through Stripe Checkout (SPEC §9). `organizations.plan` drives access (`auth_is_owner()`, ADR 0002), seat limits and Pro features, so whatever writes it controls what a business can do.

## Options considered

1. **Only the Stripe webhook writes, after verifying Stripe's signature.** Stripe stays the source of truth for billing; the app cannot grant itself Pro. The webhook has no user session, so the writer must be a security-definer function callable by `anon`.
2. **The app also writes plan state** (for example on return from Checkout). Faster feedback, and a second path that can disagree with Stripe or be abused.

## Decision

Option 1. `app/api/webhooks/stripe` verifies the signature, then calls `apply_stripe_subscription_event` (security-definer, granted to `anon`), which writes `subscriptions`, `organizations.plan` and `organizations.seat_limit`. App code never writes these. Scheduled cancellation is read from Stripe's `cancel_at`, not `cancel_at_period_end` (a trial cancelled through the portal sets only the former).

## Consequences

- Billing state can lag Stripe by one webhook delivery.
- The function is reachable by `anon`, so its only trust boundary is the signature check in the route; that check must never be bypassed.
- Live Stripe keys exist only in Netlify's production context (docs/operations.md).
