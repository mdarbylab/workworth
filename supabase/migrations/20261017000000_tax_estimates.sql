-- SL-02: tax estimates, part 1 (SPEC §14, ADR 0006). REQ-047, REQ-048.
--
-- tax_years: rates by year, never hardcoded in app code. Rates are integer
-- basis points (1240 = 12.40%), amounts integer cents. Public reference data,
-- readable by any signed-in user; nobody writes it from the app. Add each new
-- year by migration once the IRS and SSA publish it. The additional-Medicare
-- thresholds are stored per filing status now so SL-03 (filing status) needs
-- no migration for them; they are set by statute and not indexed.
--
-- tax_consents: the one-time disclaimer agreement, per account and per
-- disclaimer wording (TAX_DISCLAIMER_VERSION in lib/tax.ts). A user reads
-- and inserts only their own rows. No update or delete policy: an agreement
-- can't be edited afterwards. Rows go with the account (on delete cascade).

create table if not exists public.tax_years (
  tax_year integer primary key check (tax_year between 2000 and 2100),
  se_earnings_factor_bp integer not null check (se_earnings_factor_bp between 0 and 10000),
  social_security_rate_bp integer not null check (social_security_rate_bp between 0 and 10000),
  social_security_wage_base_cents bigint not null check (social_security_wage_base_cents > 0),
  medicare_rate_bp integer not null check (medicare_rate_bp between 0 and 10000),
  additional_medicare_rate_bp integer not null check (additional_medicare_rate_bp between 0 and 10000),
  additional_medicare_threshold_single_cents bigint not null check (additional_medicare_threshold_single_cents > 0),
  additional_medicare_threshold_joint_cents bigint not null check (additional_medicare_threshold_joint_cents > 0),
  additional_medicare_threshold_separate_cents bigint not null check (additional_medicare_threshold_separate_cents > 0),
  source text not null,
  created_at timestamptz not null default now()
);

alter table public.tax_years enable row level security;

drop policy if exists tax_years_select on public.tax_years;
create policy tax_years_select on public.tax_years
  for select to authenticated
  using (true);

insert into public.tax_years (
  tax_year,
  se_earnings_factor_bp,
  social_security_rate_bp,
  social_security_wage_base_cents,
  medicare_rate_bp,
  additional_medicare_rate_bp,
  additional_medicare_threshold_single_cents,
  additional_medicare_threshold_joint_cents,
  additional_medicare_threshold_separate_cents,
  source
) values
  (2025, 9235, 1240, 17610000, 290, 90, 20000000, 25000000, 12500000,
   'IRS Schedule SE (2025); SSA contribution and benefit base 2025: $176,100'),
  (2026, 9235, 1240, 18450000, 290, 90, 20000000, 25000000, 12500000,
   'IRS Schedule SE; SSA contribution and benefit base 2026: $184,500')
on conflict (tax_year) do nothing;

create table if not exists public.tax_consents (
  user_id uuid not null references auth.users (id) on delete cascade,
  disclaimer_version integer not null check (disclaimer_version > 0),
  agreed_at timestamptz not null default now(),
  primary key (user_id, disclaimer_version)
);

alter table public.tax_consents enable row level security;

drop policy if exists tax_consents_select on public.tax_consents;
create policy tax_consents_select on public.tax_consents
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists tax_consents_insert on public.tax_consents;
create policy tax_consents_insert on public.tax_consents
  for insert to authenticated
  with check (user_id = auth.uid());

revoke all on public.tax_years from anon;
revoke all on public.tax_consents from anon;
revoke insert, update, delete, truncate on public.tax_years from authenticated;
revoke insert, update, delete, truncate on public.tax_consents from authenticated;
-- agreed_at always comes from the database clock, never the client.
grant insert (user_id, disclaimer_version) on public.tax_consents to authenticated;
