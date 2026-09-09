import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { formatCents } from "@/lib/calc";
import { CATEGORY_LABELS, isExpenseCategory, type ExpenseCategory } from "@/lib/expenses";
import type { Json } from "@/lib/supabase/types";
import { ConfirmDelete } from "@/components/confirm-delete";
import { ExpenseForm } from "../expense-form";
import { deleteExpense, updateExpense } from "../actions";

export const metadata: Metadata = { title: "Edit expense" };

type Snapshot = {
  amount_cents: number;
  spent_on: string;
  job_id: string | null;
  category: ExpenseCategory;
  description: string | null;
};

function asSnapshot(json: Json | null): Snapshot | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, Json | undefined>;
  if (typeof o.amount_cents !== "number" || typeof o.spent_on !== "string" || !isExpenseCategory(o.category)) return null;
  return {
    amount_cents: o.amount_cents,
    spent_on: o.spent_on,
    job_id: typeof o.job_id === "string" ? o.job_id : null,
    category: o.category,
    description: typeof o.description === "string" ? o.description : null,
  };
}

export default async function EditExpensePage({ params }: PageProps<"/expenses/[id]">) {
  const { id } = await params;
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  const tz = ctx.organization.timezone;

  const supabase = await createClient();
  const [{ data: expense }, { data: jobs }, { data: events }] = await Promise.all([
    supabase.from("expenses").select("*").eq("id", id).maybeSingle(),
    supabase.from("jobs").select("id, name, status").order("name"),
    supabase
      .from("audit_events")
      .select("id, action, before, after, created_at")
      .eq("table_name", "expenses")
      .eq("record_id", id)
      .eq("action", "update")
      .order("created_at", { ascending: true }),
  ]);
  if (!expense) notFound();

  const jobName = (jobId: string | null) =>
    jobId === null ? "No job" : (jobs?.find((j) => j.id === jobId)?.name ?? "Unknown job");
  const pickable = (jobs ?? []).filter((j) => j.status === "active" || j.id === expense.job_id);

  // §8.4: original values come from the first update's "before" snapshot.
  const edits = events ?? [];
  const original = edits.length ? asSnapshot(edits[0].before) : null;
  const describe = (s: Snapshot) =>
    `${formatCents(s.amount_cents)} · ${CATEGORY_LABELS[s.category]} · ${s.spent_on} · ${jobName(s.job_id)}${s.description ? ` · “${s.description}”` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit expense</h1>
        {edits.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">Edited</span>
        )}
      </div>

      <div className="card">
        <ExpenseForm
          jobs={pickable}
          action={updateExpense}
          expenseId={expense.id}
          submitLabel="Save changes"
          cancelHref="/expenses"
          defaults={{
            amount: (expense.amount_cents / 100).toFixed(2),
            spentOn: expense.spent_on,
            jobId: expense.job_id ?? "",
            category: expense.category,
            description: expense.description ?? "",
          }}
        />
      </div>

      {original && (
        <section className="card space-y-3">
          <h2 className="font-semibold">History</h2>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Original</p>
            <p className="text-sm">{describe(original)}</p>
          </div>
          <ol className="space-y-2 border-t border-stone-100 pt-3">
            {edits.map((e, i) => {
              const after = asSnapshot(e.after);
              return (
                <li key={e.id} className="text-sm">
                  <p className="text-xs text-stone-500">
                    Edit {i + 1} · {formatDateTime(new Date(e.created_at), tz)}
                  </p>
                  {after && <p>{describe(after)}</p>}
                </li>
              );
            })}
          </ol>
          <p className="text-xs text-stone-400">Nothing is overwritten — every change is kept.</p>
        </section>
      )}

      <ConfirmDelete
        action={deleteExpense}
        id={expense.id}
        label="Delete expense"
        message="Delete this expense? The change is recorded in history."
      />
    </div>
  );
}
