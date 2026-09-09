"use client";

import { useActionState, useEffect, useRef } from "react";
import { createOrganization, type OnboardingState } from "./actions";

const initial: OnboardingState = {};

export function OrgForm() {
  const [state, action, pending] = useActionState(createOrganization, initial);
  const timezoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timezoneRef.current) {
      timezoneRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    }
  }, []);

  return (
    <form action={action} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">What&apos;s your business called?</h1>
        <p className="mt-1 text-sm text-stone-500">
          You can change this later in Settings.
        </p>
      </div>

      <div>
        <label htmlFor="name" className="label">Business name</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          autoComplete="organization"
          maxLength={120}
          className="input"
          placeholder="e.g. Rivera Electric"
        />
      </div>
      <input ref={timezoneRef} type="hidden" name="timezone" defaultValue="" />

      {state.error && <p className="error">{state.error}</p>}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Setting up…" : "Continue"}
      </button>
    </form>
  );
}
