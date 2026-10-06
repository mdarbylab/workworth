-- Fix apply_stripe_subscription_event: `case when ... then 'pro' else 'free'
-- end` is untyped text by default, and Postgres does not implicitly cast
-- text to the plan_type enum on assignment. Every webhook call failed with
-- 42804 ("column \"plan\" is of type plan_type but expression is of type
-- text") -- caught during the first real test-mode checkout, which silently
-- never flipped plan despite most other webhook events returning 200 (the
-- one that matters, checkout.session.completed, was the 500 buried among
-- them). See 20261004010000_stripe_billing.sql for the original function.

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
    set plan = (case when p_status in ('trialing', 'active') then 'pro' else 'free' end)::plan_type
    where id = v_org_id;
  end if;
end;
$$;

grant execute on function public.apply_stripe_subscription_event(
  text, text, text, timestamptz, boolean, text, uuid
) to anon;
