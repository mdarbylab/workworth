-- invoices/invoice_lines have existed live since v1 (SPEC §7: "created
-- empty in v1 for later") but were never written into a tracked migration
-- file. This documents current live reality (create table if not exists,
-- exact live columns) before changing anything, so a fresh environment can
-- never diverge from prod on what these tables look like -- the same
-- discipline every other table in this schema already gets.
--
-- status has been plain text with no check constraint since creation --
-- the one inconsistency against every other status-like column in this
-- schema (billing_type, job_status, membership_role, plan_type,
-- time_source are all enums). Fixed here because nothing has ever written
-- to this column (RLS had no INSERT/UPDATE policy until this migration),
-- so there's no bad data to migrate around.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  number text,
  status text not null default 'draft',
  issued_on date,
  due_on date,
  total_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12, 4) not null default 1,
  unit_cents integer not null default 0,
  total_cents integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type public.invoice_status as enum ('draft', 'sent', 'paid', 'void');
  end if;
end $$;

update public.invoices set status = 'draft' where status not in ('draft', 'sent', 'paid', 'void');

alter table public.invoices
  alter column status drop default,
  alter column status type invoice_status using status::invoice_status,
  alter column status set default 'draft';

create unique index if not exists invoices_org_number_key
  on public.invoices (organization_id, number) where number is not null;

-- Invoicing touches money leaving the business, so writes are gated on
-- auth_is_owner() (full access) the same way Settings -> Business already
-- is, not just org membership (the existing _select policy's bar).
drop policy if exists invoices_insert on public.invoices;
create policy invoices_insert on public.invoices
  for insert with check (organization_id = auth_org_id() and auth_is_owner());

drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices
  for update using (organization_id = auth_org_id() and auth_is_owner())
  with check (organization_id = auth_org_id() and auth_is_owner());

-- Financial documents aren't deleted once real, only voided (SPEC §8.4's
-- "nothing silently overwritten" principle) -- delete stays available only
-- for drafts, which were never sent to anyone.
drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices
  for delete using (organization_id = auth_org_id() and auth_is_owner() and status = 'draft');

-- invoice_lines policies mirror invoices', scoped through the parent row,
-- and additionally require the parent to still be a draft: lines are only
-- editable before an invoice is sent (SPEC §8.4 principle again -- once it
-- left the business, voiding and recreating is the only way to "change" it).
drop policy if exists invoice_lines_insert on public.invoice_lines;
create policy invoice_lines_insert on public.invoice_lines
  for insert with check (
    organization_id = auth_org_id() and auth_is_owner()
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.status = 'draft')
  );

drop policy if exists invoice_lines_update on public.invoice_lines;
create policy invoice_lines_update on public.invoice_lines
  for update using (
    organization_id = auth_org_id() and auth_is_owner()
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.status = 'draft')
  )
  with check (
    organization_id = auth_org_id() and auth_is_owner()
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.status = 'draft')
  );

drop policy if exists invoice_lines_delete on public.invoice_lines;
create policy invoice_lines_delete on public.invoice_lines
  for delete using (
    organization_id = auth_org_id() and auth_is_owner()
    and exists (select 1 from public.invoices i where i.id = invoice_id and i.status = 'draft')
  );
