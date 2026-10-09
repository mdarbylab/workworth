"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createInvoiceFromStatement, type InvoiceFormState } from "../invoices/actions";

const initialInvoiceState: InvoiceFormState = {};

/**
 * The on-screen control bar. Hidden when printing so it never lands on the
 * document the client receives.
 */
export function StatementControls({
  showMoney,
  clientId,
  periodKey,
  fromKey,
  toKey,
  canInvoice,
}: {
  showMoney: boolean;
  clientId: string;
  periodKey: string;
  fromKey: string;
  toKey: string;
  canInvoice: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [invoiceState, invoiceAction, invoicePending] = useActionState(
    createInvoiceFromStatement,
    initialInvoiceState,
  );

  const toggleMoney = () => {
    const next = new URLSearchParams(params.toString());
    if (showMoney) next.set("money", "0");
    else next.delete("money");
    router.replace(`/reports/statement?${next}`);
  };

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <Link href="/reports" className="text-sm text-slate-600 hover:underline">← Reports</Link>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={showMoney}
          onChange={toggleMoney}
          className="h-4 w-4 accent-ink-700"
        />
        Show rates and amounts
      </label>

      {showMoney && canInvoice && (
        <form action={invoiceAction} className="flex items-center gap-2">
          <input type="hidden" name="client_id" value={clientId} />
          <input type="hidden" name="period" value={periodKey} />
          <input type="hidden" name="from" value={fromKey} />
          <input type="hidden" name="to" value={toKey} />
          <button type="submit" disabled={invoicePending} className="btn-secondary w-auto px-3 py-2 text-sm">
            {invoicePending ? "Saving…" : "Save as invoice"}
          </button>
          {invoiceState.error && <p className="error">{invoiceState.error}</p>}
        </form>
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
