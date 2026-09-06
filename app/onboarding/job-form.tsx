"use client";

import { useActionState, useState } from "react";
import { createFirstJob, type OnboardingState } from "./actions";

const initial: OnboardingState = {};

export function JobForm({ businessName }: { businessName: string }) {
  const [state, action, pending] = useActionState(createFirstJob, initial);
  const [billingType, setBillingType] = useState<"hourly" | "fixed">("hourly");

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

      <fieldset>
        <legend className="label">How do you charge?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["hourly", "fixed"] as const).map((type) => (
            <label
              key={type}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                billingType === type
                  ? "border-emerald-700 bg-emerald-50 text-emerald-900"
                  : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              <input
                type="radio"
                name="billing_type"
                value={type}
                checked={billingType === type}
                onChange={() => setBillingType(type)}
                className="sr-only"
              />
              {type === "hourly" ? "Hourly rate" : "Fixed price"}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="amount" className="label">
          {billingType === "hourly" ? "Hourly rate" : "Fixed price"}{" "}
          <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
            $
          </span>
          <input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="input pl-7"
            placeholder={billingType === "hourly" ? "75.00" : "1,850.00"}
          />
        </div>
      </div>

      {state.error && <p className="error">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Saving…" : "Start tracking"}
      </button>
    </form>
  );
}
