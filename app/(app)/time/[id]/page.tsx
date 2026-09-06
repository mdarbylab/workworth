import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { dateKey, formatDateTime, formatTime, timeKey } from "@/lib/dates";
import { formatDuration } from "@/lib/calc";
import type { Json } from "@/lib/supabase/types";
import { EntryForm } from "../entry-form";
import { updateTimeEntry } from "../actions";
import { DeleteEntryButton } from "./delete-button";

export const metadata: Metadata = { title: "Edit time" };

type Snapshot = { job_id: string; started_at: string; stopped_at: string | null; notes: string | null };

function asSnapshot(json: Json | null): Snapshot | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, Json | undefined>;
  if (typeof o.job_id !== "string" || typeof o.started_at !== "string") return null;
  return {
    job_id: o.job_id,
    started_at: o.started_at,
    stopped_at: typeof o.stopped_at === "string" ? o.stopped_at : null,
    notes: typeof o.notes === "string" ? o.notes : null,
  };
}

export default async function EditTimeEntryPage({ params }: PageProps<"/time/[id]">) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  const tz = ctx.organization.timezone;

  const supabase = await createClient();
  const [{ data: entry }, { data: jobs }, { data: events }] = await Promise.all([
    supabase.from("time_entries").select("*").eq("id", id).maybeSingle(),
    supabase.from("jobs").select("id, name, status").order("name"),
    supabase
      .from("audit_events")
      .select("id, action, before, after, created_at")
      .eq("table_name", "time_entries")
      .eq("record_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!entry) notFound();

  const jobName = (jobId: string) => jobs?.find((j) => j.id === jobId)?.name ?? "Unknown job";
  const pickable = (jobs ?? []).filter((j) => j.status === "active" || j.id === entry.job_id);

  // §8.4: original values come from the first update's "before" snapshot.
  const updates = (events ?? []).filter((e) => e.action === "update");
  // Timer stops are updates too (stopped_at null → set); only count edits that changed a stopped entry.
  const edits = updates.filter((e) => {
    const before = asSnapshot(e.before);
    return before !== null && before.stopped_at !== null;
  });
  const original = edits.length ? asSnapshot(edits[0].before) : null;

  const describe = (s: Snapshot) => {
    const start = new Date(s.started_at);
    const stop = s.stopped_at ? new Date(s.stopped_at) : null;
    const secs = stop ? (stop.getTime() - start.getTime()) / 1000 : 0;
    return `${jobName(s.job_id)} · ${formatDateTime(start, tz)}${stop ? ` – ${formatTime(stop, tz)} (${formatDuration(secs)})` : " (running)"}${s.notes ? ` · “${s.notes}”` : ""}`;
  };

  if (entry.stopped_at === null) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Running timer</h1>
        <div className="card space-y-3">
          <p className="text-sm">
            {jobName(entry.job_id)} — started {formatDateTime(new Date(entry.started_at), tz)}.
          </p>
          <p className="text-sm text-stone-500">Stop the timer from Today, then you can edit this entry.</p>
          <Link href="/today" className="btn-primary">Go to Today</Link>
        </div>
      </div>
    );
  }

  const start = new Date(entry.started_at);
  const stop = new Date(entry.stopped_at);
  const secs = entry.duration_seconds ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit time</h1>
        {edits.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Edited</span>
        )}
      </div>

      <div className="card">
        <EntryForm
          jobs={pickable}
          action={updateTimeEntry}
          entryId={entry.id}
          submitLabel="Save changes"
          cancelHref="/time"
          defaults={{
            jobId: entry.job_id,
            date: dateKey(start, tz),
            startTime: timeKey(start, tz),
            stopTime: timeKey(stop, tz),
            mode: "stop",
            durationHours: String(Math.floor(secs / 3600)),
            durationMinutes: String(Math.floor((secs % 3600) / 60)),
            notes: entry.notes ?? "",
          }}
        />
      </div>

      {original && (
        <section className="card space-y-3">
          <h2 className="font-semibold">History</h2>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Original</p>
            <p className="text-sm">{describe(original)}</p>
          </div>
          <ol className="space-y-2 border-t border-stone-100 pt-3">
            {edits.map((e, i) => {
              const after = asSnapshot(e.after);
              return (
                <li key={e.id} className="text-sm">
                  <p className="text-xs text-stone-500">
                    Edit {i + 1} · {formatDateTime(new Date(e.created_at), tz)}
                  </p>
                  {after && <p>{describe(after)}</p>}
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-stone-400">Nothing is overwritten — every change is kept.</p>
        </section>
      )}

      <DeleteEntryButton entryId={entry.id} />
    </div>
  );
}
