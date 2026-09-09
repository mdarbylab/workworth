import type { Metadata } from "next";
import { safeNext } from "@/lib/safe-next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next, email } = await searchParams;
  return <SignupForm next={safeNext(next)} defaultEmail={typeof email === "string" ? email : ""} />;
}
