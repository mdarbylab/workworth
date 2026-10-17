"use client";

import { useActionState } from "react";
import { agreeToTaxDisclaimer, type TaxConsentState } from "./actions";

const initial: TaxConsentState = {};

export function TaxConsentForm() {
  const [state, action, pending] = useActionState(
    agreeToTaxDisclaimer,
    initial,
  );

  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          name="agree"
          required
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
        />
        <span>
          I understand these are estimates to help me plan, not tax advice, and
          that I should check with a tax professional before I pay or file.
        </span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn-primary w-full sm:w-auto sm:px-6"
      >
        {pending ? "Saving…" : "Show my estimates"}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
