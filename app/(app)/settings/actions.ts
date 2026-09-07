"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";

export type SettingsState = { error?: string; message?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireMembership() {
  const ctx = await getSessionContext();
  if (!ctx?.organization || !ctx.membership) redirect("/onboarding");
  return { ...ctx, organization: ctx.organization, membership: ctx.membership };
}

function validTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ---------- Business ----------

export async function updateBusiness(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requireMembership();
  if (ctx.membership.role !== "owner") return { error: "Only the owner can change business settings." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give your business a name." };
  if (name.length > 120) return { error: "Keep the name under 120 characters." };
  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!validTimezone(timezone)) return { error: "Pick a valid timezone." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name, timezone })
    .eq("id", ctx.organization.id);
  if (error) return { error: "Couldn't save. Please try again." };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}

// ---------- People ----------

export async function inviteMember(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requireMembership();
  if (ctx.membership.role !== "owner") return { error: "Only the owner can invite people." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL.test(email)) return { error: "Enter a valid email address." };
  if (email === (ctx.user.email ?? "").toLowerCase()) return { error: "That's your own email." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("memberships")
    .select("id")
    .eq("organization_id", ctx.organization.id)
    .is("removed_at", null)
    .ilike("invited_email", email)
    .limit(1)
    .maybeSingle();
  if (existing) return { error: `${email} has already been invited.` };

  // The memberships_invite_limit trigger refuses the insert when the plan's
  // seats are all taken (SPEC §6, acceptance #4).
  const { error } = await supabase.from("memberships").insert({
    organization_id: ctx.organization.id,
    invited_email: email,
    role: "member",
  });
  if (error) {
    if (error.code === "23514" || error.message.includes("seat limit")) {
      return { error: `The free plan includes ${ctx.organization.seat_limit} people. Remove someone to free a seat, or upgrade.` };
    }
    return { error: "Couldn't create the invite. Please try again." };
  }

  revalidatePath("/settings");
  return { message: `Invite created for ${email}. Share the link below.` };
}

/** Remove a member or cancel a pending invite. History stays attributed (§6). */
export async function removeMember(formData: FormData) {
  const ctx = await requireMembership();
  if (ctx.membership.role !== "owner") return;
  const id = String(formData.get("id") ?? "");
  if (!id || id === ctx.membership.id) return;

  const supabase = await createClient();
  await supabase
    .from("memberships")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", ctx.organization.id)
    .is("removed_at", null);

  revalidatePath("/", "layout");
}

// ---------- Account ----------

export async function changePassword(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireMembership();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { message: "Password updated." };
}

export async function deleteAccount(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_account");
  if (error) {
    if (error.message.includes("other people")) {
      return { error: "Remove the other people from your business first, then delete your account." };
    }
    return { error: "Couldn't delete your account. Please try again." };
  }

  await supabase.auth.signOut().catch(() => undefined);
  redirect("/login?deleted=1");
}
