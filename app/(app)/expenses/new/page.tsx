import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { dateKey } from "@/lib/dates";
import { ExpenseForm } from "../expense-form";
import { createExpense } from "../actions";

export const metadata: Metadata = { title: "Add expense" };

export default async function NewExpensePage({ searchParams }: PageProps<"/expenses/new">) {
  const { job } = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");

  const supabase = await createClient();
  const { data: jobs } = await supabase.from("jobs").select("id, name, status").eq("status", "active").order("name");
  const requestedJob = typeof job === "string" ? job : "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Add expense</h1>
      <div className="card">
        <ExpenseForm
          jobs={jobs ?? []}
          action={createExpense}
          submitLabel="Save expense"
          cancelHref="/expenses"
          defaults={{
            amount: "",
            spentOn: dateKey(new Date(), ctx.organization.timezone),
            jobId: requestedJob,
            category: "materials",
            description: "",
          }}
        />
      </div>
    </div>
  );
}
