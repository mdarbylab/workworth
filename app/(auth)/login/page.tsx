import type { Metadata } from "next";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next, deleted } = await searchParams;
  const linkError =
    error === "link"
      ? "That sign-in link is invalid or has expired. Request a new one below."
      : undefined;
  const notice = deleted === "1" ? "Your account was deleted." : undefined;

  return <LoginForm initialError={linkError} initialMessage={notice} next={safeNext(next)} />;
}
