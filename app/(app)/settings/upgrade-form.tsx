"use client";

import { useActionState } from "react";
import { trackClient } from "@/components/analytics";
import { createCheckoutSession, type BillingState } from "./billing-actions";

const initial: BillingState = {};

export function UpgradeForm({ interval, label }: { interval: "month" | "year"; label: string }) {
  const [state, action, pending] = useActionState(createCheckoutSession, initial);

  return (
    <form
      action={action}
      onSubmit={() => trackClient("checkout_started", { interval })}
    >
      <input type="hidden" name="interval" value={interval} />
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Redirecting…" : label}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
