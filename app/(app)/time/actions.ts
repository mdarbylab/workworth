"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { parseDateTime } from "@/lib/dates";
import { MAX_ENTRY_SECONDS, formatDuration } from "@/lib/calc";

export type TimerState = { error?: string };
export type EntryFormState = { error?: string; warning?: string };

async function requireMembership() {
  const ctx = await getSessionContext();
  if (!ctx?.organization || !ctx.membership) redirect("/onboarding");
  return { ...ctx, organization: ctx.organization, membership: ctx.membership };
}

// ---------- Timer ----------

async function insertRunningEntry(jobId: string): Promise<string | null> {
  const ctx = await requireMembership();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("status", "active")
    .maybeSingle();
  if (!job) return "Pick a job to track time against.";

  const { error } = await supabase.from("time_entries").insert({
    organization_id: ctx.membership.organization_id,
    job_id: job.id,
    user_id: ctx.user.id,
    started_at: new Date().toISOString(),
    source: "timer",
  });
  if (error) {
    // 23505: partial unique index — one running timer per user (SPEC §7).
    if (error.code === "23505") return "You already have a timer running.";
    return "Couldn't start the timer. Please try again.";
  }
  revalidatePath("/", "layout");
  return null;
}

/** Today screen START button. */
export async function startTimer(_prev: TimerState, formData: FormData): Promise<TimerState> {
  const jobId = String(formData.get("job_id") ?? "");
  if (!jobId) return { error: "Pick a job first." };
  const error = await insertRunningEntry(jobId);
  return error ? { error } : {};
}

/** "Start timer" from a job page: starts and jumps to Today. */
export async function startTimerFromJob(formData: FormData) {
  const jobId = String(formData.get("job_id") ?? "");
  if (jobId) await insertRunningEntry(jobId);
  redirect("/today");
}

/** Today screen STOP button. */
export async function stopTimer(): Promise<TimerState> {
  const ctx = await requireMembership();
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_entries")
    .update({ stopped_at: new Date().toISOString() })
    .eq("user_id", ctx.user.id)
    .is("stopped_at", null);
  if (error) return { error: "Couldn't stop the timer. Please try again." };
  revalidatePath("/", "layout");
  return {};
}

// ---------- Manual entries ----------

type ParsedEntry = {
  jobId: string;
  startedAt: Date;
  stoppedAt: Date;
  notes: string | null;
};

function parseEntryForm(formData: FormData, tz: string): ParsedEntry | EntryFormState {
  const jobId = String(formData.get("job_id") ?? "");
  if (!jobId) return { error: "Pick a job." };

  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("start_time") ?? "");
  const startedAt = parseDateTime(date, startTime, tz);
  if (!startedAt) return { error: "Enter a valid date and start time." };

  let stoppedAt: Date;
  if (formData.get("mode") === "duration") {
    const hours = Number(formData.get("duration_hours") || 0);
    const minutes = Number(formData.get("duration_minutes") || 0);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || minutes < 0 || minutes > 59) {
      return { error: "Enter a duration in whole hours and minutes." };
    }
    const seconds = hours * 3600 + minutes * 60;
    if (seconds <= 0) return { error: "Duration must be more than zero." };
    stoppedAt = new Date(startedAt.getTime() + seconds * 1000);
  } else {
    const stopTime = String(formData.get("stop_time") ?? "");
    const parsed = parseDateTime(date, stopTime, tz);
    if (!parsed) return { error: "Enter a valid stop time." };
    stoppedAt = parsed;
  }

  // §8.1: an entry cannot stop before it starts.
  if (stoppedAt.getTime() <= startedAt.getTime()) {
    return { error: "Stop time must be after the start time. For work past midnight, enter a duration instead." };
  }

  // §8.1: max single entry 24h — longer warns but is allowed.
  const seconds = (stoppedAt.getTime() - startedAt.getTime()) / 1000;
  if (seconds > MAX_ENTRY_SECONDS && formData.get("confirm_long") !== "1") {
    return {
      warning: `That's ${formatDuration(seconds)} in a single entry — longer than 24 hours. Save it anyway?`,
    };
  }

  const notes = String(formData.get("notes") ?? "").trim() || null;
  return { jobId, startedAt, stoppedAt, notes };
}

export async function createTimeEntry(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const ctx = await requireMembership();
  const parsed = parseEntryForm(formData, ctx.organization.timezone);
  if (!("jobId" in parsed)) return parsed;

  const supabase = await createClient();
  const { error } = await supabase.from("time_entries").insert({
    organization_id: ctx.membership.organization_id,
    job_id: parsed.jobId,
    user_id: ctx.user.id,
    started_at: parsed.startedAt.toISOString(),
    stopped_at: parsed.stoppedAt.toISOString(),
    notes: parsed.notes,
    source: "manual",
  });
  if (error) return { error: "Couldn't save that entry. Please try again." };

  revalidatePath("/", "layout");
  redirect("/time");
}

export async function updateTimeEntry(_prev: EntryFormState, formData: FormData): Promise<EntryFormState> {
  const ctx = await requireMembership();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing entry." };

  const parsed = parseEntryForm(formData, ctx.organization.timezone);
  if (!("jobId" in parsed)) return parsed;

  // The audit trigger snapshots before/after (§8.4); RLS limits who can update.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("time_entries")
    .update({
      job_id: parsed.jobId,
      started_at: parsed.startedAt.toISOString(),
      stopped_at: parsed.stoppedAt.toISOString(),
      notes: parsed.notes,
    })
    .eq("id", id)
    .not("stopped_at", "is", null)
    .select("id");
  if (error || !data?.length) return { error: "Couldn't update that entry." };

  revalidatePath("/", "layout");
  redirect("/time");
}

export async function deleteTimeEntry(formData: FormData) {
  await requireMembership();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("time_entries").delete().eq("id", id);

  revalidatePath("/", "layout");
  redirect("/time");
}
