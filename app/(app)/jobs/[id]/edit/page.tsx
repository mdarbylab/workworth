import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { JobForm } from "../../job-form";
import { updateJob } from "../../actions";

export const metadata: Metadata = { title: "Edit job" };

const centsToInput = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2));

export default async function EditJobPage({ params }: PageProps<"/jobs/[id]/edit">) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: job }, { data: clients }] = await Promise.all([
    supabase.from("jobs").select("*, clients(name)").eq("id", id).maybeSingle(),
    supabase.from("clients").select("name").order("name"),
  ]);
  if (!job) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit job</h1>
      <div className="card">
        <JobForm
          clientNames={(clients ?? []).map((c) => c.name)}
          action={updateJob}
          jobId={job.id}
          submitLabel="Save changes"
          cancelHref={`/jobs/${job.id}`}
          defaults={{
            name: job.name,
            clientName: job.clients?.name ?? "",
            billingType: job.billing_type,
            amount: centsToInput(job.billing_type === "hourly" ? job.hourly_rate_cents : job.fixed_price_cents),
            estimatedHours: job.estimated_minutes === null ? "" : String(job.estimated_minutes / 60),
            notes: job.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
