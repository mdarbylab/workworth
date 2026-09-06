"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { parseDollars } from "@/lib/calc";

export type JobFormState = { error?: string };

async function requireMembership() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership) redirect("/onboarding");
  return { ...ctx, membership: ctx.membership };
}

export async function createJob(_prev: JobFormState, formData: FormData): Promise<JobFormState> {
  const ctx = await requireMembership();
  const orgId = ctx.membership.organization_id;
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the job a name." };

  const billingType = formData.get("billing_type") === "fixed" ? "fixed" : "hourly";
  const cents = parseDollars(String(formData.get("amount") ?? ""));
  if (cents !== null && Number.isNaN(cents)) return { error: "Enter a valid dollar amount, or leave it blank." };

  const estHoursRaw = String(formData.get("estimated_hours") ?? "").trim();
  let estimatedMinutes: number | null = null;
  if (estHoursRaw !== "") {
    const hours = Number(estHoursRaw);
    if (!Number.isFinite(hours) || hours < 0) return { error: "Estimated hours must be a positive number." };
    estimatedMinutes = Math.round(hours * 60);
  }

  const notes = String(formData.get("notes") ?? "").trim() || null;

  // Client: type-ahead by name; create if new (SPEC §5.2).
  let clientId: string | null = null;
  const clientName = String(formData.get("client_name") ?? "").trim();
  if (clientName) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("organization_id", orgId)
      .ilike("name", clientName)
      .limit(1)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
    } else {
      const { data: created, error } = await supabase
        .from("clients")
        .insert({ organization_id: orgId, name: clientName })
        .select("id")
        .single();
      if (error) return { error: "Couldn't save the client. Please try again." };
      clientId = created.id;
    }
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      organization_id: orgId,
      name,
      client_id: clientId,
      billing_type: billingType,
      hourly_rate_cents: billingType === "hourly" ? cents : null,
      fixed_price_cents: billingType === "fixed" ? cents : null,
      estimated_minutes: estimatedMinutes,
      notes,
    })
    .select("id")
    .single();
  if (error) return { error: "Couldn't save the job. Please try again." };

  revalidatePath("/", "layout");
  redirect(`/jobs/${job.id}`);
}

export async function archiveJob(formData: FormData) {
  const ctx = await requireMembership();
  if (ctx.membership.role !== "owner") return;
  const jobId = String(formData.get("job_id") ?? "");
  if (!jobId) return;

  const supabase = await createClient();
  await supabase
    .from("jobs")
    .update({ status: "archived" })
    .eq("id", jobId)
    .eq("organization_id", ctx.membership.organization_id);

  revalidatePath("/", "layout");
  redirect("/jobs");
}

export async function unarchiveJob(formData: FormData) {
  const ctx = await requireMembership();
  if (ctx.membership.role !== "owner") return;
  const jobId = String(formData.get("job_id") ?? "");
  if (!jobId) return;

  const supabase = await createClient();
  await supabase
    .from("jobs")
    .update({ status: "active" })
    .eq("id", jobId)
    .eq("organization_id", ctx.membership.organization_id);

  revalidatePath("/", "layout");
  redirect(`/jobs/${jobId}`);
}
