"use client";

import { useActionState } from "react";
import { FILING_STATUSES, type FilingStatus } from "@/lib/tax";
import { saveFilingStatus, type FilingStatusState } from "./actions";

const initial: FilingStatusState = {};

export function FilingStatusForm({
  status,
  chosen,
}: {
  status: FilingStatus;
  chosen: boolean;
}) {
  const [state, action, pending] = useActionState(saveFilingStatus, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor="filing_status" className="label">
          Filing status
        </label>
        <select
          id="filing_status"
          name="filing_status"
          defaultValue={status}
          className="input"
        >
          {FILING_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn-secondary w-auto px-4 py-2.5 text-sm"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {!chosen && !state.error && (
        <p className="w-full text-xs text-slate-500">
          Using single until you pick one.
        </p>
      )}
      {state.error && <p className="error w-full">{state.error}</p>}
    </form>
  );
}
