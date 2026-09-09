import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { dateKey, formatTime, startOfDay } from "@/lib/dates";
import { formatCents, formatDuration, revenueCents } from "@/lib/calc";
import { Timer } from "./timer";

export const metadata: Metadata = { title: "Today" };

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  const tz = ctx.organization.timezone;
  const me = ctx.user.id;

  const now = new Date();
  const dayStart = startOfDay(now, tz);
  const dayEnd = startOfDay(new Date(dayStart.getTime() + 30 * 3600 * 1000), tz);
  const todayKey = dateKey(now, tz);
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(now)) % 24;
  const dateLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz }).format(now);

  const supabase = await createClient();
  const [{ data: jobs }, { data: running }, { data: last }, { data: entries }, { data: expenses }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, name, billing_type, hourly_rate_cents, fixed_price_cents")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("time_entries")
      .select("id, job_id, started_at, jobs(name)")
      .eq("user_id", me)
      .is("stopped_at", null)
      .maybeSingle(),
    supabase
      .from("time_entries")
      .select("job_id")
      .eq("user_id", me)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("time_entries")
      .select("id, job_id, started_at, stopped_at, duration_seconds, jobs(name, billing_type, hourly_rate_cents, fixed_price_cents)")
      .eq("user_id", me)
      .not("stopped_at", "is", null)
      .gte("started_at", dayStart.toISOString())
      .lt("started_at", dayEnd.toISOString())
      .order("started_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("amount_cents")
      .eq("user_id", me)
      .eq("spent_on", todayKey),
  ]);

  const activeJobs = jobs ?? [];
  const defaultJobId =
    (last?.job_id && activeJobs.some((j) => j.id === last.job_id) ? last.job_id : activeJobs[0]?.id) ?? "";

  // Group today's entries by job (SPEC §5.1). Earnings are estimated from hourly
  // rates only; fixed-price revenue isn't attributable to a single day (§8.2).
  const byJob = new Map<string, { name: string; seconds: number; earningsCents: number; hourly: boolean }>();
  for (const e of entries ?? []) {
    const job = e.jobs;
    const secs = e.duration_seconds ?? 0;
    let g = byJob.get(e.job_id);
    if (!g) {
      g = { name: job?.name ?? "Unknown job", seconds: 0, earningsCents: 0, hourly: job?.billing_type === "hourly" };
      byJob.set(e.job_id, g);
    }
    g.seconds += secs;
    if (job && job.billing_type === "hourly") g.earningsCents += revenueCents(job, secs);
  }
  const totalSeconds = Array.from(byJob.values()).reduce((s, g) => s + g.seconds, 0);
  const earnings = Array.from(byJob.values()).reduce((s, g) => s + g.earningsCents, 0);
  const spent = (expenses ?? []).reduce((s, x) => s + x.amount_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{greeting(hour)}</h1>
        <p className="text-stone-500">{dateLabel}</p>
      </div>

      <Timer
        jobs={activeJobs.map((j) => ({ id: j.id, name: j.name }))}
        running={
          running
            ? { id: running.id, jobId: running.job_id, jobName: running.jobs?.name ?? "Job", startedAt: running.started_at }
            : null
        }
        defaultJobId={defaultJobId}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Today</h2>
          <Link href="/time/new" className="text-sm text-emerald-800 hover:underline">+ Add time</Link>
        </div>

        {byJob.size === 0 ? (
          <p className="card text-sm text-stone-500">Nothing tracked yet today.</p>
        ) : (
          <ul className="card divide-y divide-stone-100 p-0">
            {Array.from(byJob.entries()).map(([jobId, g]) => (
              <li key={jobId} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/jobs/${jobId}`} className="truncate font-medium hover:underline">{g.name}</Link>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{formatDuration(g.seconds)}</span>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {(entries ?? [])
                    .filter((e) => e.job_id === jobId)
                    .map((e) => (
                      <li key={e.id} className="flex items-center justify-between text-xs text-stone-500">
                        <Link href={`/time/${e.id}`} className="hover:underline">
                          {formatTime(new Date(e.started_at), tz)} – {formatTime(new Date(e.stopped_at!), tz)}
                        </Link>
                        <span className="tabular-nums">{formatDuration(e.duration_seconds ?? 0)}</span>
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        )}

        <dl className="card grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Total time" value={formatDuration(totalSeconds)} />
          <Stat label="Est. earnings" value={formatCents(earnings)} />
          <Stat label="Expenses" value={formatCents(spent)} />
          <Stat
            label="Est. profit"
            value={formatCents(earnings - spent)}
            className={earnings - spent < 0 ? "text-red-700" : "text-emerald-800"}
          />
        </dl>
        <p className="text-xs text-stone-400">Earnings count hourly jobs only. Fixed-price jobs show on their job page.</p>
      </section>
    </div>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className={`text-lg font-semibold tabular-nums ${className}`}>{value}</dd>
    </div>
  );
}
