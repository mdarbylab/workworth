-- Monitoring safety net for the seat-limit enforcement added in
-- 20261007100000_pro_seat_limit.sql. enforce_invite_limit() and
-- enforce_seat_limit() (triggers memberships_invite_limit and
-- memberships_seat_limit on memberships) already make it impossible to
-- exceed an org's seat_limit through the app. This doesn't re-check that
-- outcome -- an org correctly sitting over its new seat_limit after a
-- downgrade (SPEC §6: no forced removal) is expected, not a bug, and
-- alerting on it would just be noise. Instead this checks the one thing
-- that actually matters: are both enforcement triggers still attached
-- and enabled? That's the only realistic way the cap could ever be
-- bypassed (dropped/disabled by a migration mistake, a manual SQL slip,
-- `ALTER TABLE ... DISABLE TRIGGER`), since Postgres triggers fire
-- regardless of role/privilege otherwise.
--
-- security definer + granted to anon, same pattern as auth_org_id() and
-- apply_stripe_subscription_event(): /api/health is hit anonymously by
-- UptimeRobot, so it has no user session. pg_trigger/pg_class/pg_proc are
-- catalog tables, not customer data, so there's nothing sensitive to keep
-- out of the public response here.
create or replace function public.seat_limit_enforcement_ok()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    select count(*) from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_class c on c.oid = t.tgrelid
    where c.relname = 'memberships'
      and p.proname in ('enforce_invite_limit', 'enforce_seat_limit')
      and not t.tgisinternal
      and t.tgenabled = 'O'
  ) = 2
$$;

grant execute on function public.seat_limit_enforcement_ok() to anon;
