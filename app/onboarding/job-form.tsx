"use client";

import { useActionState } from "react";
import { createFirstJob, type OnboardingState } from "./actions";
import { BillingFields } from "@/components/billing-fields";

const initial: OnboardingState = {};

export function JobForm({ businessName }: { businessName: string }) {
  const [state, action, pending] = useActionState(createFirstJob, initial);

  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">What are you working on first?</h1>
        <p className="mt-1 text-sm text-stone-500">
          Your first job for {businessName}. You can add more anytime.
        </p>
      </div>

      <div>
        <label htmlFor="name" className="label">Job name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          className="input"
          placeholder="e.g. Kitchen remodel"
        />
      </div>

      <BillingFields />

      {state.error && <p className="error">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Start tracking"}
      </button>
    </form>
  );
}
