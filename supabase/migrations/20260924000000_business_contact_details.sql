-- Optional letterhead details for client-facing work reports (SPEC 5.8).
-- Applied to the live `workworth` project on 2026-09-24 via the Supabase MCP
-- connector. Do not re-apply against production.
--
-- All three are nullable: a business that leaves them blank gets a name-only
-- header on its reports. No RLS change is needed; the existing org_update
-- policy already limits writes to the owner.

alter table public.organizations
  add column if not exists address text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text;

comment on column public.organizations.address is 'Optional multi-line postal address shown on client reports.';
comment on column public.organizations.contact_email is 'Optional public contact email shown on client reports (not the login email).';
comment on column public.organizations.contact_phone is 'Optional public contact phone shown on client reports.';
