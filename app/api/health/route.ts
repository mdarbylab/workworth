import { createClient } from "@/lib/supabase/server";
import { trackException } from "@/lib/analytics/server";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 5000;

// Uptime probe for Netlify/external monitors: checks that the database
// answers. A bare catch here once reported "unreachable" for a
// permission-denied error (a missing grant on an RLS helper — see
// CLAUDE.md), which made a real outage much harder to diagnose than it
// needed to be.
//
// The Supabase client never rejects on a fetch-level failure (DNS, a
// connection refused, our own abort timeout below) — it always resolves
// with an `error` object carrying no SQLSTATE code, so a genuine Postgres
// error (which does have one) is distinguished from a connectivity failure
// by that alone. A connectivity failure is further split from our own
// timeout by elapsed time rather than by matching postgrest-js's internal
// error message, which isn't a stable thing to depend on — verified
// directly against this project's installed version, since the two didn't
// actually agree with what the library's own source suggested. The code is
// safe to expose on this public endpoint; the raw message isn't, so that
// only goes to the server log and analytics.
export async function GET() {
  const startedAt = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .limit(1)
      .abortSignal(AbortSignal.timeout(TIMEOUT_MS));
    const elapsed = Date.now() - startedAt;

    if (!error) {
      return Response.json(
        { ok: true, db: "ok", latencyMs: elapsed },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const db: "error" | "timeout" | "unreachable" = error.code
      ? "error"
      : elapsed >= TIMEOUT_MS - 250
        ? "timeout"
        : "unreachable";

    console.error("health check:", db, error.code, error.message);
    trackException(new Error(`health check: ${db}`), { source: "health-check", code: error.code || null });

    return Response.json(
      { ok: false, db, ...(error.code ? { code: error.code } : {}) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    // Unexpected — createClient() itself failing, etc. Keep the same shape.
    console.error("health check: unreachable (unexpected)", err);
    trackException(err, { source: "health-check" });
    return Response.json({ ok: false, db: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
