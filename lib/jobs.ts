import { createClient } from "@/lib/supabase/server";
import {
  effectiveRateCents,
  profitCents,
  revenueCents,
  roundSeconds,
  type BillingFields,
  type RoundingConfig,
} from "@/lib/calc";

export type JobTotals = { seconds: number; billableSeconds: number; expensesCents: number };

export type JobSummary = {
  seconds: number;
  revenueCents: number;
  expensesCents: number;
  profitCents: number;
  rateCents: number | null;
};

/**
 * Tracked seconds and expense cents per job, across everything the current
 * user is allowed to see (RLS: owner sees all, member sees own).
 *
 * billableSeconds rounds each entry individually before summing (§8.1,
 * Sprint 7) -- it's what revenue is computed from; seconds stays the raw,
 * always-true tracked total shown on screen.
 */
export async function getJobTotals(rounding: RoundingConfig): Promise<Map<string, JobTotals>> {
  const supabase = await createClient();
  const [{ data: entries }, { data: expenses }] = await Promise.all([
    supabase.from("time_entries").select("job_id, duration_seconds").not("stopped_at", "is", null),
    supabase.from("expenses").select("job_id, amount_cents").not("job_id", "is", null),
  ]);

  const totals = new Map<string, JobTotals>();
  const bucket = (id: string) => {
    let t = totals.get(id);
    if (!t) {
      t = { seconds: 0, billableSeconds: 0, expensesCents: 0 };
      totals.set(id, t);
    }
    return t;
  };
  for (const e of entries ?? []) {
    const secs = e.duration_seconds ?? 0;
    const t = bucket(e.job_id);
    t.seconds += secs;
    t.billableSeconds += roundSeconds(secs, rounding);
  }
  for (const x of expenses ?? []) if (x.job_id) bucket(x.job_id).expensesCents += x.amount_cents;
  return totals;
}

export function summarize(job: BillingFields, totals: JobTotals, expensesCents: number): JobSummary {
  const revenue = revenueCents(job, totals.billableSeconds);
  const profit = profitCents(revenue, expensesCents);
  return {
    seconds: totals.seconds,
    revenueCents: revenue,
    expensesCents,
    profitCents: profit,
    rateCents: effectiveRateCents(profit, totals.seconds),
  };
}
