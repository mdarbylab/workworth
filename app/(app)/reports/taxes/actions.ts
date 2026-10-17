"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { TAX_DISCLAIMER_VERSION, isFilingStatus } from "@/lib/tax";

export type TaxConsentState = { error?: string };

/** REQ-048: record this account's explicit agreement to the current disclaimer. */
export async function agreeToTaxDisclaimer(
  _prev: TaxConsentState,
  formData: FormData,
): Promise<TaxConsentState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (formData.get("agree") !== "on")
    return { error: "Tick the box to say you understand." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tax_consents")
    .upsert(
      { user_id: ctx.user.id, disclaimer_version: TAX_DISCLAIMER_VERSION },
      { onConflict: "user_id,disclaimer_version", ignoreDuplicates: true },
    );
  if (error) return { error: "Couldn't save that. Try again." };

  revalidatePath("/reports/taxes");
  return {};
}

export type FilingStatusState = { error?: string };

/** ADR 0007: the account's filing status, used for income tax brackets. */
export async function saveFilingStatus(
  _prev: FilingStatusState,
  formData: FormData,
): Promise<FilingStatusState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  const status = formData.get("filing_status");
  if (!isFilingStatus(status)) return { error: "Pick a filing status." };

  const supabase = await createClient();
  const { error } = await supabase.from("tax_profiles").upsert(
    {
      user_id: ctx.user.id,
      filing_status: status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: "Couldn't save that. Try again." };

  revalidatePath("/reports/taxes");
  return {};
}
