import { createClient } from "@/lib/supabase/server";
import { effectiveRateCents, profitCents, revenueCents, type BillingFields } from "@/lib/calc";

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
 */
export async function getJobTotals(): Promise<Map<string, { seconds: number; expensesCents: number }>> {
  const supabase = await createClient();
  const [{ data: entries }, { data: expenses }] = await Promise.all([
    supabase.from("time_entries").select("job_id, duration_seconds").not("stopped_at", "is", null),
    supabase.from("expenses").select("job_id, amount_cents").not("job_id", "is", null),
  ]);

  const totals = new Map<string, { seconds: number; expensesCents: number }>();
  const bucket = (id: string) => {
    let t = totals.get(id);
    if (!t) {
      t = { seconds: 0, expensesCents: 0 };
      totals.set(id, t);
    }
    return t;
  };
  for (const e of entries ?? []) bucket(e.job_id).seconds += e.duration_seconds ?? 0;
  for (const x of expenses ?? []) if (x.job_id) bucket(x.job_id).expensesCents += x.amount_cents;
  return totals;
}

export function summarize(job: BillingFields, seconds: number, expensesCents: number): JobSummary {
  const revenue = revenueCents(job, seconds);
  const profit = profitCents(revenue, expensesCents);
  return {
    seconds,
    revenueCents: revenue,
    expensesCents,
    profitCents: profit,
    rateCents: effectiveRateCents(profit, seconds),
  };
}
