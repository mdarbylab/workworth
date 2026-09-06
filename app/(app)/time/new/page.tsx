import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { dateKey, timeKey } from "@/lib/dates";
import { EntryForm } from "../entry-form";
import { createTimeEntry } from "../actions";

export const metadata: Metadata = { title: "Add time" };

export default async function NewTimeEntryPage({ searchParams }: PageProps<"/time/new">) {
  const { job } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  const tz = ctx.organization.timezone;

  const supabase = await createClient();
  const [{ data: jobs }, { data: last }] = await Promise.all([
    supabase.from("jobs").select("id, name, status").eq("status", "active").order("name"),
    supabase
      .from("time_entries")
      .select("job_id")
      .eq("user_id", ctx.user.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const now = new Date();
  // Default to a one-hour block ending now, rounded to the quarter hour.
  const rounded = new Date(Math.floor(now.getTime() / (15 * 60 * 1000)) * 15 * 60 * 1000);
  const start = new Date(rounded.getTime() - 3600 * 1000);
  const requestedJob = typeof job === "string" ? job : "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Add time</h1>
      <div className="card">
        <EntryForm
          jobs={jobs ?? []}
          action={createTimeEntry}
          submitLabel="Save entry"
          cancelHref="/time"
          defaults={{
            jobId: requestedJob || last?.job_id || jobs?.[0]?.id || "",
            date: dateKey(start, tz),
            startTime: timeKey(start, tz),
            stopTime: timeKey(rounded, tz),
            mode: "stop",
            durationHours: "1",
            durationMinutes: "0",
            notes: "",
          }}
        />
      </div>
    </div>
  );
}
