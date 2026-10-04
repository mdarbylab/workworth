import Stripe from "stripe";

// Lazy: most requests never touch Stripe, and constructing it eagerly would
// throw at import time in any environment missing the key (e.g. local dev
// before Stripe is configured, per CLAUDE.md "Verifying changes").
let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
    client = new Stripe(key);
  }
  return client;
}

export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY ?? "";
export const STRIPE_PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL ?? "";

export type BillingInterval = "month" | "year";

export function priceIdFor(interval: BillingInterval): string {
  return interval === "year" ? STRIPE_PRICE_ANNUAL : STRIPE_PRICE_MONTHLY;
}
