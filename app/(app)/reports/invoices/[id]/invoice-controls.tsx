"use client";

import Link from "next/link";
import { useActionState } from "react";
import { markInvoiceSent, markInvoicePaid, voidInvoice, deleteDraftInvoice, type InvoiceFormState } from "../actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import type { Tables } from "@/lib/supabase/types";

const initial: InvoiceFormState = {};

function StatusButton({
  action,
  id,
  label,
  pendingLabel,
  confirmMessage,
  className,
}: {
  action: (prev: InvoiceFormState, formData: FormData) => Promise<InvoiceFormState>;
  id: string;
  label: string;
  pendingLabel: string;
  confirmMessage?: string;
  className: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirmMessage && !confirm(confirmMessage)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={className}>
        {pending ? pendingLabel : label}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}

/** The on-screen control bar. Hidden when printing, same convention as
 * StatementControls (app/(app)/reports/statement/statement-controls.tsx). */
export function InvoiceControls({
  invoice,
  canManage,
}: {
  invoice: Pick<Tables<"invoices">, "id" | "status">;
  canManage: boolean;
}) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <Link href="/reports/invoices" className="text-sm text-slate-600 hover:underline">← Invoices</Link>

      {canManage && invoice.status === "draft" && (
        <StatusButton
          action={markInvoiceSent}
          id={invoice.id}
          label="Mark sent"
          pendingLabel="Marking…"
          className="btn-secondary w-auto px-3 py-2 text-sm"
        />
      )}
      {canManage && invoice.status === "sent" && (
        <StatusButton
          action={markInvoicePaid}
          id={invoice.id}
          label="Mark paid"
          pendingLabel="Marking…"
          className="btn-secondary w-auto px-3 py-2 text-sm"
        />
      )}
      {canManage && (invoice.status === "draft" || invoice.status === "sent") && (
        <StatusButton
          action={voidInvoice}
          id={invoice.id}
          label="Void"
          pendingLabel="Voiding…"
          confirmMessage="Void this invoice? It can't be un-voided — create a new one if this was a mistake."
          className="w-auto px-3 py-2 text-sm text-red-700 hover:underline"
        />
      )}
      {canManage && invoice.status === "draft" && (
        <ConfirmDelete
          action={deleteDraftInvoice}
          id={invoice.id}
          label="Delete draft"
          message="Delete this draft invoice? This can't be undone."
        />
      )}

      <button
        type="button"
        onClick={() => window.print()}
        className="btn-primary ml-auto w-auto px-4 py-2 text-sm"
      >
        Print or save as PDF
      </button>
    </div>
  );
}
