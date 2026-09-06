"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { parseDollars } from "@/lib/calc";
import { isExpenseCategory, isValidDateKey, type ExpenseCategory } from "@/lib/expenses";

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
};

function parseExpenseForm(formData: FormData): ParsedExpense | ExpenseFormState {
  const cents = parseDollars(String(formData.get("amount") ?? ""));
  if (cents === null || Number.isNaN(cents)) return { error: "Enter the amount." };
  if (cents <= 0) return { error: "Amount must be more than zero." };

  const spentOn = String(formData.get("spent_on") ?? "");
  if (!isValidDateKey(spentOn)) return { error: "Enter a valid date." };

  const category = formData.get("category");
  if (!isExpenseCategory(category)) return { error: "Pick a category." };

  const jobId = String(formData.get("job_id") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  return { amount_cents: cents, spent_on: spentOn, job_id: jobId, category, description };
}

export async function createExpense(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const ctx = await requireMembership();
  const parsed = parseExpenseForm(formData);
  if (!("amount_cents" in parsed)) return parsed;

  const supabase = await createClient();
  if (parsed.job_id) {
    const { data: job } = await supabase.from("jobs").select("id").eq("id", parsed.job_id).maybeSingle();
    if (!job) return { error: "That job no longer exists." };
  }

  const { error } = await supabase.from("expenses").insert({
    ...parsed,
    organization_id: ctx.membership.organization_id,
    user_id: ctx.user.id,
  });
  if (error) return { error: "Couldn't save that expense. Please try again." };

  revalidatePath("/", "layout");
  redirect("/expenses");
}

export async function updateExpense(_prev: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  await requireMembership();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing expense." };

  const parsed = parseExpenseForm(formData);
  if (!("amount_cents" in parsed)) return parsed;

  // The audit trigger snapshots before/after (§8.4); RLS limits who can update.
  const supabase = await createClient();
  const { data, error } = await supabase.from("expenses").update(parsed).eq("id", id).select("id");
  if (error || !data?.length) return { error: "Couldn't update that expense." };

  revalidatePath("/", "layout");
  redirect("/expenses");
}

export async function deleteExpense(formData: FormData) {
  await requireMembership();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", id);

  revalidatePath("/", "layout");
  redirect("/expenses");
}
