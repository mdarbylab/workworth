import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getJobTotals, summarize } from "@/lib/jobs";
import { JobSummaryBlock } from "@/components/job-summary";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const { show } = await searchParams;
  const showArchived = show === "archived";

  const supabase = await createClient();
  const [{ data: jobs }, totals] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, name, billing_type, hourly_rate_cents, fixed_price_cents, status, clients(name)")
      .eq("status", showArchived ? "archived" : "active")
      .order("created_at", { ascending: false }),
    getJobTotals(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{showArchived ? "Archived jobs" : "Jobs"}</h1>
        <Link href="/jobs/new" className="btn-primary w-auto px-4 py-2 text-sm">
          + New Job
        </Link>
      </div>

      {jobs?.length ? (
        <ul className="space-y-3">
          {jobs.map((job) => {
            const t = totals.get(job.id) ?? { seconds: 0, expensesCents: 0 };
            const summary = summarize(job, t.seconds, t.expensesCents);
            return (
              <li key={job.id}>
                <Link href={`/jobs/${job.id}`} className="card block space-y-3 hover:border-emerald-300">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{job.name}</p>
                      <p className="truncate text-sm text-stone-500">
                        {job.clients?.name ?? "No client"}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      {job.billing_type === "hourly" ? "Hourly" : "Fixed price"}
                    </span>
                  </div>
                  <JobSummaryBlock summary={summary} compact />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card space-y-3 text-center">
          <p className="text-stone-600">
            {showArchived ? "No archived jobs." : "No active jobs yet."}
          </p>
          {!showArchived && (
            <Link href="/jobs/new" className="btn-primary w-auto px-4 py-2 text-sm">
              Create your first job
            </Link>
          )}
        </div>
      )}

      <p className="text-center text-sm">
        {showArchived ? (
          <Link href="/jobs" className="text-emerald-800 hover:underline">← Active jobs</Link>
        ) : (
          <Link href="/jobs?show=archived" className="text-stone-500 hover:underline">Show archived jobs</Link>
        )}
      </p>
    </div>
  );
}
