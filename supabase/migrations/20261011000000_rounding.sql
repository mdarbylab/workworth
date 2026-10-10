-- Sprint 7 (rounding half). SPEC §8.1: "No rounding in v1. (Rounding is a
-- paid feature later.)" Raw time_entries.duration_seconds stays untouched
-- forever everywhere -- this only ever affects the *billing* surface (job
-- revenue, Reports, Client Report, Invoices), computed in app code via
-- lib/calc.ts's roundSeconds()/roundingConfigFor(). This migration is just
-- the org-level setting those helpers read.
--
-- time_rounding_minutes nullable = off (the default -- matches "off by
-- default" and lets existing orgs keep their current, unrounded behavior
-- with zero migration risk). Constrained to real billing increments via a
-- CHECK rather than left as a free integer, so nothing stores "7 minutes."
--
-- Pro-gated in app code (roundingConfigFor() returns null for a free-plan
-- org regardless of this column), matching SPEC §8.1's "paid feature
-- later" -- not enforced again here at the DB level, since nothing other
-- than app code ever reads this column, the same pattern as every other
-- Pro-only *feature* (as opposed to Pro-only *data access*, which RLS does
-- enforce) in this schema.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'rounding_mode') then
    create type rounding_mode as enum ('up', 'nearest', 'down');
  end if;
end $$;

alter table organizations
  add column if not exists time_rounding_minutes integer,
  add column if not exists time_rounding_mode rounding_mode not null default 'nearest';

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'organizations_time_rounding_minutes_check'
  ) then
    alter table organizations
      add constraint organizations_time_rounding_minutes_check
      check (time_rounding_minutes is null or time_rounding_minutes in (5, 10, 15, 30));
  end if;
end $$;
