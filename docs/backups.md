# Database backups

The Supabase free plan has no automated backups. Supabase's own guidance is
that free-plan projects should export regularly and keep the copies off-site.
`.github/workflows/backup.yml` does that: every night it dumps the database,
encrypts the dump, and commits it to a **separate private repository**.

This repository is public, so the dump is never written here and never stored
as a workflow artifact — artifacts on a public repo can be downloaded by
anyone. It goes only to the private store, and it is encrypted before it
leaves the runner.

## What is in a dump

The `public` schema (organizations, memberships, clients, jobs, time entries,
expenses, audit events) and the `auth` schema (the accounts themselves).
Restoring one without the other gives you data nobody can log in to, or logins
with no data.

Storage objects are not included. Nothing in v1 writes to storage —
`receipt_path` exists on expenses but is unused.

## Setting it up

### 1. Create the private store

A new, **private** GitHub repository — `workworth-backups` is a fine name.
Empty is fine; the workflow creates the `dumps/` folder on its first run.

Keep it private. It holds your customers' hours and rates.

### 2. Create a token that can write to it

GitHub → Settings → Developer settings → **Fine-grained personal access
tokens** → Generate new token.

- **Repository access:** Only select repositories → your backup store. Nothing else.
- **Permissions:** Repository permissions → **Contents: Read and write**. Nothing else.
- **Expiration:** GitHub caps fine-grained tokens at one year. Put a reminder
  in your calendar for a week before it expires, because when it lapses the
  backups stop and the only signal is a failed workflow email.

### 3. Get the database connection string

Supabase dashboard → **Connect** → **Session pooler** (not Direct connection).

Direct connections are IPv6-only on the free plan and GitHub's runners are
IPv4-only, so a direct URL fails to connect. The session pooler URL looks like:

```
postgresql://postgres.btfmiviujsftuxzxslwt:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Replace `[YOUR-PASSWORD]` with the database password. If you don't have it,
reset it under Settings → Database → Database password. Resetting it does not
affect the running app, which authenticates with the anon key instead.

### 4. Pick a passphrase

Generate a long random one and **store it in a password manager**. Losing it
makes every dump permanently unreadable — that is the point of encrypting
them, and it cuts both ways.

Do not reuse your Supabase password. If the store repo ever leaks, you want
the two to be separate secrets.

### 5. Add four secrets to this repository

Settings → Secrets and variables → **Actions** → New repository secret.

| Secret | Value |
|---|---|
| `SUPABASE_DB_URL` | the session pooler URL from step 3, password filled in |
| `BACKUP_PASSPHRASE` | the passphrase from step 4 |
| `BACKUP_REPO` | `mdarbylab/workworth-backups` |
| `BACKUP_REPO_TOKEN` | the token from step 2 |

### 6. Run it once by hand

Actions → **Backup database** → **Run workflow**. Do not wait for the first
scheduled run to find out whether it works.

A green run means a `dumps/YYYY-MM-DD.sql.gz.gpg` file is sitting in the
private repo. Check that it is actually there before you consider this done.

## Restoring

### Read one dump

```bash
gpg --decrypt dumps/2026-09-26.sql.gz.gpg > dump.sql.gz
gunzip dump.sql.gz
```

It prompts for the passphrase. The result is plain SQL you can read and grep,
which matters when you only need to recover one deleted row rather than the
whole database.

### Restore the whole thing

Into a **new, empty** Supabase project, not over the top of a live one:

```bash
psql "postgresql://postgres.[NEW-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres" \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file dump.sql
```

Then apply anything in `supabase/migrations/` that is newer than the dump, and
point `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` at the new
project in Netlify, and redeploy.

Expect some noise restoring the `auth` schema: a new project already has its
own, so you will see errors about objects that already exist. Those are
usually fine. Errors touching `auth.users` are not — that is the account data,
and it needs to land.

## What this does not protect against

- **A bad migration you don't notice for two days.** You would restore to the
  night before, and lose everything since. Daily granularity is the trade for
  a free plan; point-in-time recovery is a paid feature.
- **Losing the passphrase.** Nothing recovers from that.
- **The token expiring silently.** A failed scheduled workflow emails you.
  Don't filter those away.
- **GitHub disabling the schedule.** Scheduled workflows on a public repo are
  disabled automatically after 60 days with no repository activity. If you stop
  pushing for two months, check the Actions tab.

## Checking it still works

Twice a year, decrypt the most recent dump and confirm it opens and contains a
`COPY "public"."time_entries"` block with rows in it. A backup nobody has ever
restored is a hypothesis, not a backup.
