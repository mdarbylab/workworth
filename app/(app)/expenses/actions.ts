"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { parseDollars } from "@/lib/calc";
import {
  isExpenseCategory,
  isValidDateKey,
  type ExpenseCategory,
} from "@/lib/expenses";
import { track } from "@/lib/analytics/server";
import {
  RECEIPTS_BUCKET,
  checkReceipt,
  receiptFromForm,
  receiptPath,
} from "@/lib/receipts";

export type ExpenseFormState = { error?: string };

async function requireMembership() {
  const ctx = await getSessionContext();
  if (!ctx?.organization || !ctx.membership) redirect("/onboarding");
  return { ...ctx, organization: ctx.organization, membership: ctx.membership };
}

type ParsedExpense = {
  amount_cents: number;
  spent_on: string;
  job_id: string | null;
  category: ExpenseCategory;
  description: string | null;
  miles: number | null;
};

/**
 * A mileage expense's amount is always computed from miles × the org's
 * current mileage_rate_cents (Settings) — never trusted from the client,
 * the same way invoice totals are server-derived rather than client-sent.
 */
function parseExpenseForm(
  formData: FormData,
  mileageRateCents: number,
): ParsedExpense | ExpenseFormState {
  const spentOn = String(formData.get("spent_on") ?? "");
  if (!isValidDateKey(spentOn)) return { error: "Enter a valid date." };

  const category = formData.get("category");
  if (!isExpenseCategory(category)) return { error: "Pick a category." };

  const jobId = String(formData.get("job_id") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (category === "mileage") {
    const miles = Number(String(formData.get("miles") ?? "").trim());
    if (!Number.isFinite(miles) || miles <= 0)
      return { error: "Enter the miles driven." };
    const cents = Math.round(miles * mileageRateCents);
    return {
      amount_cents: cents,
      spent_on: spentOn,
      job_id: jobId,
      category,
      description,
      miles,
    };
  }

  const cents = parseDollars(String(formData.get("amount") ?? ""));
  if (cents === null || Number.isNaN(cents))
    return { error: "Enter the amount." };
  if (cents <= 0) return { error: "Amount must be more than zero." };

  return {
    amount_cents: cents,
    spent_on: spentOn,
    job_id: jobId,
    category,
    description,
    miles: null,
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Upload a receipt to the private bucket (SPEC §5.4). Pro only (§9) — the
 * storage insert policy checks the plan too, so this is the friendly message,
 * not the enforcement. Returns the stored path, or an error for the form.
 */
async function uploadReceipt(
  supabase: Supabase,
  file: File,
  organization: { id: string; plan: string },
  expenseId: string,
): Promise<{ path: string } | ExpenseFormState> {
  if (organization.plan !== "pro")
    return { error: "Receipt attachments are part of Pro." };
  const check = checkReceipt(file);
  if (!check.ok) return { error: check.error };

  const path = receiptPath(
    organization.id,
    expenseId,
    check.extension,
    randomUUID().slice(0, 8),
  );
  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (error)
    return { error: "Couldn't upload that receipt. Please try again." };
  return { path };
}

async function removeReceipt(supabase: Supabase, path: string | null) {
  if (!path) return;
  // Best-effort: an object left behind is only wasted space, never exposed —
  // the select policy hides a receipt whose expense is gone.
  await supabase.storage.from(RECEIPTS_BUCKET).remove([path]);
}

export async function createExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await requireMembership();
  const parsed = parseExpenseForm(
    formData,
    ctx.organization.mileage_rate_cents,
  );
  if (!("amount_cents" in parsed)) return parsed;

  const supabase = await createClient();
  if (parsed.job_id) {
    const { data: job } = await supabase
      .from("jobs")
      .select("id")
      .eq("id", parsed.job_id)
      .maybeSingle();
    if (!job) return { error: "That job no longer exists." };
  }

  // The id is chosen here so the receipt can be uploaded under it first and
  // the row inserted with receipt_path already set — one "insert" in
  // history, not an insert followed by an edit.
  const id = randomUUID();
  let receipt_path: string | null = null;
  const file = receiptFromForm(formData);
  if (file) {
    const uploaded = await uploadReceipt(supabase, file, ctx.organization, id);
    if (!("path" in uploaded)) return uploaded;
    receipt_path = uploaded.path;
  }

  const { error } = await supabase.from("expenses").insert({
    ...parsed,
    id,
    receipt_path,
    organization_id: ctx.membership.organization_id,
    user_id: ctx.user.id,
  });
  if (error) {
    await removeReceipt(supabase, receipt_path);
    return { error: "Couldn't save that expense. Please try again." };
  }

  track(
    "expense_added",
    { userId: ctx.user.id, organizationId: ctx.membership.organization_id },
    {
      category: parsed.category,
      has_job: parsed.job_id !== null,
    },
  );
  revalidatePath("/", "layout");
  redirect("/expenses");
}

export async function updateExpense(
  _prev: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const ctx = await requireMembership();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing expense." };

  const parsed = parseExpenseForm(
    formData,
    ctx.organization.mileage_rate_cents,
  );
  if (!("amount_cents" in parsed)) return parsed;

  // The audit trigger snapshots before/after (§8.4); RLS limits who can update.
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("expenses")
    .select("receipt_path")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Couldn't update that expense." };

  // A new file replaces the old receipt; "remove" clears it. Otherwise the
  // receipt stays exactly as it was.
  let receipt_path = existing.receipt_path;
  const file = receiptFromForm(formData);
  if (file) {
    const uploaded = await uploadReceipt(supabase, file, ctx.organization, id);
    if (!("path" in uploaded)) return uploaded;
    receipt_path = uploaded.path;
  } else if (formData.get("remove_receipt") === "on") {
    receipt_path = null;
  }

  const { data, error } = await supabase
    .from("expenses")
    .update({ ...parsed, receipt_path })
    .eq("id", id)
    .select("id");
  if (error || !data?.length) {
    if (receipt_path !== existing.receipt_path)
      await removeReceipt(supabase, receipt_path);
    return { error: "Couldn't update that expense." };
  }
  if (receipt_path !== existing.receipt_path)
    await removeReceipt(supabase, existing.receipt_path);

  revalidatePath("/", "layout");
  redirect("/expenses");
}

export async function deleteExpense(formData: FormData) {
  await requireMembership();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  // Only remove the receipt once the row is really gone (RLS may refuse the
  // delete); the storage delete policy allows it then, since no expense with
  // that id exists any more.
  const { data: deleted } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .select("receipt_path");
  await removeReceipt(supabase, deleted?.[0]?.receipt_path ?? null);

  revalidatePath("/", "layout");
  redirect("/expenses");
}
