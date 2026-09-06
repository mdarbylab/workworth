import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { getJobTotals, summarize } from "@/lib/jobs";
import { formatCents, formatDuration } from "@/lib/calc";
import { formatDate, formatTime } from "@/lib/dates";
import { getPeople, personLabel } from "@/lib/people";
import { JobSummaryBlock } from "@/components/job-summary";
import { archiveJob, unarchiveJob } from "../actions";
import { startTimerFromJob } from "../../time/actions";

export const metadata: Metadata = { title: "Job" };

export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx?.organization || !ctx.membership) redirect("/onboarding");
  const tz = ctx.organization.timezone;

  const supabase = await createClient();
  const [{ data: job }, totals, { data: entries }, { data: expenses }, people] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, clients(name)")
      .eq("id", id)
      .maybeSingle(),
    getJobTotals(),
    supabase
      .from("time_entries")
      .select("id, user_id, started_at, stopped_at, duration_seconds, notes")
      .eq("job_id", id)
      .order("started_at", { ascending: false })
      .limit(100),
    supabase
      .from("expenses")
      .select("id, spent_on, amount_cents, category, description")
      .eq("job_id", id)
      .order("spent_on", { ascending: false })
      .limit(100),
    getPeople(ctx.organization.id, ctx.user.id),
  ]);
  if (!job) notFound();

  const t = totals.get(job.id) ?? { seconds: 0, expensesCents: 0 };
  const summary = summarize(job, t.seconds, t.expensesCents);
  const isOwner = ctx.membership.role === "owner";
  const isArchived = job.status === "archived";
  const showPerson = people.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href="/jobs" className="text-sm text-stone-500 hover:underline">← Jobs</Link>
          <h1 className="truncate text-2xl font-semibold">{job.name}</h1>
          <p className="text-sm text-stone-500">
            {job.clients?.name ?? "No client"} ·{" "}
            {job.billing_type === "hourly"
              ? `Hourly${job.hourly_rate_cents !== null ? ` at ${formatCents(job.hourly_rate_cents)}/hr` : ""}`
              : `Fixed price${job.fixed_price_cents !== null ? ` ${formatCents(job.fixed_price_cents)}` : ""}`}
            {job.estimated_minutes !== null && ` · est. ${formatDuration(job.estimated_minutes * 60)}`}
          </p>
        </div>
        {isArchived ? (
          <span className="shrink-0 rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-700">Archived</span>
        ) : (
          <form action={startTimerFromJob}>
            <input type="hidden" name="job_id" value={job.id} />
            <button type="submit" className="btn-primary w-auto px-4 py-2 text-sm">Start timer</button>
          </form>
        )}
      </div>

      <section className="card">
        <JobSummaryBlock summary={summary} />
      </section>

      {job.notes && (
        <section className="card">
          <h2 className="mb-1 text-sm font-semibold text-stone-600">Notes</h2>
          <p className="whitespace-pre-wrap text-sm">{job.notes}</p>
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Time entries</h2>
          {!isArchived && (
            <Link href={`/time/new?job=${job.id}`} className="text-sm text-emerald-800 hover:underline">
              + Add time
            </Link>
          )}
        </div>
        {entries?.length ? (
          <ul className="card divide-y divide-stone-100 p-0">
            {entries.map((e) => {
              const start = new Date(e.started_at);
              const running = e.stopped_at === null;
              return (
                <li key={e.id}>
                  <Link href={`/time/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {formatDate(start, tz)} · {formatTime(start, tz)}
                        {e.stopped_at ? ` – ${formatTime(new Date(e.stopped_at), tz)}` : ""}
                      </p>
                      <p className="truncate text-xs text-stone-500">
                        {showPerson && `${personLabel(people, e.user_id)}${e.notes ? " · " : ""}`}
                        {e.notes}
                      </p>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${running ? "text-emerald-700" : ""}`}>
                      {running ? "Running" : formatDuration(e.duration_seconds ?? 0)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="card text-sm text-stone-500">No time tracked on this job yet.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Expenses</h2>
        {expenses?.length ? (
          <ul className="card divide-y divide-stone-100 p-0">
            {expenses.map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium capitalize">{x.category}</p>
                  <p className="truncate text-xs text-stone-500">{x.spent_on}{x.description ? ` · ${x.description}` : ""}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCents(x.amount_cents)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card text-sm text-stone-500">No expenses on this job yet.</p>
        )}
      </section>

      {isOwner && (
        <form action={isArchived ? unarchiveJob : archiveJob} className="pt-2">
          <input type="hidden" name="job_id" value={job.id} />
          <button type="submit" className="btn-secondary">
            {isArchived ? "Restore job" : "Archive job"}
          </button>
          {!isArchived && (
            <p className="mt-2 text-center text-xs text-stone-500">
              Archived jobs are hidden from pickers but still count in reports.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
