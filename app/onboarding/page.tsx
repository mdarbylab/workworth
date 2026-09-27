import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { Wordmark } from "@/components/wordmark";
import { OrgForm } from "./org-form";
import { JobForm } from "./job-form";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");

  let step: "org" | "job" = "org";

  if (ctx.organization) {
    const supabase = await createClient();
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organization.id);
    if ((count ?? 0) > 0) redirect("/today");
    step = "job";
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <Wordmark stacked />
        <p className="mt-1 text-sm text-slate-500">
          {step === "org" ? "Step 2 of 3" : "Step 3 of 3"}
        </p>
      </div>
      <div className="card w-full max-w-sm">
        {step === "org" ? <OrgForm /> : <JobForm businessName={ctx.organization!.name} />}
      </div>
    </main>
  );
}
