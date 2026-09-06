import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const linkError =
    error === "link"
      ? "That sign-in link is invalid or has expired. Request a new one below."
      : undefined;

  return <LoginForm initialError={linkError} />;
}
