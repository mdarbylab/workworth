import { createClient } from "@/lib/supabase/server";

export type Person = { userId: string; label: string };

/**
 * Members of the org, labeled for display. Auth emails are not readable from
 * the client, so we use "You", the invited email, or the role.
 */
export async function getPeople(orgId: string, meId: string): Promise<Person[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("user_id, role, invited_email")
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
          : m.invited_email ?? (m.role === "owner" ? "Owner" : "Teammate"),
    }));
}

/** Label for an entry's author; removed or deleted people show as "Former member". */
export function personLabel(people: Person[], userId: string | null): string {
  if (!userId) return "Former member";
  return people.find((p) => p.userId === userId)?.label ?? "Former member";
}
