"use client";

import { useActionState } from "react";
import { updateDisplayName, type SettingsState } from "./actions";

const initial: SettingsState = {};

export function NameForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, initial);

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="display_name" className="label">Your name</label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
          required
          maxLength={80}
          defaultValue={displayName}
          className="input"
        />
        <p className="mt-1 text-xs text-slate-500">How you appear to everyone else in the business.</p>
      </div>
      {state.error && <p className="error">{state.error}</p>}
      {state.message && <p className="notice">{state.message}</p>}
      <button type="submit" disabled={pending} className="btn-secondary w-auto px-5">
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
