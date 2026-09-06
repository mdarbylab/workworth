import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  const org = ctx.organization;

  const supabase = await createClient();
  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", org.id)
    .is("removed_at", null)
    .not("accepted_at", "is", null);
  const seatsUsed = count ?? 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="card space-y-3">
        <h2 className="font-semibold">Business</h2>
        <Row label="Name" value={org.name} />
        <Row label="Timezone" value={org.timezone} />
        <Row label="Currency" value={org.currency} />
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Account</h2>
        <Row label="Email" value={ctx.user.email ?? "—"} />
        <Row label="Role" value={ctx.membership?.role === "owner" ? "Owner" : "Member"} />
        <form action={signOut}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Plan</h2>
        <p className="text-sm text-stone-700">
          Free — {seatsUsed} of {org.seat_limit} seats used
        </p>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
