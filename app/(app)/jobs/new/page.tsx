import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "../job-form";
import { createJob } from "../actions";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("name").order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">New job</h1>
      <div className="card">
        <JobForm
          clientNames={(clients ?? []).map((c) => c.name)}
          action={createJob}
          submitLabel="Create job"
          cancelHref="/jobs"
        />
      </div>
    </div>
  );
}
