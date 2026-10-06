import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/server";
import { trackException } from "@/lib/analytics/server";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// The only writer of subscriptions/organizations.plan (see
// supabase/migrations/20261004010000_stripe_billing.sql). No user session
// exists here — Stripe calls this directly — so the signature check below is
// the entire authorization: once it passes, apply_stripe_subscription_event
// is trusted to run with elevated privilege via its `anon` grant.
//
// Always 200 on anything we choose not to handle: Stripe retries on any
// non-2xx, and there's nothing to retry for an event type we don't act on.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return Response.json({ ok: false }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await request.text();
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    console.error("stripe webhook: bad signature", err);
    return Response.json({ ok: false }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const organizationId = session.client_reference_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        if (!organizationId || typeof customerId !== "string" || typeof subscriptionId !== "string") break;

        const subscription = await stripe().subscriptions.retrieve(subscriptionId);
        await applyEvent(supabase, subscription, customerId, organizationId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        if (typeof customerId !== "string") break;
        await applyEvent(supabase, subscription, customerId, null);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook: failed to apply event", event.type, err);
    trackException(err, { source: "stripe-webhook", event_type: event.type });
    return Response.json({ ok: false }, { status: 500 });
  }

  return Response.json({ ok: true });
}

async function applyEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscription: Stripe.Subscription,
  stripeCustomerId: string,
  organizationId: string | null,
) {
  const item = subscription.items.data[0];
  const { error } = await supabase.rpc("apply_stripe_subscription_event", {
    p_stripe_customer_id: stripeCustomerId,
    p_stripe_subscription_id: subscription.id,
    p_status: subscription.status,
    p_current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : undefined,
    p_cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : undefined,
    p_price_interval: item?.price.recurring?.interval,
    ...(organizationId ? { p_organization_id: organizationId } : {}),
  });
  if (error) throw error;
}
