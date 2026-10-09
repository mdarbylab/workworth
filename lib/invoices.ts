import { createClient } from "@/lib/supabase/server";
import { revenueCents } from "@/lib/calc";
import type { Statement } from "@/lib/statement";
import type { Tables } from "@/lib/supabase/types";

export type InvoiceLineRow = Pick<
  Tables<"invoice_lines">,
  "id" | "description" | "quantity" | "unit_cents" | "total_cents" | "job_id"
>;

export type InvoiceDetail = {
  invoice: Tables<"invoices">;
  organization: Tables<"organizations">;
  client: Pick<Tables<"clients">, "id" | "name" | "email" | "phone"> | null;
  lines: InvoiceLineRow[];
};

/** Detail/print view loader, parallel to buildStatement. */
export async function buildInvoice(id: string): Promise<InvoiceDetail | null> {
  const supabase = await createClient();

  const [{ data: invoice }, { data: org }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("organizations").select("*").limit(1).maybeSingle(),
  ]);
  if (!invoice || !org) return null;

  const [{ data: client }, { data: lines }] = await Promise.all([
    invoice.client_id
      ? supabase.from("clients").select("id, name, email, phone").eq("id", invoice.client_id).maybeSingle()
      : Promise.resolve({ data: null as InvoiceDetail["client"] }),
    supabase
      .from("invoice_lines")
      .select("id, description, quantity, unit_cents, total_cents, job_id")
      .eq("invoice_id", id)
      .order("created_at"),
  ]);

  return { invoice, organization: org, client: client ?? null, lines: lines ?? [] };
}

export type DerivedInvoiceLine = {
  jobId: string;
  description: string;
  /** Hours for an hourly job, 1 for a fixed-price job. */
  quantity: number;
  unitCents: number;
  totalCents: number;
};

export type DerivedInvoice = {
  lines: DerivedInvoiceLine[];
  /** Time entry ids that will be marked invoiced once the insert succeeds. */
  includedEntryIds: string[];
  /** Entries left off because they were already billed on another invoice. */
  excludedAlreadyInvoicedEntryIds: string[];
  hasUnpricedWork: boolean;
};

/**
 * Turns a client statement into invoice line items, skipping hours already
 * billed on another invoice (the minimal double-billing guard, Sprint 6).
 *
 * A fixed-price job bills its whole price once, regardless of hours, so if
 * any of its entries in the period are already invoiced, the whole job is
 * treated as already billed and skipped entirely rather than re-charged.
 * An hourly job only skips the specific entries already billed, so a
 * second invoice for the same client correctly bills just the increment.
 */
export function deriveInvoiceLines(statement: Statement): DerivedInvoice {
  const lines: DerivedInvoiceLine[] = [];
  const includedEntryIds: string[] = [];
  const excludedAlreadyInvoicedEntryIds: string[] = [];

  for (const job of statement.jobs) {
    const notYetBilled = job.lines.filter((l) => l.invoicedInvoiceId === null);
    const alreadyBilled = job.lines.filter((l) => l.invoicedInvoiceId !== null);
    for (const l of alreadyBilled) excludedAlreadyInvoicedEntryIds.push(l.id);
    if (notYetBilled.length === 0) continue;

    if (job.billingType === "fixed") {
      if (job.fixedPriceCents === null || alreadyBilled.length > 0) continue;
      for (const l of notYetBilled) includedEntryIds.push(l.id);
      lines.push({
        jobId: job.id,
        description: `${job.name} (fixed price)`,
        quantity: 1,
        unitCents: job.fixedPriceCents,
        totalCents: job.fixedPriceCents,
      });
      continue;
    }

    if (job.hourlyRateCents === null) continue;
    const seconds = notYetBilled.reduce((s, l) => s + l.seconds, 0);
    for (const l of notYetBilled) includedEntryIds.push(l.id);
    lines.push({
      jobId: job.id,
      description: job.name,
      quantity: Number((seconds / 3600).toFixed(4)),
      unitCents: job.hourlyRateCents,
      totalCents: revenueCents(
        { billing_type: "hourly", hourly_rate_cents: job.hourlyRateCents, fixed_price_cents: null },
        seconds,
      ),
    });
  }

  return { lines, includedEntryIds, excludedAlreadyInvoicedEntryIds, hasUnpricedWork: statement.hasUnpricedWork };
}

/** "INV-0001" sequencing is server-side (next_invoice_number RPC); this just
 * formats a raw sequence number the same way, for tests and any display
 * that only has the number, not a round-trip through the RPC. */
export function formatInvoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(4, "0")}`;
}
