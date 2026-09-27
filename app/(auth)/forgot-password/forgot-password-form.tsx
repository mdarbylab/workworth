"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, type AuthState } from "../actions";

const initial: AuthState = {};

export function ForgotPasswordForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  // Once we've sent the link, drop the form so a repeat submit can't be used
  // to probe whether an address has an account.
  const sent = !!state.message;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the email on your account and we&apos;ll send a link to set a new password.
        </p>
      </div>

      {sent ? (
        <p className="notice">{state.message}</p>
      ) : (
        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={defaultEmail}
              className="input"
              placeholder="you@example.com"
            />
          </div>

          {state.error && <p className="error">{state.error}</p>}

          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-ink-800 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
