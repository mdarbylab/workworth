"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { ExpenseFormState } from "./actions";
import { CATEGORY_LABELS, EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/expenses";
import { formatCents } from "@/lib/calc";

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
};

const initial: ExpenseFormState = {};

export function ExpenseForm({ jobs, defaults, mileageRateCents, action, expenseId, submitLabel, cancelHref }: Props) {
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
