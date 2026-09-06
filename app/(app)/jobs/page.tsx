import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Jobs" };

export default async function JobsPage() {
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, name, billing_type")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Jobs</h1>
      {jobs?.length ? (
        <ul className="space-y-2">
          {jobs.map((job) => (
            <li key={job.id} className="card flex items-center justify-between">
              <span className="font-medium">{job.name}</span>
              <span className="text-xs uppercase tracking-wide text-stone-500">
                {job.billing_type === "hourly" ? "Hourly" : "Fixed price"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card text-sm text-stone-500">No active jobs yet.</p>
      )}
    </div>
  );
}
