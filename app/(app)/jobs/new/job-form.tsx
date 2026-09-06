"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createJob, type JobFormState } from "../actions";
import { BillingFields } from "@/components/billing-fields";

const initial: JobFormState = {};

export function JobForm({ clientNames }: { clientNames: string[] }) {
  const [state, action, pending] = useActionState(createJob, initial);

  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="name" className="label">Job name</label>
        <input id="name" name="name" type="text" required autoFocus className="input" placeholder="e.g. Kitchen remodel" />
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
          className="input"
          placeholder="Start typing — new names are added automatically"
        />
        <datalist id="client-names">
          {clientNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </div>

      <BillingFields />

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
          className="input"
          placeholder="e.g. 20"
        />
      </div>

      <div>
        <label htmlFor="notes" className="label">
          Notes <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea id="notes" name="notes" rows={3} className="input" />
      </div>

      {state.error && <p className="error">{state.error}</p>}

      <div className="flex gap-3">
        <Link href="/jobs" className="btn-secondary">Cancel</Link>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Create job"}
        </button>
      </div>
    </form>
  );
}
