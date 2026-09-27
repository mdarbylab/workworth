import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { Wordmark } from "@/components/wordmark";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set new password" };

// Reached from the "Reset your password" email link, which signs the browser
// into a recovery session via /auth/callback before landing here. This is
// deliberately not under app/(auth) — that layout bounces anyone who already
// has a session, which a recovery link always creates.
export default async function ResetPasswordPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <Wordmark stacked />
      </div>
      <div className="card w-full max-w-sm">
        <ResetPasswordForm />
      </div>
    </main>
  );
}
