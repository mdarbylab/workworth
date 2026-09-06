import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type SessionContext = {
  user: { id: string; email: string | null };
  membership: Pick<Tables<"memberships">, "id" | "role" | "organization_id"> | null;
  organization: Tables<"organizations"> | null;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role, organization_id, organizations(*)")
    .eq("user_id", user.id)
    .is("removed_at", null)
    .not("accepted_at", "is", null)
    .maybeSingle();

  return {
    user: { id: user.id, email: user.email ?? null },
    membership: membership
      ? { id: membership.id, role: membership.role, organization_id: membership.organization_id }
      : null,
    organization: membership?.organizations ?? null,
  };
}
