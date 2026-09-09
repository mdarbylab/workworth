import { createClient } from "@/lib/supabase/server";
import { effectiveRateCents, revenueCents, type BillingFields } from "@/lib/calc";
import type { Period } from "@/lib/periods";

export type JobRow = {
  jobId: string | null; // null = expenses with no job
  name: string;
  clientName: string | null;
  seconds: number;
  revenueCents: number;
  expensesCents: number;
  profitCents: number;
  rateCents: number | null;
};

export type Report = {
  seconds: number;
  revenueCents: number;
  expensesCents: number;
  profitCents: number;
  rateCents: number | null;
  rows: JobRow[];
};

/**
 * SPEC §5.5 / §8.3. A job appears when it has time or expenses in the period.
 * Hourly revenue uses only the period's tracked seconds; a fixed price counts
 * in full in any period with activity on the job (§8.2). Expenses without a
 * job count toward the org total but no job.
 */
export async function buildReport(period: Period): Promise<Report> {
  const supabase = await createClient();
  const [{ data: entries }, { data: expenses }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("job_id, duration_seconds, jobs(name, billing_type, hourly_rate_cents, fixed_price_cents, clients(name))")
      .not("stopped_at", "is", null)
      .gte("started_at", period.from.toISOString())
      .lt("started_at", period.to.toISOString()),
    supabase
      .from("expenses")
      .select("job_id, amount_cents, jobs(name, billing_type, hourly_rate_cents, fixed_price_cents, clients(name))")
      .gte("spent_on", period.fromKey)
      .lte("spent_on", period.toKey),
  ]);

  type Acc = { name: string; clientName: string | null; billing: BillingFields; seconds: number; expensesCents: number };
  const byJob = new Map<string, Acc>();
  const bucket = (jobId: string, job: NonNullable<NonNullable<typeof entries>[number]["jobs"]>) => {
    let a = byJob.get(jobId);
    if (!a) {
      a = { name: job.name, clientName: job.clients?.name ?? null, billing: job, seconds: 0, expensesCents: 0 };
      byJob.set(jobId, a);
    }
    return a;
  };

  for (const e of entries ?? []) if (e.jobs) bucket(e.job_id, e.jobs).seconds += e.duration_seconds ?? 0;

  let unassignedCents = 0;
  for (const x of expenses ?? []) {
    if (x.job_id && x.jobs) bucket(x.job_id, x.jobs).expensesCents += x.amount_cents;
    else unassignedCents += x.amount_cents;
  }

  const rows: JobRow[] = Array.from(byJob.entries())
    .map(([jobId, a]) => {
      const revenue = revenueCents(a.billing, a.seconds);
      const profit = revenue - a.expensesCents;
      return {
        jobId,
        name: a.name,
        clientName: a.clientName,
        seconds: a.seconds,
        revenueCents: revenue,
        expensesCents: a.expensesCents,
        profitCents: profit,
        rateCents: effectiveRateCents(profit, a.seconds),
      };
    })
    .sort((p, q) => q.seconds - p.seconds || q.revenueCents - p.revenueCents);

  if (unassignedCents > 0) {
    rows.push({
      jobId: null,
      name: "No job",
      clientName: null,
      seconds: 0,
      revenueCents: 0,
      expensesCents: unassignedCents,
      profitCents: -unassignedCents,
      rateCents: null,
    });
  }

  const seconds = rows.reduce((s, r) => s + r.seconds, 0);
  const revenue = rows.reduce((s, r) => s + r.revenueCents, 0);
  const spent = rows.reduce((s, r) => s + r.expensesCents, 0);
  const profit = revenue - spent;

  return { seconds, revenueCents: revenue, expensesCents: spent, profitCents: profit, rateCents: effectiveRateCents(profit, seconds), rows };
}
