"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { TAX_DISCLAIMER_VERSION } from "@/lib/tax";

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
