"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { sendMagicLink, signInWithPassword, type AuthState } from "../actions";

const initial: AuthState = {};

export function LoginForm({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, initial);
  const [mlState, mlAction, mlPending] = useActionState(sendMagicLink, initial);

  const submitted = pwState !== initial || mlState !== initial;
  const state = !submitted && initialError
    ? { error: initialError }
    : mode === "password" ? pwState : mlState;
  const pending = mode === "password" ? pwPending : mlPending;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Sign in</h1>

      <form action={mode === "password" ? pwAction : mlAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@example.com"
          />
        </div>

        {mode === "password" && (
          <div>
            <label htmlFor="password" className="label">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </div>
        )}

        {state.error && <p className="error">{state.error}</p>}
        {state.message && <p className="notice">{state.message}</p>}

        <button type="submit" disabled={pending} className="btn-primary">
          {pending
            ? "One moment…"
            : mode === "password"
              ? "Sign in"
              : "Email me a sign-in link"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "password" ? "magic" : "password")}
        className="w-full text-center text-sm text-emerald-800 hover:underline"
      >
        {mode === "password"
          ? "Use a magic link instead"
          : "Use a password instead"}
      </button>

      <p className="text-center text-sm text-stone-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-emerald-800 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
