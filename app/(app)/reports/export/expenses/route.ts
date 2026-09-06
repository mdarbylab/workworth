import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { resolvePeriod } from "@/lib/periods";
import { csvResponse, toCsv } from "@/lib/csv";
import { CATEGORY_LABELS } from "@/lib/expenses";
import { getPeople, personLabel } from "@/lib/people";

// Expenses CSV for the period (SPEC §5.5). RLS scopes rows to what the
// signed-in user may see.
export async function GET(request: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx?.organization) return new Response("Unauthorized", { status: 401 });

  const sp = request.nextUrl.searchParams;
  const period = resolvePeriod(
    { period: sp.get("period") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined },
    ctx.organization.timezone,
  );

  const supabase = await createClient();
  const [{ data: expenses }, people] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, user_id, spent_on, amount_cents, category, description, jobs(name, clients(name))")
      .gte("spent_on", period.fromKey)
      .lte("spent_on", period.toKey)
      .order("spent_on", { ascending: true })
      .order("created_at", { ascending: true }),
    getPeople(ctx.organization.id, ctx.user.id),
  ]);

  const rows = (expenses ?? []).map((x) => [
    x.spent_on,
    (x.amount_cents / 100).toFixed(2),
    CATEGORY_LABELS[x.category],
    x.jobs?.name ?? "",
    x.jobs?.clients?.name ?? "",
    personLabel(people, x.user_id),
    x.description ?? "",
  ]);

  const csv = toCsv(["Date", "Amount", "Category", "Job", "Client", "Person", "Description"], rows);
  return csvResponse(`workworth-expenses-${period.fromKey}-to-${period.toKey}.csv`, csv);
}
