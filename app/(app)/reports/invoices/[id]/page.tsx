import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { buildInvoice } from "@/lib/invoices";
import { formatCents } from "@/lib/calc";
import { formatDocDate } from "@/lib/dates";
import { InvoiceControls } from "./invoice-controls";
import { InvoiceLines } from "./invoice-lines";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage({ params }: PageProps<"/reports/invoices/[id]">) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  if (ctx.organization.plan !== "pro") redirect("/reports");

  const invoice = await buildInvoice(id);
  if (!invoice || invoice.invoice.organization_id !== ctx.organization.id) redirect("/reports/invoices");

  const { invoice: inv, organization: org, client, lines } = invoice;
  const isDraft = inv.status === "draft";

  return (
    <div className="statement">
      <InvoiceControls invoice={inv} canManage={ctx.hasFullAccess} />

      <article className="sheet">
        <header className="sheet-head">
          <div>
            <p className="biz-name">{org.name}</p>
            {org.address && <p className="biz-line">{org.address}</p>}
            {(org.contact_phone || org.contact_email) && (
              <p className="biz-line">
                {[org.contact_phone, org.contact_email].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <div className="sheet-meta">
            <p className="doc-title">Invoice {inv.number ?? "(draft)"}</p>
            {inv.issued_on && <p className="biz-line">Issued {formatDocDate(inv.issued_on, org.timezone)}</p>}
            {inv.due_on && <p className="biz-line">Due {formatDocDate(inv.due_on, org.timezone)}</p>}
          </div>
        </header>

        <div className="sheet-for">
          <p className="label-sm">Billed to</p>
          <p className="client-name">{client?.name ?? "No client"}</p>
          {client && (client.email || client.phone) && (
            <p className="biz-line">{[client.phone, client.email].filter(Boolean).join(" · ")}</p>
          )}
        </div>

        <InvoiceLines invoiceId={inv.id} lines={lines} editable={isDraft && ctx.hasFullAccess} />

        <section className="totals">
          <div className="total-row grand">
            <span>Total</span>
            <span className="num">{formatCents(inv.total_cents)}</span>
          </div>
        </section>

        <footer className="sheet-foot">
          <p>Amounts exclude any tax. Times recorded with WorkWorth.</p>
        </footer>
      </article>
    </div>
  );
}
