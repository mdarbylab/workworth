"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { getSiteUrl } from "@/lib/site-url";
import { stripe, priceIdFor, type BillingInterval } from "@/lib/stripe/server";
import { trackException } from "@/lib/analytics/server";

export type BillingState = { error?: string };

async function requireCreator() {
  const ctx = await getSessionContext();
  if (!ctx?.organization || !ctx.membership) redirect("/onboarding");
  if (!ctx.isCreator) return { error: "Only the person who created this business can manage billing." };
  return { ...ctx, organization: ctx.organization };
}

const TRIAL_DAYS = 14;

export async function createCheckoutSession(_prev: BillingState, formData: FormData): Promise<BillingState> {
  const ctx = await requireCreator();
  if ("error" in ctx) return ctx;

  const interval: BillingInterval = formData.get("interval") === "year" ? "year" : "month";
  const price = priceIdFor(interval);
  if (!price) return { error: "Billing isn't set up yet. Try again shortly." };

  const siteUrl = await getSiteUrl();

  // redirect() throws to unwind the request; it must not be inside the try
  // below, or this catch would swallow that throw as a generic Stripe error.
  let url: string | null;
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: ctx.organization.id,
      customer_email: ctx.user.email ?? undefined,
      subscription_data: { trial_period_days: TRIAL_DAYS },
      success_url: `${siteUrl}/settings?upgraded=1`,
      cancel_url: `${siteUrl}/settings`,
    });
    url = session.url;
  } catch (err) {
    trackException(err, { source: "create-checkout-session" });
    return { error: "Couldn't start checkout. Please try again." };
  }

  if (!url) return { error: "Couldn't start checkout. Please try again." };
  redirect(url);
}

export async function createPortalSession(): Promise<void> {
  const ctx = await requireCreator();
  if ("error" in ctx) return;

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("organization_id", ctx.organization.id)
    .maybeSingle();
  if (!subscription?.stripe_customer_id) return;

  const siteUrl = await getSiteUrl();

  let url: string | null;
  try {
    const portalSession = await stripe().billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl}/settings`,
    });
    url = portalSession.url;
  } catch (err) {
    trackException(err, { source: "create-portal-session" });
    return;
  }

  redirect(url);
}
