-- Sprint 8: receipt storage (SPEC §5.4). First use of Supabase Storage.
--
-- A private bucket: a receipt can show card digits, addresses, what a
-- business buys and from whom, so nothing here is ever publicly readable.
-- Viewing goes through short-lived signed URLs minted server-side
-- (app/(app)/expenses/[id]/receipt/route.ts), which require the same
-- select access as below.
--
-- Object paths are `{organization_id}/{expense_id}/{filename}`, so the
-- policies can key on the path alone:
--   [1] must be the caller's org (auth_org_id()), same as every table policy;
--   [2] must be an expense the caller can see -- checked by querying
--       public.expenses as the caller, so expenses_select's own
--       owner-or-own-row rule applies unchanged. On Pro, a member sees only
--       their own expenses' receipts, exactly as they see only their own
--       expenses.
--
-- The bucket enforces size and type itself (4 MB, images + PDF), so a
-- direct Storage API call with a user's JWT can't get around the limits
-- the upload form checks. 4 MB, not more, because uploads go through a
-- server action on Netlify, whose functions cap a request at 6 MB after
-- base64-encoding the body (4 MB × 4/3 ≈ 5.3 MB plus the other fields).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do nothing;

-- Writes need one case the caller can't see through RLS: a new expense's
-- receipt is uploaded *before* the expense row is inserted (so the row is
-- created with receipt_path already set, rather than created and then
-- immediately "edited" in history), and after an expense is deleted its
-- receipt is removed. In both cases no expense with that id exists. But
-- "the caller can't see it" is not the same as "it doesn't exist" -- on Pro
-- a member can't see a colleague's expense -- so this has to look past RLS.
-- It only answers yes/no for one id and reveals nothing else.
create or replace function public.expense_id_unused(p_expense_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from expenses where id::text = p_expense_id);
$$;

revoke execute on function public.expense_id_unused(text) from public, anon;
grant execute on function public.expense_id_unused(text) to authenticated;

create policy receipts_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and exists (
      select 1 from public.expenses e
      where e.id::text = (storage.foldername(name))[2]
    )
  );

-- Uploading is Pro-only (SPEC §9), checked here too so it can't be skipped
-- by calling the Storage API directly. A business that downgrades keeps
-- viewing and removing the receipts it already has.
create policy receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and exists (
      select 1 from public.organizations o
      where o.id = public.auth_org_id() and o.plan = 'pro'
    )
    and (
      exists (
        select 1 from public.expenses e
        where e.id::text = (storage.foldername(name))[2]
      )
      or public.expense_id_unused((storage.foldername(name))[2])
    )
  );

create policy receipts_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = public.auth_org_id()::text
    and (
      exists (
        select 1 from public.expenses e
        where e.id::text = (storage.foldername(name))[2]
      )
      or public.expense_id_unused((storage.foldername(name))[2])
    )
  );

-- No update policy: every upload gets a fresh filename, so nothing is ever
-- overwritten in place (upsert is refused).
