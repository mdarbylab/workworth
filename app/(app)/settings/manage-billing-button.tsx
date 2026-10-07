"use client";

import { useActionState } from "react";
import { createPortalSession, type BillingState } from "./billing-actions";

const initial: BillingState = {};

export function ManageBillingButton() {
  const [state, action, pending] = useActionState(createPortalSession, initial);

  return (
    <form action={action}>
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Opening…" : "Manage billing"}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
