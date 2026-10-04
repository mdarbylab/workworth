-- Stripe billing (Sprint 3). `subscriptions` and `organizations.plan` have
-- existed since v1 "so Pro is a data change, not a rewrite" (SPEC §9), but
-- nothing has ever written to them and `subscriptions` has no RLS policy at
-- all today — not even a read policy for the org that owns the row.
--
-- The webhook at app/api/webhooks/stripe is the only writer of subscription
-- state going forward. It has no user session (Stripe calls it directly, not
-- a signed-in browser), so it writes through a single security-definer
-- function granted to anon, the same pattern already used for
-- auth_org_id()/auth_is_owner() (see 20260926000000). The webhook verifies
-- the Stripe signature before ever calling it, so granting anon execute here
-- is no wider a hole than those were.

-- ---------------------------------------------------------------- columns

alter table public.subscriptions
  add column if not exists price_interval text,
  add column if not exists cancel_at_period_end boolean not null default false;

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check check (
    status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')
  );

alter table public.subscriptions
  drop constraint if exists subscriptions_price_interval_check;
alter table public.subscriptions
  add constraint subscriptions_price_interval_check check (price_interval in ('month', 'year'));

-- One Stripe subscription per org; Stripe customer ids are globally unique.
alter table public.subscriptions
  drop constraint if exists subscriptions_organization_id_key;
alter table public.subscriptions
  add constraint subscriptions_organization_id_key unique (organization_id);
alter table public.subscriptions
  drop constraint if exists subscriptions_stripe_customer_id_key;
alter table public.subscriptions
  add constraint subscriptions_stripe_customer_id_key unique (stripe_customer_id);

-- ---------------------------------------------------------------- read access

-- Settings needs to show the org's own billing status. No insert/update
-- policy exists for anon/authenticated on purpose: every write to this table
-- goes through apply_stripe_subscription_event below.
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select
  using (organization_id = auth_org_id());

-- ---------------------------------------------------------------- webhook write path

-- Applies one Stripe subscription event. p_organization_id is only passed on
-- the very first call (checkout.session.completed, before a subscriptions
-- row exists for this org); every later event is matched by
-- stripe_customer_id alone. Sets organizations.plan directly from the
-- resulting status, so plan is never out of sync with what Stripe actually
-- says — this function is the single place that writes either table.
create or replace function public.apply_stripe_subscription_event(
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_end timestamptz default null,
  p_cancel_at_period_end boolean default false,
  p_price_interval text default null,
  p_organization_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if p_organization_id is not null then
    insert into subscriptions (
      organization_id, stripe_customer_id, stripe_subscription_id,
      status, current_period_end, cancel_at_period_end, price_interval
    )
    values (
      p_organization_id, p_stripe_customer_id, p_stripe_subscription_id,
      p_status, p_current_period_end, p_cancel_at_period_end, p_price_interval
    )
    on conflict (organization_id) do update set
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      price_interval = excluded.price_interval,
      updated_at = now();
    v_org_id := p_organization_id;
  else
    update subscriptions set
      stripe_subscription_id = p_stripe_subscription_id,
      status = p_status,
      current_period_end = p_current_period_end,
      cancel_at_period_end = p_cancel_at_period_end,
      price_interval = p_price_interval,
      updated_at = now()
    where stripe_customer_id = p_stripe_customer_id
    returning organization_id into v_org_id;
  end if;

  if v_org_id is not null then
    update organizations
    set plan = case when p_status in ('trialing', 'active') then 'pro' else 'free' end
    where id = v_org_id;
  end if;
end;
$$;

grant execute on function public.apply_stripe_subscription_event(
  text, text, text, timestamptz, boolean, text, uuid
) to anon;
