# Operations

What is running in production and where it is configured. Current state only:
the dated story of how each piece got here is in [history.md](history.md).
Moved out of `CLAUDE.md` on 2026-10-16 (ADR 0004). When something here changes,
update this file in the same PR.

Production is **https://workworth.de**.

## Live systems

- **Supabase** project `workworth` (ref `btfmiviujsftuxzxslwt`, us-east-1, free plan).
- **Netlify** site `merry-biscuit-d35e20`, building from `main`. Production deploys
  on merge. Hosting is Netlify, not Vercel.
- **Backups**: `.github/workflows/backup.yml` dumps the database nightly,
  encrypts it, and pushes it to the private `workworth-backups` repo. See
  `docs/backups.md` to restore. The free plan has no automated backups; this is
  the substitute.
- **Monitoring**: UptimeRobot hits `/api/health` every 5 minutes (alerts go to the
  owner's inbox). That endpoint runs a real query, so it also
  keeps the free-plan project from pausing after 7 days of inactivity.
  Since Sprint 5 (2026-10-08) it also calls
  `public.seat_limit_enforcement_ok()`, a security-definer RPC granted to
  `anon` that checks the `enforce_invite_limit`/`enforce_seat_limit`
  triggers on `memberships` are still attached and enabled, and fails the
  check (503) if not — the one realistic way the seat cap could ever be
  bypassed (a bad migration, a manual SQL slip), since Postgres triggers
  otherwise fire regardless of role/privilege. Deliberately does **not**
  alert on an org simply being over its `seat_limit` — a Pro org that
  downgrades keeps members over its new, lower limit by design (§6, no
  forced removal), so that state alone isn't a fault. Verified live: the
  RPC returns `true` against the real triggers, and the same
  catalog-query shape was separately proven to flip to "not detected"
  against a disabled trigger on a throwaway temp table (never against the
  real triggers — disabling live enforcement, even temporarily, is
  correctly refused by the auto-mode security classifier).
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


## Billing (Stripe)

- Pro is $25/mo or $240/yr ($20/mo billed annually) with a 14-day trial,
  flat fee per org (SPEC §9). Checkout and the Customer Portal are Stripe-hosted.
- The webhook (`app/api/webhooks/stripe`, Stripe endpoint `workworth-billing`)
  is the only writer of `subscriptions` and `organizations.plan` (ADR 0003).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY` and
  `STRIPE_PRICE_ANNUAL` live in Netlify's **production** context only, never
  deploy-preview or branch-deploy, so a PR build can never run with live keys
  (see `.env.example`). The live secret key is scoped: Checkout Sessions and
  Customer Portal write, Subscriptions read, nothing else.
- To test a webhook change: `stripe listen` against a test-mode checkout, then
  `stripe events resend <event_id>` and read the resulting rows directly. A
  200 on most event types proves little, because the webhook no-ops on types
  it does not act on.

## Known limits

- **Leaked-password protection** (Supabase Auth, Attack Protection) is a
  Supabase Pro-plan feature; the toggle does nothing on this free-plan
  project. Revisit if the project upgrades.
- **Supabase performance lints** (unindexed foreign keys, per-row `auth.uid()`
  re-evaluation) are known and deliberately deferred: real at scale, premature
  at two users. Revisited in slice SL-06.
- The `braces` advisory in `eslint-config-next`'s lint tooling is deferred;
  see `scripts/audit-allowlist.json` and ADR 0004.

## Reaching live state from a Claude session

The sandbox cannot reach `*.supabase.co` or `*.netlify.app` over HTTPS. Use the
Supabase and Netlify MCP tools to read live state instead. Production account
creation and sign-in are off-limits to Claude.
