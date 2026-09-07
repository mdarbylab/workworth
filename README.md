# WorkWorth

Know where your time goes, what you earned, and what you actually made.

See `SPEC.md` for the product spec and `CLAUDE.md` for working conventions.

## Local development

```sh
npm install
cp .env.example .env.local   # fill in SUPABASE_SERVICE_ROLE_KEY only if needed
npm run dev                  # http://localhost:3000
```

Checks: `npm run lint` and `npm run build`.

### Running the UI without Supabase access

`scripts/mock-supabase.mjs` is a small stand-in for Supabase Auth + PostgREST
with fixture data, useful for visual QA in sandboxes that can't reach the real
project. It is not used in production.

```sh
node scripts/mock-supabase.mjs                 # add MOCK_EMPTY=1 for empty states
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=mock npm run dev
```

Set the cookie it prints (`sb-localhost-auth-token`) in your browser to be
signed in as the fixture owner.

## Stack

- Next.js (App Router, TypeScript, Tailwind), hosted on Netlify.
- Supabase for Postgres, Auth, and RLS. Clients live in `lib/supabase/`
  (`server.ts` for server components/actions, `client.ts` for the browser,
  `proxy.ts` for session refresh in `proxy.ts` at the repo root).
- All writes go through server actions. Every org-scoped query relies on RLS.

## Invites

Inviting someone creates a pending membership that holds a seat. The owner
shares the invite link from Settings (copy, or the "Email it" mailto button).
The invitee signs in with the invited email and taps Join; `accept_invite`
checks the email matches and the seat-limit trigger enforces the plan. The app
does not send email itself, so no service-role key is needed for this.

## Supabase auth configuration

Email links (magic link and signup confirmation) land on `/auth/callback`,
which handles both PKCE `?code=` links and `?token_hash=&type=` links.

In the Supabase dashboard, under Authentication → URL Configuration, add the
app's origin plus `/auth/callback` to the redirect allowlist for every
environment (local, Netlify previews, production), e.g.
`http://localhost:3000/auth/callback`.
