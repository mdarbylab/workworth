import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";

export default async function RootPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!ctx.organization) redirect("/onboarding");
  redirect("/today");
}
