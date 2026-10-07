import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { LandingPage } from "./landing-page";

export default async function RootPage() {
  const ctx = await getSessionContext();
  if (!ctx) return <LandingPage />;
  if (!ctx.organization) redirect("/onboarding");
  redirect("/today");
}
