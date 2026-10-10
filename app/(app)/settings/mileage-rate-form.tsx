"use client";

import { useActionState } from "react";
import { updateMileageRate, type SettingsState } from "./actions";

const initial: SettingsState = {};

export function MileageRateForm({ mileageRateCents }: { mileageRateCents: number }) {
  const [state, action, pending] = useActionState(updateMileageRate, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="mileage_rate" className="label">Rate per mile</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">$</span>
          <input
            id="mileage_rate"
            name="mileage_rate"
            type="text"
            inputMode="decimal"
            required
            defaultValue={(mileageRateCents / 100).toFixed(2)}
            className="input w-28 pl-7"
          />
        </div>
      </div>
      <button type="submit" disabled={pending} className="btn-secondary w-auto px-4 py-2 text-sm">
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && <p className="error w-full">{state.error}</p>}
      {state.message && <p className="notice w-full">{state.message}</p>}
    </form>
  );
}
