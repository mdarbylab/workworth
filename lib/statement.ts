import { createClient } from "@/lib/supabase/server";
import { revenueCents } from "@/lib/calc";
import { dateKey } from "@/lib/dates";
import type { Period } from "@/lib/periods";
import type { Tables } from "@/lib/supabase/types";

export type StatementLine = {
  id: string;
  dayKey: string;
  seconds: number;
  notes: string | null;
};

export type StatementJob = {
  id: string;
  name: string;
  billingType: "hourly" | "fixed";
  hourlyRateCents: number | null;
  fixedPriceCents: number | null;
  lines: StatementLine[];
  seconds: number;
  /** Null when the job has no price set, so the document can say so plainly. */
  amountCents: number | null;
};

export type Statement = {
  organization: Tables<"organizations">;
  client: Pick<Tables<"clients">, "id" | "name" | "email" | "phone">;
  period: Period;
  jobs: StatementJob[];
  totalSeconds: number;
  /** Sum of priced jobs only. Null when nothing on the report has a price. */
  totalAmountCents: number | null;
  /** True when at least one job is missing the price it would need. */
  hasUnpricedWork: boolean;
};

/**
 * A client-facing record of work done in a period (SPEC 5.8).
 *
 * Deliberately excludes expenses, profit and effective rate: those are the
 * business's own numbers and never belong on a document sent to a customer.
 * Only stopped entries count, so a running timer never lands on paperwork.
 */
export async function buildStatement(clientId: string, period: Period): Promise<Statement | null> {
  const supabase = await createClient();

  const [{ data: org }, { data: client }] = await Promise.all([
    supabase.from("organizations").select("*").limit(1).maybeSingle(),
    supabase.from("clients").select("id, name, email, phone").eq("id", clientId).maybeSingle(),
  ]);
  if (!org || !client) return null;

  const { data: entries } = await supabase
    .from("time_entries")
    .select("id, job_id, started_at, duration_seconds, notes, jobs!inner(id, name, billing_type, hourly_rate_cents, fixed_price_cents, client_id)")
    .eq("jobs.client_id", clientId)
    .not("stopped_at", "is", null)
    .gte("started_at", period.from.toISOString())
    .lt("started_at", period.to.toISOString())
    .order("started_at", { ascending: true });

  const byJob = new Map<string, StatementJob>();
  for (const e of entries ?? []) {
    const job = e.jobs;
    if (!job) continue;
    let acc = byJob.get(job.id);
    if (!acc) {
      acc = {
        id: job.id,
        name: job.name,
        billingType: job.billing_type,
        hourlyRateCents: job.hourly_rate_cents,
        fixedPriceCents: job.fixed_price_cents,
        lines: [],
        seconds: 0,
        amountCents: null,
      };
      byJob.set(job.id, acc);
    }
    const seconds = e.duration_seconds ?? 0;
    acc.seconds += seconds;
    acc.lines.push({
      id: e.id,
      dayKey: dateKey(new Date(e.started_at), org.timezone),
      seconds,
      notes: e.notes,
    });
  }

  const jobs = Array.from(byJob.values()).map((j) => {
    const priced =
      j.billingType === "hourly" ? j.hourlyRateCents !== null : j.fixedPriceCents !== null;
    return {
      ...j,
      amountCents: priced
        ? revenueCents(
            {
              billing_type: j.billingType,
              hourly_rate_cents: j.hourlyRateCents,
              fixed_price_cents: j.fixedPriceCents,
            },
            j.seconds,
          )
        : null,
    };
  });
  jobs.sort((a, b) => a.name.localeCompare(b.name));

  const priced = jobs.filter((j) => j.amountCents !== null);
  return {
    organization: org,
    client,
    period,
    jobs,
    totalSeconds: jobs.reduce((s, j) => s + j.seconds, 0),
    totalAmountCents: priced.length ? priced.reduce((s, j) => s + (j.amountCents ?? 0), 0) : null,
    hasUnpricedWork: jobs.some((j) => j.amountCents === null),
  };
}
