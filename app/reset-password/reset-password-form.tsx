"use client";

import { useActionState } from "react";
import { setNewPassword, type ResetPasswordState } from "./actions";

const initial: ResetPasswordState = {};

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(setNewPassword, initial);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
      </div>

      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="password" className="label">New password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input"
          />
        </div>

        {state.error && <p className="error">{state.error}</p>}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Set new password"}
        </button>
      </form>
    </div>
  );
}
