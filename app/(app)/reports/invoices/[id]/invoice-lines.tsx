"use client";

import { useActionState } from "react";
import { addInvoiceLine, updateInvoiceLine, removeInvoiceLine, type InvoiceFormState } from "../actions";
import { formatCents } from "@/lib/calc";
import type { InvoiceLineRow } from "@/lib/invoices";

const initial: InvoiceFormState = {};
const dollars = (cents: number) => (cents / 100).toFixed(2);

function LineRow({ line, invoiceId }: { line: InvoiceLineRow; invoiceId: string }) {
  const [updateState, updateAction, updatePending] = useActionState(updateInvoiceLine, initial);

  return (
    <tr>
      <td className="px-3 py-2">
        <form action={updateAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="id" value={line.id} />
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <input name="description" defaultValue={line.description} className="input min-w-[8rem] flex-1" />
          <input
            name="quantity"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={line.quantity}
            className="input w-20"
          />
          <input
            name="unit_cents"
            defaultValue={dollars(line.unit_cents)}
            className="input w-24"
            placeholder="$0.00"
          />
          <button type="submit" disabled={updatePending} className="btn-secondary w-auto px-2 py-1 text-xs">
            {updatePending ? "Saving…" : "Save"}
          </button>
          {updateState.error && <p className="error w-full">{updateState.error}</p>}
        </form>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCents(line.total_cents)}</td>
      <td className="px-3 py-2">
        <form action={removeInvoiceLine}>
          <input type="hidden" name="id" value={line.id} />
          <button type="submit" className="text-xs text-red-700 hover:underline">Remove</button>
        </form>
      </td>
    </tr>
  );
}

function AddLineForm({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(addInvoiceLine, initial);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="invoice_id" value={invoiceId} />
      <div className="min-w-[8rem] flex-1">
        <label htmlFor="line_description" className="label">Description</label>
        <input id="line_description" name="description" className="input" placeholder="Extra materials" />
      </div>
      <div className="w-20">
        <label htmlFor="line_quantity" className="label">Qty</label>
        <input id="line_quantity" name="quantity" type="number" step="0.01" min="0.01" defaultValue="1" className="input" />
      </div>
      <div className="w-24">
        <label htmlFor="line_unit" className="label">Amount</label>
        <input id="line_unit" name="unit_cents" placeholder="$0.00" className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn-secondary w-auto px-3 py-2 text-sm">
        {pending ? "Adding…" : "Add line"}
      </button>
      {state.error && <p className="error w-full">{state.error}</p>}
    </form>
  );
}

export function InvoiceLines({
  invoiceId,
  lines,
  editable,
}: {
  invoiceId: string;
  lines: InvoiceLineRow[];
  editable: boolean;
}) {
  if (lines.length === 0 && !editable) {
    return <p className="empty">No line items.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th className="c-work">Description</th>
            <th className="c-num">Amount</th>
            {editable && <th />}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) =>
            editable ? (
              <LineRow key={line.id} line={line} invoiceId={invoiceId} />
            ) : (
              <tr key={line.id}>
                <td className="px-3 py-2">
                  {line.description}
                  <span className="block text-xs text-slate-500">
                    {line.quantity} × {formatCents(line.unit_cents)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCents(line.total_cents)}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
      {editable && (
        <div className="no-print">
          <AddLineForm invoiceId={invoiceId} />
        </div>
      )}
    </div>
  );
}
