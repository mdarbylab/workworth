"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { parseDollars } from "@/lib/calc";
import { track } from "@/lib/analytics/server";

export type OnboardingState = { error?: string };

const DEFAULT_TIMEZONE = "America/New_York";

function normalizeTimezone(raw: string) {
  if (!raw) return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: raw });
    return raw;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export async function createOrganization(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give your business a name." };
  if (name.length > 120) return { error: "That name is a bit long — keep it under 120 characters." };
  const timezone = normalizeTimezone(String(formData.get("timezone") ?? ""));

  const supabase = await createClient();
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    org_name: name,
    org_timezone: timezone,
  });
  if (error) {
    if (error.message.includes("already belongs")) redirect("/onboarding");
    return { error: "Couldn't create your business. Please try again." };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (user) track("org_created", { userId: user.id, organizationId: orgId }, { timezone });

  redirect("/onboarding");
}

export async function createFirstJob(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!ctx.membership) redirect("/onboarding");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "What should we call this job?" };

  const billingType = formData.get("billing_type") === "fixed" ? "fixed" : "hourly";
  const cents = parseDollars(String(formData.get("amount") ?? ""));
  if (cents !== null && Number.isNaN(cents)) {
    return { error: "Enter a valid amount, or leave it blank." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").insert({
    organization_id: ctx.membership.organization_id,
    name,
    billing_type: billingType,
    hourly_rate_cents: billingType === "hourly" ? cents : null,
    fixed_price_cents: billingType === "fixed" ? cents : null,
  });
  if (error) return { error: "Couldn't save that job. Please try again." };

  track("job_created", { userId: ctx.user.id, organizationId: ctx.membership.organization_id }, {
    billing_type: billingType,
    onboarding: true,
  });

  redirect("/today");
}
