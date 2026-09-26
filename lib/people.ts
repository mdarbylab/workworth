import { createClient } from "@/lib/supabase/server";
import { nameFromEmail } from "@/lib/session";

export type Person = { userId: string; label: string };

/**
 * Members of the org, labeled for display. Auth emails are not readable from
 * the client, so the membership's display name is the source of truth; older
 * accounts that predate the field fall back to a name built from the invite.
 */
export async function getPeople(orgId: string, meId: string): Promise<Person[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, role, invited_email, display_name")
    .eq("organization_id", orgId)
    .is("removed_at", null)
    .not("user_id", "is", null)
    .order("created_at");

  return (data ?? [])
    .filter((m): m is typeof m & { user_id: string } => !!m.user_id)
    .map((m) => ({
      userId: m.user_id,
      label:
        m.user_id === meId
          ? "You"
          : m.display_name?.trim() || nameFromEmail(m.invited_email) || "Teammate",
    }));
}

/** Label for an entry's author; removed or deleted people show as "Former member". */
export function personLabel(people: Person[], userId: string | null): string {
  if (!userId) return "Former member";
  return people.find((p) => p.userId === userId)?.label ?? "Former member";
}
