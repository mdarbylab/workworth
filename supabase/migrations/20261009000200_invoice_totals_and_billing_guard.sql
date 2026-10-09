-- Two small additive pieces to close out Sprint 6's invoicing schema:
--
-- 1. invoices.total_cents is never hand-maintained by app code -- this
--    trigger recomputes it from invoice_lines on every insert/update/
--    delete, the same "derived, not trusted from the client" pattern as
--    time_entries_set_duration.
--
-- 2. invoice_lines.job_id and time_entries.invoiced_in_invoice_id: an
--    invoice generated from a client statement can span multiple jobs,
--    which invoices.job_id (singular) was never designed for -- lines
--    carry their own optional job reference instead. invoiced_in_invoice_id
--    lets the "Save as invoice" flow skip hours already billed on another
--    invoice (minimal double-billing guard), and clears back to null when
--    that invoice is voided, freeing the hours to be billed correctly on a
--    replacement.

alter table public.invoice_lines
  add column if not exists job_id uuid references public.jobs(id) on delete set null;

alter table public.time_entries
  add column if not exists invoiced_in_invoice_id uuid references public.invoices(id) on delete set null;

create or replace function public.invoices_set_total()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update invoices set
    total_cents = (select coalesce(sum(total_cents), 0) from invoice_lines where invoice_id = v_invoice_id),
    updated_at = now()
  where id = v_invoice_id;
  return null;
end;
$$;

revoke execute on function public.invoices_set_total() from public, anon, authenticated;

drop trigger if exists invoice_lines_set_total on public.invoice_lines;
create trigger invoice_lines_set_total
  after insert or update or delete on public.invoice_lines
  for each row execute function public.invoices_set_total();
