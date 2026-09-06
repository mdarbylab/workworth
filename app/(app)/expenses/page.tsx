import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { dateKey, formatDayHeading } from "@/lib/dates";
import { formatCents } from "@/lib/calc";
import { CATEGORY_LABELS, formatMonth } from "@/lib/expenses";
import { getPeople, personLabel } from "@/lib/people";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  const tz = ctx.organization.timezone;

  const supabase = await createClient();
  const [{ data: expenses }, people] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, user_id, job_id, amount_cents, spent_on, category, description, jobs(name)")
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300),
    getPeople(ctx.organization.id, ctx.user.id),
  ]);

  // §8.4: mark expenses that have been edited.
  const ids = (expenses ?? []).map((x) => x.id);
  const edited = new Set<string>();
  if (ids.length) {
    const { data: events } = await supabase
      .from("audit_events")
      .select("record_id")
      .eq("table_name", "expenses")
      .eq("action", "update")
      .in("record_id", ids);
    for (const ev of events ?? []) edited.add(ev.record_id);
  }

  // Month total at top (§5.4): the current month in the org's timezone.
  const monthKey = dateKey(new Date(), tz).slice(0, 7);
  const monthTotal = (expenses ?? [])
    .filter((x) => x.spent_on.startsWith(monthKey))
    .reduce((s, x) => s + x.amount_cents, 0);

  const groups = new Map<string, NonNullable<typeof expenses>>();
  for (const x of expenses ?? []) {
    const list = groups.get(x.spent_on);
    if (list) list.push(x);
    else groups.set(x.spent_on, [x]);
  }
  const showPerson = people.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Expenses</h1>
        <Link href="/expenses/new" className="btn-primary w-auto px-4 py-2 text-sm">+ Add expense</Link>
      </div>

      <div className="card flex items-baseline justify-between">
        <span className="text-sm text-stone-600">{formatMonth(monthKey)}</span>
        <span className="text-2xl font-semibold tabular-nums">{formatCents(monthTotal)}</span>
      </div>

      {groups.size === 0 ? (
        <div className="card space-y-2 text-center">
          <p className="text-stone-600">No expenses yet.</p>
          <p className="text-sm text-stone-500">Materials, fuel, tools — anything you spend to do the work.</p>
        </div>
      ) : (
        Array.from(groups.entries()).map(([key, list]) => {
          const dayTotal = list.reduce((s, x) => s + x.amount_cents, 0);
          return (
            <section key={key} className="space-y-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-semibold">{formatDayHeading(key, tz)}</h2>
                <span className="text-sm tabular-nums text-stone-500">{formatCents(dayTotal)}</span>
              </div>
              <ul className="card divide-y divide-stone-100 p-0">
                {list.map((x) => (
                  <li key={x.id}>
                    <Link href={`/expenses/${x.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-stone-50">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <span className="truncate">{x.description || CATEGORY_LABELS[x.category]}</span>
                          {edited.has(x.id) && (
                            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">Edited</span>
                          )}
                        </p>
                        <p className="truncate text-xs text-stone-500">
                          {CATEGORY_LABELS[x.category]}
                          {x.jobs?.name ? ` · ${x.jobs.name}` : " · No job"}
                          {showPerson && ` · ${personLabel(people, x.user_id)}`}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCents(x.amount_cents)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
