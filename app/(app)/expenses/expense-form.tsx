"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ExpenseFormState } from "./actions";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expenses";
import { formatCents } from "@/lib/calc";
import { RECEIPT_ACCEPT } from "@/lib/receipts";

export type ExpenseDefaults = {
  amount: string;
  miles: string;
  spentOn: string;
  jobId: string;
  category: ExpenseCategory;
  description: string;
};

type Props = {
  jobs: Array<{ id: string; name: string; status: "active" | "archived" }>;
  defaults: ExpenseDefaults;
  mileageRateCents: number;
  action: (prev: ExpenseFormState, formData: FormData) => Promise<ExpenseFormState>;
  expenseId?: string;
  submitLabel: string;
  cancelHref: string;
  /** Pro only (SPEC §9). Off, the upload control isn't shown at all. */
  canAttachReceipt: boolean;
  /** Where "View receipt" goes, when this expense already has one. */
  receiptHref?: string | null;
};

const initial: ExpenseFormState = {};

export function ExpenseForm({
  jobs,
  defaults,
  mileageRateCents,
  action,
  expenseId,
  submitLabel,
  cancelHref,
  canAttachReceipt,
  receiptHref,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [category, setCategory] = useState<ExpenseCategory>(defaults.category);
  const isMileage = category === "mileage";

  return (
    <form action={formAction} className="space-y-5">
      {expenseId && <input type="hidden" name="id" value={expenseId} />}

      {isMileage ? (
        <div>
          <label htmlFor="miles" className="label">Miles</label>
          <input
            id="miles"
            name="miles"
            type="text"
            inputMode="decimal"
            required
            autoFocus={!expenseId}
            defaultValue={defaults.miles}
            className="input text-lg"
            placeholder="0"
          />
          <p className="mt-1 text-xs text-slate-500">
            Calculated at {formatCents(mileageRateCents)}/mile. Change the rate in Settings.
          </p>
        </div>
      ) : (
        <div>
          <label htmlFor="amount" className="label">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              required
              autoFocus={!expenseId}
              defaultValue={defaults.amount}
              className="input pl-7 text-lg"
              placeholder="0.00"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="spent_on" className="label">Date</label>
          <input id="spent_on" name="spent_on" type="date" required defaultValue={defaults.spentOn} className="input" />
        </div>
        <div>
          <label htmlFor="category" className="label">Category</label>
          <select
            id="category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            required
            className="input"
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="job_id" className="label">
          Job <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <select id="job_id" name="job_id" defaultValue={defaults.jobId} className="input">
          <option value="">No job — general business expense</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}{j.status === "archived" ? " (archived)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="description" className="label">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input id="description" name="description" type="text" defaultValue={defaults.description} className="input" placeholder="e.g. Drywall and screws" />
      </div>

      {(canAttachReceipt || receiptHref) && (
        <div className="space-y-2">
          <label htmlFor="receipt" className="label">
            Receipt <span className="font-normal text-slate-400">(optional)</span>
          </label>
          {receiptHref && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <a href={receiptHref} target="_blank" rel="noopener noreferrer" className="font-medium text-ink-800 hover:underline">
                View receipt
              </a>
              <label className="flex items-center gap-2 text-slate-600">
                <input type="checkbox" name="remove_receipt" className="h-4 w-4" />
                Remove
              </label>
            </div>
          )}
          {canAttachReceipt && (
            <>
              <input
                id="receipt"
                name="receipt"
                type="file"
                accept={RECEIPT_ACCEPT}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink-900 hover:file:bg-slate-200"
              />
              <p className="text-xs text-slate-500">
                Photo or PDF, up to 4 MB.{receiptHref ? " Choosing a new file replaces the current one." : ""} Only
                people who can see this expense can open it.
              </p>
            </>
          )}
        </div>
      )}

      {state.error && <p className="error">{state.error}</p>}

      <div className="flex gap-3">
        <Link href={cancelHref} className="btn-secondary">Cancel</Link>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
