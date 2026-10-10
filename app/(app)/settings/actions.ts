"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { track } from "@/lib/analytics/server";
import { parseDollars } from "@/lib/calc";

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
  // On the free plan both people are peers, so both may edit the business (§6).
  if (!ctx.hasFullAccess) return { error: "You don't have access to change business settings." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give your business a name." };
  if (name.length > 120) return { error: "Keep the name under 120 characters." };
  const timezone = String(formData.get("timezone") ?? "").trim();
  if (!validTimezone(timezone)) return { error: "Pick a valid timezone." };

  // Optional letterhead details for client reports (SPEC 5.8).
  const address = String(formData.get("address") ?? "").trim().slice(0, 300) || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim().toLowerCase() || null;
  const contactPhone = String(formData.get("contact_phone") ?? "").trim().slice(0, 40) || null;
  if (contactEmail && !EMAIL.test(contactEmail)) return { error: "Enter a valid contact email, or leave it blank." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      timezone,
      address,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    })
    .eq("id", ctx.organization.id);
  if (error) return { error: "Couldn't save. Please try again." };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}

/**
 * The mileage rate (Settings): deliberately a plain editable field, never
 * re-derived from a hardcoded "current IRS rate" in code, since that rate
 * changes every year and a hardcoded value would silently go stale.
 */
export async function updateMileageRate(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requireMembership();
  if (!ctx.hasFullAccess) return { error: "You don't have access to change this." };

  const cents = parseDollars(String(formData.get("mileage_rate") ?? ""));
  if (cents === null || Number.isNaN(cents)) return { error: "Enter a rate per mile." };
  if (cents <= 0) return { error: "Rate must be more than zero." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ mileage_rate_cents: cents })
    .eq("id", ctx.organization.id);
  if (error) return { error: "Couldn't save. Please try again." };

  revalidatePath("/", "layout");
  return { message: "Saved." };
}

// ---------- People ----------

export async function inviteMember(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requireMembership();
  if (!ctx.hasFullAccess) return { error: "You don't have access to invite people." };

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
      track("seat_limit_hit", { userId: ctx.user.id, organizationId: ctx.organization.id }, {
        seat_limit: ctx.organization.seat_limit,
      });
      const upgradeHint = ctx.organization.plan === "free" ? " Remove someone to free a seat, or upgrade." : " Remove someone to free a seat.";
      return { error: `Your plan includes ${ctx.organization.seat_limit} people.${upgradeHint}` };
    }
    return { error: "Couldn't create the invite. Please try again." };
  }

  track("member_invited", { userId: ctx.user.id, organizationId: ctx.organization.id });
  revalidatePath("/settings");
  return { message: `Invite created for ${email}. Share the link below.` };
}

/**
 * Remove a member or cancel a pending invite. History stays attributed (§6).
 *
 * Peers cannot evict each other: only the person who created the business can
 * remove anyone. The memberships_guard_update trigger enforces the same rule.
 */
export async function removeMember(formData: FormData) {
  const ctx = await requireMembership();
  if (!ctx.isCreator) return;
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

/** Your own name, as your teammate sees it. Anyone can change their own. */
export async function updateDisplayName(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const ctx = await requireMembership();
  const name = String(formData.get("display_name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Enter the name your teammates should see." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .update({ display_name: name })
    .eq("id", ctx.membership.id);
  if (error) return { error: "Couldn't save your name. Please try again." };

  revalidatePath("/", "layout");
  return { message: "Saved." };
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
