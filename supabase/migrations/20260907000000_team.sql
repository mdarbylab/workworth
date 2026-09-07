-- Sprint 5 — Team (SPEC §5.6, §6). Applied to the live project via the
-- Supabase MCP connector on 2026-09-07. Do not re-apply against production.

-- Entries outlive the account that created them: a removed or deleted person's
-- history stays with the business, attributed to "Former member" in the UI.
alter table public.time_entries alter column user_id drop not null;
alter table public.time_entries drop constraint time_entries_user_id_fkey;
alter table public.time_entries
  add constraint time_entries_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

alter table public.expenses alter column user_id drop not null;
alter table public.expenses drop constraint expenses_user_id_fkey;
alter table public.expenses
  add constraint expenses_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- Public-ish preview of an invite so the landing page can say which business
-- the person is joining before they sign in. The token is an unguessable uuid.
create or replace function public.invite_preview(token uuid)
returns table (organization_name text, invited_email text, state text)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.name,
    m.invited_email,
    case
      when m.removed_at is not null then 'cancelled'
      when m.accepted_at is not null then 'accepted'
      else 'pending'
    end
  from memberships m
  join organizations o on o.id = m.organization_id
  where m.invite_token = token and m.invited_email is not null
$$;

-- Accept an invite as the signed-in user. The seat limit is enforced by the
-- memberships_seat_limit trigger when accepted_at is set (§6).
create or replace function public.accept_invite(token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  m memberships%rowtype;
  jwt_email text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into m from memberships
  where invite_token = token and invited_email is not null;
  if not found then
    raise exception 'invite not found';
  end if;
  if m.removed_at is not null then
    raise exception 'invite cancelled';
  end if;
  if m.accepted_at is not null then
    if m.user_id = auth.uid() then
      return m.organization_id;
    end if;
    raise exception 'invite already used';
  end if;

  jwt_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  if jwt_email <> lower(m.invited_email) then
    raise exception 'invite email mismatch';
  end if;

  if exists (select 1 from memberships where user_id = auth.uid() and removed_at is null) then
    raise exception 'user already belongs to an organization';
  end if;

  update memberships
  set user_id = auth.uid(), accepted_at = now()
  where id = m.id;

  return m.organization_id;
end $$;

-- Delete the signed-in user's account (§5.6). A sole member takes their
-- organization with them; a member of a shared business leaves their entries
-- behind; an owner must remove other people first (no ownership transfer in v1).
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  m memberships%rowtype;
  others int;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into m from memberships where user_id = uid and removed_at is null;
  if found then
    select count(*) into others from memberships
    where organization_id = m.organization_id
      and removed_at is null and accepted_at is not null
      and id <> m.id;

    if m.role = 'owner' and others > 0 then
      raise exception 'owner of an organization with other people';
    end if;

    if others = 0 then
      delete from organizations where id = m.organization_id; -- cascades
    else
      update memberships set removed_at = now() where id = m.id;
    end if;
  end if;

  delete from auth.users where id = uid;
end $$;

revoke execute on function public.delete_account() from anon;
revoke execute on function public.accept_invite(uuid) from anon;
