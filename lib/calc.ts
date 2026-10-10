// Calculation rules from SPEC §8. Money is integer cents; time is seconds.

import type { Tables } from "@/lib/supabase/types";

export type BillingFields = {
  billing_type: "hourly" | "fixed";
  hourly_rate_cents: number | null;
  fixed_price_cents: number | null;
};

export const MAX_ENTRY_SECONDS = 24 * 3600;

/** §8.2: hourly = hours × rate (unrounded hours); fixed = price regardless of hours. */
export function revenueCents(job: BillingFields, seconds: number): number {
  if (job.billing_type === "fixed") return job.fixed_price_cents ?? 0;
  const rate = job.hourly_rate_cents ?? 0;
  return Math.round((seconds / 3600) * rate);
}

export type RoundingMode = "up" | "nearest" | "down";
export type RoundingConfig = { incrementMinutes: number; mode: RoundingMode } | null;

/**
 * §8.1: rounding (Pro, Sprint 7) applies only at the billing surface, never
 * to the stored duration itself. Rounds a single time entry's seconds to
 * the nearest configured increment -- callers round each entry before
 * summing into a job/period total, not the total itself, matching how
 * contractors actually think about it ("each visit rounds to 15 min").
 */
export function roundSeconds(seconds: number, config: RoundingConfig): number {
  if (!config || config.incrementMinutes <= 0) return seconds;
  const incSec = config.incrementMinutes * 60;
  const units = seconds / incSec;
  const rounded = config.mode === "up" ? Math.ceil(units) : config.mode === "down" ? Math.floor(units) : Math.round(units);
  return rounded * incSec;
}

/** Off for free-plan orgs regardless of the stored setting (SPEC §8.1: "a paid feature later"). */
export function roundingConfigFor(
  org: Pick<Tables<"organizations">, "plan" | "time_rounding_minutes" | "time_rounding_mode">,
): RoundingConfig {
  if (org.plan !== "pro" || org.time_rounding_minutes === null) return null;
  return { incrementMinutes: org.time_rounding_minutes, mode: org.time_rounding_mode };
}

/** §8.3: profit = revenue − expenses. */
export function profitCents(revenue: number, expenses: number): number {
  return revenue - expenses;
}

/** §8.3: profit ÷ hours, or null when hours = 0 (render "—"). Also null
 * under a minute of tracked time: formatDuration rounds that to "0m", so a
 * rate rendered next to it has no visible denominator behind it — a 4-second
 * entry could otherwise show $90,000/hr alongside "0m". This doesn't round
 * the stored duration itself (§8.1: no rounding in v1), only suppresses the
 * rate display for durations too short to show. */
export function effectiveRateCents(profit: number, seconds: number): number | null {
  if (seconds < 60) return null;
  return Math.round(profit / (seconds / 3600));
}

/** "14h 32m"; sub-minute durations render as "0m". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** "1:02:33" for a live timer. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "$1,850" when whole dollars, otherwise "$105.80". */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return cents % 100 === 0 ? usdWhole.format(dollars) : usd.format(dollars);
}

export function formatRate(cents: number | null): string {
  return cents === null ? "—" : `${formatCents(cents)}/hr`;
}

/** Parse a dollar string from a form into cents. Empty → null; invalid → NaN. */
export function parseDollars(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, "");
  if (s === "") return null;
  if (!/^\d*(\.\d{0,2})?$/.test(s) || s === ".") return NaN;
  return Math.round(Number(s) * 100);
}
