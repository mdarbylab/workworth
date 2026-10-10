-- Sprint 7 (mileage half), continued from 20261010000000_mileage.sql. Kept
-- separate from the enum-value addition since ALTER TYPE ... ADD VALUE
-- can't safely share a transaction with DDL that references the new value
-- in some Postgres versions.

alter table expenses add column if not exists miles numeric(10, 2);
alter table organizations add column if not exists mileage_rate_cents integer not null default 67;
