# Auth email (custom SMTP)

Supabase's built-in mailer only delivers to addresses on the project team,
which blocked every real signup. As of 2026-09-27, Supabase Auth sends
through [Resend](https://resend.com) instead, verified end to end with a
real signup outside the project team.

## Setup

- **Resend**: domain `workworth.de` added and verified. A sending-only API
  key (`supabase-auth`, scoped to sending from this domain) is the SMTP
  password.
- **Supabase** → Authentication → SMTP Settings: host `smtp.resend.com`,
  port `465`, username `resend`, sender `noreply@workworth.de`, sender name
  `WorkWorth`.
- **DNS** (at Spaceship, under `send.workworth.de` and `_dmarc.workworth.de`):
  SPF and DKIM records Resend generated, a return-path MX, and
  `_dmarc.workworth.de TXT "v=DMARC1; p=none;"`. `p=none` only monitors for
  now; tighten it once mail volume is established.
- **Rate limit**: Authentication → Rate Limits, emails per hour raised from
  Supabase's low default to fit a beta (comfortably under Resend's free-plan
  cap of ~100/day).

There's no reply-to and no inbox at `noreply@workworth.de` — replies bounce.
That's fine for auth mail. A working contact address (`hello@workworth.de`,
likely free forwarding to a real inbox) is a decision for the Impressum gap,
not this one.

## Templates

Supabase Authentication → Templates. Three are wired up, because those are
the only auth emails the app actually sends:

- **Confirm sign up** — used by `signUp()` in `app/(auth)/actions.ts`.
- **Magic link or OTP** — used by `sendMagicLink()` in the same file.
- **Reset password** — used by `requestPasswordReset()` in the same file,
  via `resetPasswordForEmail()`. The link signs the browser into a recovery
  session and lands on `/reset-password` (a top-level route, not under
  `app/(auth)` — that layout bounces anyone with a session, which a
  recovery link always creates). `/forgot-password` is public in
  `lib/supabase/proxy.ts`'s `PUBLIC_PATHS`; `/reset-password` deliberately
  isn't, since it needs that session.

All three are branded: the WorkWorth mark (`https://workworth.de/icons/icon-192.png`,
hosted, not embedded — email clients can't use local files), a navy/serif
heading, and a navy button linking `{{ .ConfirmationURL }}`. Table-based
layout with inline styles and system-font fallbacks, since Fraunces won't
load in mail clients.

The other templates in that list (Invite user, Change email, MFA, etc.) are
still Supabase's unbranded defaults, because nothing in the app calls them
yet — invites are a custom mailto link (`app/(app)/settings/page.tsx`), not
Supabase's invite API.

## Verifying it still works

Sign up with an address outside the project team (a `+something` Gmail
alias works) and check:

1. It arrives in the inbox, not spam, from **WorkWorth**.
2. Gmail's "Show original" (or equivalent) shows `dkim=pass`, `spf=pass`,
   and `dmarc=pass` for `workworth.de`.
3. The confirmation link lands on `workworth.de/onboarding`, not localhost.

Delete the test user afterward under Supabase → Authentication → Users —
signups against the live database are real rows, not sandboxed.

## If it breaks

- **No confirmation email at all**: check Supabase → Authentication → Logs
  for the send attempt, and Resend's own dashboard for a bounce or block.
- **Email sends but fails DKIM/SPF**: check the DNS records under
  `send.workworth.de` and `resend._domainkey.workworth.de` haven't been
  edited or removed at Spaceship.
- **Link points at the wrong domain**: check Supabase → Authentication →
  URL Configuration still lists `https://workworth.de/auth/callback`.
