-- Sequential per-org invoice numbers (INV-0001, INV-0002, ...). A plain
-- Postgres sequence is global and would leak cross-org volume/ordering (org
-- A could infer org B's invoice count from gaps), so the counter lives on
-- organizations instead, one per org, like seat_limit and plan already do.
--
-- security definer here is about atomicity under concurrent "Save as
-- invoice" clicks for the same org, not about bypassing RLS: the caller
-- must already belong to the org being incremented (checked explicitly,
-- since this function runs with elevated privilege). The `update ...
-- returning` row-locks the organizations row for the update, so two
-- simultaneous calls for the same org serialize and get 0001/0002, never a
-- duplicate -- the same atomicity apply_stripe_subscription_event already
-- relies on for its own single-row updates.

alter table public.organizations add column if not exists invoice_seq integer not null default 0;

create or replace function public.next_invoice_number(p_organization_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq integer;
begin
  if p_organization_id is distinct from auth_org_id() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  update organizations
    set invoice_seq = invoice_seq + 1
    where id = p_organization_id
    returning invoice_seq into v_seq;

  return 'INV-' || lpad(v_seq::text, 4, '0');
end;
$$;

grant execute on function public.next_invoice_number(uuid) to authenticated;
