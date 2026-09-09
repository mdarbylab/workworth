"use client";

import { useActionState, useState } from "react";
import { changePassword, type SettingsState } from "./actions";

const initial: SettingsState = {};

export function PasswordForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(changePassword, initial);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-emerald-800 hover:underline">
        Change password
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-lg bg-stone-50 p-3">
      <div>
        <label htmlFor="new_password" className="label">New password</label>
        <input id="new_password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      <div>
        <label htmlFor="confirm_password" className="label">Confirm</label>
        <input id="confirm_password" name="confirm" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      {state.error && <p className="error">{state.error}</p>}
      {state.message && <p className="notice">{state.message}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary w-auto px-4">Cancel</button>
        <button type="submit" disabled={pending} className="btn-primary w-auto px-4">
          {pending ? "Saving…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
