-- SL-03: federal income tax estimate (SPEC §5.10, §14; ADR 0007). REQ-047.
--
-- Standard deductions join tax_years; brackets get their own table, one row
-- per (year, filing status, lower bound): the rate on income above that
-- bound, up to the next row's. Both are read-only reference data, readable
-- by any signed-in user and added by migration each year.
--
-- tax_profiles: the account's filing status (one personal fact, never shown
-- to anyone else). Own row only; gone with the account. No row = single.
--
-- 2025 figures: IRS Rev. Proc. 2024-40 as amended by Public Law 119-21
-- (standard deduction). 2026 figures: IRS Rev. Proc. 2025-32.

alter table public.tax_years
  add column if not exists standard_deduction_single_cents bigint,
  add column if not exists standard_deduction_joint_cents bigint,
  add column if not exists standard_deduction_separate_cents bigint,
  add column if not exists standard_deduction_head_cents bigint;

update public.tax_years set
  standard_deduction_single_cents = 1575000,
  standard_deduction_joint_cents = 3150000,
  standard_deduction_separate_cents = 1575000,
  standard_deduction_head_cents = 2362500
where tax_year = 2025 and standard_deduction_single_cents is null;

update public.tax_years set
  standard_deduction_single_cents = 1610000,
  standard_deduction_joint_cents = 3220000,
  standard_deduction_separate_cents = 1610000,
  standard_deduction_head_cents = 2415000
where tax_year = 2026 and standard_deduction_single_cents is null;

alter table public.tax_years
  alter column standard_deduction_single_cents set not null,
  alter column standard_deduction_joint_cents set not null,
  alter column standard_deduction_separate_cents set not null,
  alter column standard_deduction_head_cents set not null;

create table if not exists public.tax_brackets (
  tax_year integer not null references public.tax_years (tax_year),
  filing_status text not null check (filing_status in ('single', 'joint', 'separate', 'head')),
  lower_cents bigint not null check (lower_cents >= 0),
  rate_bp integer not null check (rate_bp between 0 and 10000),
  primary key (tax_year, filing_status, lower_cents)
);

alter table public.tax_brackets enable row level security;

drop policy if exists tax_brackets_select on public.tax_brackets;
create policy tax_brackets_select on public.tax_brackets
  for select to authenticated
  using (true);

insert into public.tax_brackets (tax_year, filing_status, lower_cents, rate_bp) values
  (2025, 'single', 0, 1000),
  (2025, 'single', 1192500, 1200),
  (2025, 'single', 4847500, 2200),
  (2025, 'single', 10335000, 2400),
  (2025, 'single', 19730000, 3200),
  (2025, 'single', 25052500, 3500),
  (2025, 'single', 62635000, 3700),
  (2025, 'joint', 0, 1000),
  (2025, 'joint', 2385000, 1200),
  (2025, 'joint', 9695000, 2200),
  (2025, 'joint', 20670000, 2400),
  (2025, 'joint', 39460000, 3200),
  (2025, 'joint', 50105000, 3500),
  (2025, 'joint', 75160000, 3700),
  (2025, 'separate', 0, 1000),
  (2025, 'separate', 1192500, 1200),
  (2025, 'separate', 4847500, 2200),
  (2025, 'separate', 10335000, 2400),
  (2025, 'separate', 19730000, 3200),
  (2025, 'separate', 25052500, 3500),
  (2025, 'separate', 37580000, 3700),
  (2025, 'head', 0, 1000),
  (2025, 'head', 1700000, 1200),
  (2025, 'head', 6485000, 2200),
  (2025, 'head', 10335000, 2400),
  (2025, 'head', 19730000, 3200),
  (2025, 'head', 25050000, 3500),
  (2025, 'head', 62635000, 3700),
  (2026, 'single', 0, 1000),
  (2026, 'single', 1240000, 1200),
  (2026, 'single', 5040000, 2200),
  (2026, 'single', 10570000, 2400),
  (2026, 'single', 20177500, 3200),
  (2026, 'single', 25622500, 3500),
  (2026, 'single', 64060000, 3700),
  (2026, 'joint', 0, 1000),
  (2026, 'joint', 2480000, 1200),
  (2026, 'joint', 10080000, 2200),
  (2026, 'joint', 21140000, 2400),
  (2026, 'joint', 40355000, 3200),
  (2026, 'joint', 51245000, 3500),
  (2026, 'joint', 76870000, 3700),
  (2026, 'separate', 0, 1000),
  (2026, 'separate', 1240000, 1200),
  (2026, 'separate', 5040000, 2200),
  (2026, 'separate', 10570000, 2400),
  (2026, 'separate', 20177500, 3200),
  (2026, 'separate', 25622500, 3500),
  (2026, 'separate', 38435000, 3700),
  (2026, 'head', 0, 1000),
  (2026, 'head', 1770000, 1200),
  (2026, 'head', 6745000, 2200),
  (2026, 'head', 10570000, 2400),
  (2026, 'head', 20175000, 3200),
  (2026, 'head', 25620000, 3500),
  (2026, 'head', 64060000, 3700)
on conflict do nothing;

create table if not exists public.tax_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  filing_status text not null check (filing_status in ('single', 'joint', 'separate', 'head')),
  updated_at timestamptz not null default now()
);

alter table public.tax_profiles enable row level security;

drop policy if exists tax_profiles_select on public.tax_profiles;
create policy tax_profiles_select on public.tax_profiles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists tax_profiles_insert on public.tax_profiles;
create policy tax_profiles_insert on public.tax_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists tax_profiles_update on public.tax_profiles;
create policy tax_profiles_update on public.tax_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.tax_brackets from anon;
revoke all on public.tax_profiles from anon;
revoke insert, update, delete, truncate on public.tax_brackets from authenticated;
revoke delete, truncate on public.tax_profiles from authenticated;
