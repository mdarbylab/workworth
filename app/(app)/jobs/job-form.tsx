"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { JobFormState } from "./actions";
import { BillingFields } from "@/components/billing-fields";

export type JobDefaults = {
  name: string;
  clientName: string;
  billingType: "hourly" | "fixed";
  amount: string;
  estimatedHours: string;
  notes: string;
};

type Props = {
  clientNames: string[];
  action: (prev: JobFormState, formData: FormData) => Promise<JobFormState>;
  defaults?: JobDefaults;
  jobId?: string;
  submitLabel: string;
  cancelHref: string;
};

const initial: JobFormState = {};
const empty: JobDefaults = { name: "", clientName: "", billingType: "hourly", amount: "", estimatedHours: "", notes: "" };

export function JobForm({ clientNames, action, defaults = empty, jobId, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-5">
      {jobId && <input type="hidden" name="id" value={jobId} />}

      <div>
        <label htmlFor="name" className="label">Job name</label>
        <input id="name" name="name" type="text" required autoFocus={!jobId} defaultValue={defaults.name} className="input" placeholder="e.g. Kitchen remodel" />
      </div>

      <div>
        <label htmlFor="client_name" className="label">
          Client <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          id="client_name"
          name="client_name"
          type="text"
          list="client-names"
          autoComplete="off"
          defaultValue={defaults.clientName}
          className="input"
          placeholder="Start typing — new names are added automatically"
        />
        <datalist id="client-names">
          {clientNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <BillingFields defaultType={defaults.billingType} defaultAmount={defaults.amount} />

      <div>
        <label htmlFor="estimated_hours" className="label">
          Estimated hours <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          id="estimated_hours"
          name="estimated_hours"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.5"
          defaultValue={defaults.estimatedHours}
          className="input"
          placeholder="e.g. 20"
        />
      </div>

      <div>
        <label htmlFor="notes" className="label">
          Notes <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={defaults.notes} className="input" />
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
