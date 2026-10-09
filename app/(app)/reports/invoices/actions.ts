"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext, type SessionContext } from "@/lib/session";
import { resolvePeriod } from "@/lib/periods";
import { buildStatement } from "@/lib/statement";
import { deriveInvoiceLines } from "@/lib/invoices";
import { parseDollars } from "@/lib/calc";
import { dateKey } from "@/lib/dates";
import { track } from "@/lib/analytics/server";

export type InvoiceFormState = { error?: string; message?: string };

async function requireMembership() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!ctx.organization || !ctx.membership) redirect("/onboarding");
  return { ...ctx, organization: ctx.organization, membership: ctx.membership };
}

/** Invoicing is Pro-only (SPEC §9) and gated the same as Settings -> Business. */
function checkInvoicingAccess(ctx: Pick<SessionContext, "organization" | "hasFullAccess">): string | null {
  if (ctx.organization?.plan !== "pro") return "Invoicing comes with Pro. Upgrade in Settings to use it.";
  if (!ctx.hasFullAccess) return "You don't have access to invoices.";
  return null;
}

function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export async function createInvoiceFromStatement(
  _prev: InvoiceFormState,
  formData: FormData,
): Promise<InvoiceFormState> {
  const ctx = await requireMembership();
  const denied = checkInvoicingAccess(ctx);
  if (denied) return { error: denied };

  const clientId = String(formData.get("client_id") ?? "");
  if (!clientId) return { error: "Missing client." };

  const period = resolvePeriod(
    {
      period: formData.get("period") ?? undefined,
      from: formData.get("from") ?? undefined,
      to: formData.get("to") ?? undefined,
    },
    ctx.organization.timezone,
  );

  const statement = await buildStatement(clientId, period);
  if (!statement) return { error: "Couldn't load that client's work for this period." };

  const derived = deriveInvoiceLines(statement);
  if (derived.lines.length === 0) {
    return {
      error:
        statement.jobs.length === 0
          ? "No work was tracked for this client in this period."
          : "Everything in this period is either unpriced or already on another invoice.",
    };
  }

  const supabase = await createClient();
  const orgId = ctx.membership.organization_id;

  const { data: number, error: numberError } = await supabase.rpc("next_invoice_number", {
    p_organization_id: orgId,
  });
  if (numberError || !number) return { error: "Couldn't generate an invoice number. Please try again." };

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .insert({ organization_id: orgId, client_id: clientId, number, status: "draft" })
    .select("id")
    .single();
  if (invoiceError) return { error: "Couldn't create the invoice. Please try again." };

  const { error: linesError } = await supabase.from("invoice_lines").insert(
    derived.lines.map((l) => ({
      organization_id: orgId,
      invoice_id: invoice.id,
      job_id: l.jobId,
      description: l.description,
      quantity: l.quantity,
      unit_cents: l.unitCents,
      total_cents: l.totalCents,
    })),
  );
  if (linesError) {
    return { error: "Created the invoice but couldn't add its line items. Delete the empty draft and try again." };
  }

  if (derived.includedEntryIds.length) {
    await supabase
      .from("time_entries")
      .update({ invoiced_in_invoice_id: invoice.id })
      .in("id", derived.includedEntryIds)
      .eq("organization_id", orgId);
  }

  track(
    "invoice_created",
    { userId: ctx.user.id, organizationId: orgId },
    {
      line_count: derived.lines.length,
      excluded_already_invoiced: derived.excludedAlreadyInvoicedEntryIds.length,
    },
  );
  revalidatePath("/", "layout");
  redirect(`/reports/invoices/${invoice.id}`);
}

export async function markInvoiceSent(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing invoice." };

  const ctx = await requireMembership();
  const denied = checkInvoicingAccess(ctx);
  if (denied) return { error: denied };

  const issuedOn = dateKey(new Date(), ctx.organization.timezone);
  const dueOn = addDaysToKey(issuedOn, 14);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "sent", issued_on: issuedOn, due_on: dueOn })
    .eq("id", id)
    .eq("organization_id", ctx.membership.organization_id)
    .eq("status", "draft")
    .select("id");
  if (error || !data?.length) return { error: "Couldn't mark this invoice sent." };

  track("invoice_sent", { userId: ctx.user.id, organizationId: ctx.membership.organization_id });
  revalidatePath("/", "layout");
  return { message: "Marked sent." };
}

export async function markInvoicePaid(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing invoice." };

  const ctx = await requireMembership();
  const denied = checkInvoicingAccess(ctx);
  if (denied) return { error: denied };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "paid" })
    .eq("id", id)
    .eq("organization_id", ctx.membership.organization_id)
    .eq("status", "sent")
    .select("id");
  if (error || !data?.length) return { error: "Couldn't mark this invoice paid." };

  track("invoice_paid", { userId: ctx.user.id, organizationId: ctx.membership.organization_id });
  revalidatePath("/", "layout");
  return { message: "Marked paid." };
}

/** Voiding frees any hours it held so they can be billed correctly on a
 * replacement invoice (SPEC §8.4 principle: fix by voiding + recreating,
 * never by silently editing a document that already left the business). */
export async function voidInvoice(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing invoice." };

  const ctx = await requireMembership();
  const denied = checkInvoicingAccess(ctx);
  if (denied) return { error: denied };

  const supabase = await createClient();
  const orgId = ctx.membership.organization_id;

  const { data, error } = await supabase
    .from("invoices")
    .update({ status: "void" })
    .eq("id", id)
    .eq("organization_id", orgId)
    .in("status", ["draft", "sent"])
    .select("id");
  if (error || !data?.length) return { error: "Couldn't void this invoice." };

  await supabase
    .from("time_entries")
    .update({ invoiced_in_invoice_id: null })
    .eq("invoiced_in_invoice_id", id)
    .eq("organization_id", orgId);

  track("invoice_voided", { userId: ctx.user.id, organizationId: orgId });
  revalidatePath("/", "layout");
  return { message: "Voided." };
}

export async function deleteDraftInvoice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const ctx = await requireMembership();
  if (checkInvoicingAccess(ctx)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("organization_id", ctx.membership.organization_id)
    .eq("status", "draft");
  if (error) return;

  revalidatePath("/", "layout");
  redirect("/reports/invoices");
}

/** Lines are only writable while the parent invoice is a draft -- RLS
 * enforces this too, these are app-level errors for a nicer message. */
export async function addInvoiceLine(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const ctx = await requireMembership();
  const denied = checkInvoicingAccess(ctx);
  if (denied) return { error: denied };

  const invoiceId = String(formData.get("invoice_id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (!invoiceId || !description) return { error: "Enter a description." };

  const quantity = Number(String(formData.get("quantity") ?? "1").trim());
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Enter a valid quantity." };

  const unitCents = parseDollars(String(formData.get("unit_cents") ?? ""));
  if (unitCents === null || Number.isNaN(unitCents)) return { error: "Enter a valid amount." };

  const supabase = await createClient();
  const { error } = await supabase.from("invoice_lines").insert({
    organization_id: ctx.membership.organization_id,
    invoice_id: invoiceId,
    description,
    quantity,
    unit_cents: unitCents,
    total_cents: Math.round(quantity * unitCents),
  });
  if (error) return { error: "Couldn't add the line. The invoice may no longer be a draft." };

  revalidatePath("/", "layout");
  return { message: "Added." };
}

export async function updateInvoiceLine(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const ctx = await requireMembership();
  const denied = checkInvoicingAccess(ctx);
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  if (!id || !description) return { error: "Enter a description." };

  const quantity = Number(String(formData.get("quantity") ?? "1").trim());
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "Enter a valid quantity." };

  const unitCents = parseDollars(String(formData.get("unit_cents") ?? ""));
  if (unitCents === null || Number.isNaN(unitCents)) return { error: "Enter a valid amount." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("invoice_lines")
    .update({ description, quantity, unit_cents: unitCents, total_cents: Math.round(quantity * unitCents) })
    .eq("id", id)
    .eq("organization_id", ctx.membership.organization_id);
  if (error) return { error: "Couldn't save. The invoice may no longer be a draft." };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function removeInvoiceLine(formData: FormData) {
  const ctx = await requireMembership();
  if (checkInvoicingAccess(ctx)) return;

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("invoice_lines").delete().eq("id", id).eq("organization_id", ctx.membership.organization_id);

  revalidatePath("/", "layout");
}
