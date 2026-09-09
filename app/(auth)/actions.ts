"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { safeNext } from "@/lib/safe-next";
import { track } from "@/lib/analytics/server";

export type AuthState = { error?: string; message?: string };

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  return { email, password, next };
}

async function callbackUrl(next: string) {
  const base = `${await getSiteUrl()}/auth/callback`;
  return next === "/" ? base : `${base}?next=${encodeURIComponent(next)}`;
}

export async function signInWithPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "That email and password don't match." };

  redirect(next);
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, password, next } = readCredentials(formData);
  if (!email) return { error: "Enter your email." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: await callbackUrl(next) },
  });
  if (error) return { error: error.message };
  if (data.user) track("signup", { userId: data.user.id }, { confirmed: !!data.session });

  if (!data.session) {
    return { message: `We sent a confirmation link to ${email}. Open it to finish signing up.` };
  }
  redirect(next === "/" ? "/onboarding" : next);
}

export async function sendMagicLink(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const { email, next } = readCredentials(formData);
  if (!email) return { error: "Enter your email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: await callbackUrl(next) },
  });
  if (error) return { error: error.message };

  return { message: `Check ${email} for a sign-in link.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
