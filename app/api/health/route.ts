import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Uptime probe for Netlify/external monitors: checks that the database answers.
export async function GET() {
  const startedAt = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("organizations").select("id", { count: "exact", head: true }).limit(1);
    if (error) throw error;
    return Response.json({ ok: true, db: "ok", latencyMs: Date.now() - startedAt }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
