"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { parseDollars } from "@/lib/calc";
import type { TablesInsert } from "@/lib/supabase/types";
import { track } from "@/lib/analytics/server";

export type JobFormState = { error?: string };

async function requireMembership() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership) redirect("/onboarding");
  return { ...ctx, membership: ctx.membership };
}

type JobFields = Omit<TablesInsert<"jobs">, "organization_id" | "client_id">;

function parseJobForm(formData: FormData): JobFields | JobFormState {
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

  return {
    name,
    billing_type: billingType,
    hourly_rate_cents: billingType === "hourly" ? cents : null,
    fixed_price_cents: billingType === "fixed" ? cents : null,
    estimated_minutes: estimatedMinutes,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

/** Client type-ahead: reuse by name (case-insensitive) or create (SPEC §5.2). */
async function resolveClientId(orgId: string, clientName: string): Promise<string | null | { error: string }> {
  if (!clientName) return null;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", orgId)
    .ilike("name", clientName)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("clients")
    .insert({ organization_id: orgId, name: clientName })
    .select("id")
    .single();
  if (error) return { error: "Couldn't save the client. Please try again." };
  return created.id;
}

export async function createJob(_prev: JobFormState, formData: FormData): Promise<JobFormState> {
  const ctx = await requireMembership();
  const orgId = ctx.membership.organization_id;

  const fields = parseJobForm(formData);
  if (!("name" in fields)) return fields;

  const clientId = await resolveClientId(orgId, String(formData.get("client_name") ?? "").trim());
  if (clientId && typeof clientId === "object") return clientId;

  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({ ...fields, organization_id: orgId, client_id: clientId })
    .select("id")
    .single();
  if (error) return { error: "Couldn't save the job. Please try again." };

  track("job_created", { userId: ctx.user.id, organizationId: orgId }, {
    billing_type: fields.billing_type,
    has_client: clientId !== null,
  });
  revalidatePath("/", "layout");
  redirect(`/jobs/${job.id}`);
}

export async function updateJob(_prev: JobFormState, formData: FormData): Promise<JobFormState> {
  const ctx = await requireMembership();
  const orgId = ctx.membership.organization_id;
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing job." };

  const fields = parseJobForm(formData);
  if (!("name" in fields)) return fields;

  const clientId = await resolveClientId(orgId, String(formData.get("client_name") ?? "").trim());
  if (clientId && typeof clientId === "object") return clientId;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update({ ...fields, client_id: clientId })
    .eq("id", id)
    .eq("organization_id", orgId)
    .select("id");
  if (error || !data?.length) return { error: "Couldn't update the job." };

  revalidatePath("/", "layout");
  redirect(`/jobs/${id}`);
}

async function setJobStatus(formData: FormData, status: "active" | "archived") {
  const ctx = await requireMembership();
  if (ctx.membership.role !== "owner") return null;
  const jobId = String(formData.get("job_id") ?? "");
  if (!jobId) return null;

  const supabase = await createClient();
  await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .eq("organization_id", ctx.membership.organization_id);

  revalidatePath("/", "layout");
  return jobId;
}

export async function archiveJob(formData: FormData) {
  const jobId = await setJobStatus(formData, "archived");
  if (jobId) redirect("/jobs");
}

export async function unarchiveJob(formData: FormData) {
  const jobId = await setJobStatus(formData, "active");
  if (jobId) redirect(`/jobs/${jobId}`);
}
