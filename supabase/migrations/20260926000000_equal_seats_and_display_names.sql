-- Equal permissions on the free plan, display names, and the anon grants that
-- org-scoped reads have always been missing.
--
-- SPEC §6. On the free plan the two people are peers: both see all of the
-- business's time and expenses, both can edit jobs and business settings, and
-- both can invite. Role separation becomes a paid feature. The one asymmetry
-- kept is that the person who created the business cannot be evicted by the
-- person they invited, and only they can delete the business.

-- ---------------------------------------------------------------- display name

alter table public.memberships
  add column if not exists display_name text;

-- Existing rows predate the field. Seed them from the invited email's local
-- part so nobody shows up blank; everyone can edit their own name in Settings.
update public.memberships
set display_name = initcap(replace(split_part(invited_email, '@', 1), '.', ' '))
where display_name is null and invited_email is not null;

-- ---------------------------------------------------------------- permissions

-- Who created the business. This is what `role = 'owner'` has always meant;
-- it keeps that meaning now that it no longer governs day-to-day access.
create or replace function public.auth_is_creator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships
    where user_id = auth.uid()
      and removed_at is null
      and accepted_at is not null
      and role = 'owner'
  )
$$;

-- Full access to the business's data and settings. On the free plan everyone
-- in the organization has it; on paid plans it follows the role, which is what
-- an upgrade buys. The name is kept so the nine policies that call it do not
-- have to change.
create or replace function public.auth_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    join organizations o on o.id = m.organization_id
    where m.user_id = auth.uid()
      and m.removed_at is null
      and m.accepted_at is not null
      and (m.role = 'owner' or o.plan = 'free')
  )
$$;

-- Everyone may edit their own membership row (their display name). Only the
-- creator may touch anyone else's. The trigger below decides what may actually
-- change, because "can update the row" is not the same as "can grant itself
-- the creator's role".
drop policy if exists memberships_update on public.memberships;
create policy memberships_update on public.memberships
  for update
  using (
    organization_id = auth_org_id()
    and (auth_is_creator() or user_id = auth.uid())
  );

-- The policy above opens each person's own row to them. Without this, a member
-- could set their own role to 'owner' and become the creator.
create or replace function public.guard_membership_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not auth_is_creator() then
    if new.role is distinct from old.role
       or new.organization_id is distinct from old.organization_id
       or new.user_id is distinct from old.user_id
       or new.invited_email is distinct from old.invited_email
       or new.invite_token is distinct from old.invite_token
       or new.accepted_at is distinct from old.accepted_at then
      raise exception 'only the person who created this business can change that';
    end if;
  end if;

  -- Being peers does not extend to evicting the person whose business it is.
  if new.removed_at is not null
     and old.removed_at is null
     and old.role = 'owner'
     and old.user_id is distinct from auth.uid() then
    raise exception 'the person who created this business cannot be removed';
  end if;

  return new;
end
$$;

drop trigger if exists memberships_guard_update on public.memberships;
create trigger memberships_guard_update
  before update on public.memberships
  for each row execute function public.guard_membership_update();

-- ---------------------------------------------------------------- anon grants

-- Every org-scoped policy calls these, and the anon role could not execute
-- them. An anonymous read therefore raised "permission denied for function
-- auth_org_id" instead of returning no rows — which is what made /api/health
-- report the database unreachable while it was perfectly healthy. Granting
-- execute still denies the data: with no JWT these return null and false.
grant execute on function public.auth_org_id() to anon;
grant execute on function public.auth_is_owner() to anon;
grant execute on function public.auth_is_creator() to anon;
