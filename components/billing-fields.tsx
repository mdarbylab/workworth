"use client";

import { useState } from "react";

type Props = {
  defaultType?: "hourly" | "fixed";
  defaultAmount?: string;
  required?: boolean;
};

/** Billing type toggle + amount field, shared by onboarding and the job form. */
export function BillingFields({ defaultType = "hourly", defaultAmount = "", required = false }: Props) {
  const [billingType, setBillingType] = useState<"hourly" | "fixed">(defaultType);

  return (
    <>
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
          {!required && <span className="font-normal text-stone-400">(optional)</span>}
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
            $
          </span>
          <input
            id="amount"
            name="amount"
            type="text"
            inputMode="decimal"
            defaultValue={defaultAmount}
            required={required}
            className="input pl-7"
            placeholder={billingType === "hourly" ? "75.00" : "1,850.00"}
          />
        </div>
      </div>
    </>
  );
}
