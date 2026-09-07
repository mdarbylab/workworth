"use client";

import { useActionState } from "react";
import { acceptInvite, type AcceptState } from "./actions";

const initial: AcceptState = {};

export function AcceptForm({ token, organizationName }: { token: string; organizationName: string }) {
  const [state, action, pending] = useActionState(acceptInvite, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-stone-600">
        You&apos;ve been invited to track time and expenses for <strong>{organizationName}</strong>.
        You&apos;ll see your own entries; the owner sees everyone&apos;s.
      </p>
      {state.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Joining…" : `Join ${organizationName}`}
      </button>
    </form>
  );
}
