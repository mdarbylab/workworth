-- Fix: `subscriptions.cancel_at_period_end` only ever reflected Stripe's
-- `cancel_at_period_end` boolean, but Stripe also schedules cancellation via
-- the more general `cancel_at` timestamp -- which is what a trialing
-- subscription canceled through the Customer Portal actually sets
-- (`cancel_at_period_end` stays false; `cancel_at` is set to the trial end
-- instead). Caught 2026-10-06 testing a real cancellation: the Stripe
-- portal correctly showed "canceled", our DB and Settings page didn't.
--
-- `cancel_at` is strictly more general -- whenever `cancel_at_period_end`
-- would have been true, `cancel_at` equals `current_period_end` anyway -- so
-- it replaces the boolean rather than sitting alongside it.

alter table public.subscriptions
  add column if not exists cancel_at timestamptz;

update public.subscriptions
set cancel_at = current_period_end
where cancel_at_period_end = true and cancel_at is null;

alter table public.subscriptions
  drop column if exists cancel_at_period_end;

-- The function's signature changes (boolean -> timestamptz in the same
-- position), which Postgres treats as a different overload -- drop the old
-- one explicitly rather than leaving it dangling.
drop function if exists public.apply_stripe_subscription_event(
  text, text, text, timestamptz, boolean, text, uuid
);

create or replace function public.apply_stripe_subscription_event(
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_end timestamptz default null,
  p_cancel_at timestamptz default null,
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
      status, current_period_end, cancel_at, price_interval
    )
    values (
      p_organization_id, p_stripe_customer_id, p_stripe_subscription_id,
      p_status, p_current_period_end, p_cancel_at, p_price_interval
    )
    on conflict (organization_id) do update set
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at = excluded.cancel_at,
      price_interval = excluded.price_interval,
      updated_at = now();
    v_org_id := p_organization_id;
  else
    update subscriptions set
      stripe_subscription_id = p_stripe_subscription_id,
      status = p_status,
      current_period_end = p_current_period_end,
      cancel_at = p_cancel_at,
      price_interval = p_price_interval,
      updated_at = now()
    where stripe_customer_id = p_stripe_customer_id
    returning organization_id into v_org_id;
  end if;

  if v_org_id is not null then
    update organizations
    set plan = (case when p_status in ('trialing', 'active') then 'pro' else 'free' end)::plan_type
    where id = v_org_id;
  end if;
end;
$$;

grant execute on function public.apply_stripe_subscription_event(
  text, text, text, timestamptz, timestamptz, text, uuid
) to anon;
