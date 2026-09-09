"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type AuthState } from "../actions";

const initial: AuthState = {};

export function SignupForm({ next = "/", defaultEmail = "" }: { next?: string; defaultEmail?: string }) {
  const [state, action, pending] = useActionState(signUp, initial);
  const loginHref = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-stone-500">Free for up to 2 people. No trial, no card.</p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
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
        <div>
          <label htmlFor="password" className="label">Password</label>
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

        {state.error && <p className="error">{state.error}</p>}
        {state.message && <p className="notice">{state.message}</p>}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href={loginHref} className="font-medium text-emerald-800 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
