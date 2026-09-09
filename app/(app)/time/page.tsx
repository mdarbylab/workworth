import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { dateKey, formatDayHeading, formatTime } from "@/lib/dates";
import { formatDuration } from "@/lib/calc";
import { getPeople, personLabel } from "@/lib/people";
import { TimeFilters } from "./filters";

export const metadata: Metadata = { title: "Time" };

export default async function TimePage({ searchParams }: PageProps<"/time">) {
  const { job, person } = await searchParams;
  const jobFilter = typeof job === "string" ? job : "";
  const personFilter = typeof person === "string" ? person : "";

  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  const tz = ctx.organization.timezone;

  const supabase = await createClient();
  let query = supabase
    .from("time_entries")
    .select("id, job_id, user_id, started_at, stopped_at, duration_seconds, notes, jobs(name)")
    .order("started_at", { ascending: false })
    .limit(300);
  if (jobFilter) query = query.eq("job_id", jobFilter);
  if (personFilter) query = query.eq("user_id", personFilter);

  const [{ data: entries }, { data: jobs }, people] = await Promise.all([
    query,
    supabase.from("jobs").select("id, name").order("name"),
    getPeople(ctx.organization.id, ctx.user.id),
  ]);

  // §8.4: mark entries that have an update in history (ignoring the timer's own stop).
  const ids = (entries ?? []).map((e) => e.id);
  const edited = new Set<string>();
  if (ids.length) {
    const { data: events } = await supabase
      .from("audit_events")
      .select("record_id, before")
      .eq("table_name", "time_entries")
      .eq("action", "update")
      .in("record_id", ids);
    for (const ev of events ?? []) {
      const before = ev.before as { stopped_at?: string | null } | null;
      if (before && before.stopped_at !== null) edited.add(ev.record_id);
    }
  }

  const groups = new Map<string, NonNullable<typeof entries>>();
  for (const e of entries ?? []) {
    const key = dateKey(new Date(e.started_at), tz);
    const list = groups.get(key);
    if (list) list.push(e);
    else groups.set(key, [e]);
  }
  const showPerson = people.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Time</h1>
        <Link href="/time/new" className="btn-primary w-auto px-4 py-2 text-sm">+ Add time</Link>
      </div>

      <Suspense>
        <TimeFilters jobs={jobs ?? []} people={people} />
      </Suspense>

      {groups.size === 0 ? (
        <div className="card space-y-2 text-center">
          <p className="text-stone-600">No time entries yet.</p>
          <p className="text-sm text-stone-500">
            Start the timer on <Link href="/today" className="text-emerald-800 hover:underline">Today</Link> or add time by hand.
          </p>
        </div>
      ) : (
        Array.from(groups.entries()).map(([key, list]) => {
          const daySeconds = list.reduce((s, e) => s + (e.duration_seconds ?? 0), 0);
          return (
            <section key={key} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{formatDayHeading(key, tz)}</h2>
                <span className="text-sm tabular-nums text-stone-500">{formatDuration(daySeconds)}</span>
              </div>
              <ul className="card divide-y divide-stone-100 p-0">
                {list.map((e) => {
                  const start = new Date(e.started_at);
                  const running = e.stopped_at === null;
                  return (
                    <li key={e.id}>
                      <Link href={`/time/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            <span className="truncate">{e.jobs?.name ?? "Unknown job"}</span>
                            {edited.has(e.id) && (
                              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">Edited</span>
                            )}
                          </p>
                          <p className="truncate text-xs text-stone-500">
                            {formatTime(start, tz)}
                            {e.stopped_at ? ` – ${formatTime(new Date(e.stopped_at), tz)}` : ""}
                            {showPerson && ` · ${personLabel(people, e.user_id)}`}
                            {e.notes && ` · ${e.notes}`}
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
            </section>
          );
        })
      )}
    </div>
  );
}
