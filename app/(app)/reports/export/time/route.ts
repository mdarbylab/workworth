import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { resolvePeriod } from "@/lib/periods";
import { csvResponse, toCsv } from "@/lib/csv";
import { dateKey, timeKey } from "@/lib/dates";
import { getPeople, personLabel } from "@/lib/people";

// Time entries CSV for the period (SPEC §5.5). RLS scopes rows to what the
// signed-in user may see; times are rendered in the org timezone (§13.8).
export async function GET(request: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx?.organization) return new Response("Unauthorized", { status: 401 });
  const tz = ctx.organization.timezone;

  const sp = request.nextUrl.searchParams;
  const period = resolvePeriod(
    { period: sp.get("period") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined },
    tz,
  );

  const supabase = await createClient();
  const [{ data: entries }, people] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id, user_id, started_at, stopped_at, duration_seconds, notes, source, jobs(name, clients(name))")
      .not("stopped_at", "is", null)
      .gte("started_at", period.from.toISOString())
      .lt("started_at", period.to.toISOString())
      .order("started_at", { ascending: true }),
    getPeople(ctx.organization.id, ctx.user.id),
  ]);

  const ids = (entries ?? []).map((e) => e.id);
  const edited = new Set<string>();
  if (ids.length) {
    const { data: events } = await supabase
      .from("audit_events")
      .select("record_id, before")
      .eq("table_name", "time_entries")
      .eq("action", "update")
      .in("record_id", ids);
    for (const ev of events ?? []) {
      const before = ev.before as { stopped_at?: string | null } | null;
      if (before && before.stopped_at !== null) edited.add(ev.record_id);
    }
  }

  const rows = (entries ?? []).map((e) => {
    const start = new Date(e.started_at);
    const stop = new Date(e.stopped_at!);
    const secs = e.duration_seconds ?? 0;
    return [
      dateKey(start, tz),
      timeKey(start, tz),
      dateKey(stop, tz),
      timeKey(stop, tz),
      (secs / 3600).toFixed(2),
      e.jobs?.name ?? "",
      e.jobs?.clients?.name ?? "",
      personLabel(people, e.user_id),
      e.source,
      edited.has(e.id) ? "yes" : "no",
      e.notes ?? "",
    ];
  });

  const csv = toCsv(
    ["Date", "Start", "Stop date", "Stop", "Hours", "Job", "Client", "Person", "Source", "Edited", "Notes"],
    rows,
  );
  return csvResponse(`workworth-time-${period.fromKey}-to-${period.toKey}.csv`, csv);
}
