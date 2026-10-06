import { formatDate } from "@/lib/dates";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

/**
 * Settings > Plan status line for a Pro org. `null` status covers no row yet
 * (never checked out). `cancelAt` is Stripe's `subscription.cancel_at` --
 * set whenever a cancellation is scheduled, trial or paid alike, and it's
 * not always equal to `currentPeriodEnd` (e.g. a trial cancellation is
 * scheduled for the trial's end, not a billing period's).
 */
export function subscriptionStatusLabel(
  status: SubscriptionStatus | null,
  currentPeriodEnd: string | null,
  cancelAt: string | null,
  tz: string,
): string {
  const endsAt = cancelAt ?? currentPeriodEnd;
  const until = endsAt ? formatDate(new Date(endsAt), tz) : null;
  const canceling = cancelAt !== null;

  if (!status) return "Pro";
  if (status === "trialing") {
    if (canceling) return until ? `Free trial — ends ${until}, won't continue to Pro` : "Free trial — won't continue to Pro";
    return until ? `Free trial — ends ${until}` : "Free trial";
  }
  if (status === "past_due") return "Pro — payment failed, update your card";
  if (status === "canceled") return "Pro — canceled";
  if (status === "incomplete" || status === "incomplete_expired" || status === "unpaid") {
    return "Pro — payment incomplete";
  }
  // active
  if (canceling) return until ? `Pro — ends ${until}` : "Pro — ending soon";
  return until ? `Pro — renews ${until}` : "Pro";
}
