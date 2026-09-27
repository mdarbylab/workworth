"use client";

import { useActionState } from "react";
import { acceptInvite, type AcceptState } from "./actions";

const initial: AcceptState = {};

export function AcceptForm({
  token,
  organizationName,
  defaultName = "",
}: {
  token: string;
  organizationName: string;
  defaultName?: string;
}) {
  const [state, action, pending] = useActionState(acceptInvite, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-slate-600">
        You&apos;ve been invited to track time and expenses for <strong>{organizationName}</strong>.
        On the free plan you both see the whole business.
      </p>
      <div>
        <label htmlFor="display_name" className="label">Your name</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={defaultName}
          className="input"
          placeholder="Alex Rivera"
        />
        <p className="mt-1 text-xs text-slate-500">This is how you appear to the rest of the business.</p>
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Joining…" : `Join ${organizationName}`}
      </button>
    </form>
  );
}
