-- Sprint 5: raise the seat limit for Pro orgs. Free stays at 2 (duos);
-- Pro goes to 10, matching SPEC Sec1's own stated target market ("1-10
-- people"). A higher tier for teams past 10 is a separate, later decision
-- -- not named or priced here.
--
-- enforce_invite_limit() and enforce_seat_limit() (both on `memberships`)
-- already read organizations.seat_limit dynamically -- neither has a
-- hardcoded 2. The only thing that's actually hardcoded is the *value*:
-- the column defaults to 2 and nothing has ever written a different
-- number after org creation. apply_stripe_subscription_event is already
-- the sole writer of organizations.plan (see 20261004010000 and
-- 20261006030000); it becomes the sole writer of seat_limit too, so plan
-- and seat_limit can never drift out of sync with each other.

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
  v_plan plan_type;
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
    v_plan := (case when p_status in ('trialing', 'active') then 'pro' else 'free' end)::plan_type;
    update organizations
    set plan = v_plan,
        seat_limit = case when v_plan = 'pro' then 10 else 2 end
    where id = v_org_id;
  end if;
end;
$$;

-- One-time backfill: any org already on Pro (from testing before this
-- migration) gets the new cap immediately, rather than waiting for its
-- next webhook event to apply it.
update organizations set seat_limit = 10 where plan = 'pro';
