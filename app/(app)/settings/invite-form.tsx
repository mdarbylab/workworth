"use client";

import { useActionState } from "react";
import { inviteMember, type SettingsState } from "./actions";

const initial: SettingsState = {};

export function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, initial);

  return (
    <form action={action} className="space-y-3 border-t border-stone-100 pt-4">
      <label htmlFor="invite_email" className="label">Invite someone</label>
      <div className="flex gap-2">
        <input
          id="invite_email"
          name="email"
          type="email"
          required
          className="input"
          placeholder="their@email.com"
        />
        <button type="submit" disabled={pending} className="btn-primary w-auto shrink-0 px-4">
          {pending ? "…" : "Invite"}
        </button>
      </div>
      {state.error && <p className="error">{state.error}</p>}
      {state.message && <p className="notice">{state.message}</p>}
    </form>
  );
}
