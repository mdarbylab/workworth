"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type SettingsState } from "./actions";

const initial: SettingsState = {};

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, initial);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-red-700 hover:underline">
        Delete my account…
      </button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div>
        <label htmlFor="confirm_delete" className="label">Type DELETE to confirm</label>
        <input id="confirm_delete" name="confirm" type="text" autoComplete="off" required className="input" placeholder="DELETE" />
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary w-auto px-4">Cancel</button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-auto items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete account"}
        </button>
      </div>
    </form>
  );
}
