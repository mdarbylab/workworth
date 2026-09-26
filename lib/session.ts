import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export type SessionContext = {
  user: { id: string; email: string | null };
  membership: Pick<Tables<"memberships">, "id" | "role" | "organization_id" | "display_name"> | null;
  organization: Tables<"organizations"> | null;
  /** The person who created the business. Only they can delete it or remove anyone (SPEC §6). */
  isCreator: boolean;
  /**
   * Sees and edits everything in the business. On the free plan that is both
   * people — role separation is what an upgrade buys.
   */
  hasFullAccess: boolean;
  /** What to call this person on screen. Never their email address. */
  displayName: string;
};

/** Fallback for accounts that predate display names, so nothing renders blank. */
export function nameFromEmail(email: string | null | undefined): string {
  const local = (email ?? "").split("@")[0];
  if (!local) return "Someone";
  return local
    .replace(/[._+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("id, role, organization_id, display_name, organizations(*)")
    .eq("user_id", user.id)
    .is("removed_at", null)
    .not("accepted_at", "is", null)
    .maybeSingle();

  const organization = membership?.organizations ?? null;
  const isCreator = membership?.role === "owner";

  return {
    user: { id: user.id, email: user.email ?? null },
    membership: membership
      ? {
          id: membership.id,
          role: membership.role,
          organization_id: membership.organization_id,
          display_name: membership.display_name,
        }
      : null,
    organization,
    isCreator,
    // Mirrors auth_is_owner() in the database, which is what actually enforces it.
    hasFullAccess: isCreator || organization?.plan === "free",
    displayName:
      membership?.display_name?.trim() ||
      (typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name.trim()
        : "") ||
      nameFromEmail(user.email),
  };
}
