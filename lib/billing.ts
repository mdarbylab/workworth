import { formatDate } from "@/lib/dates";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid";

/** Settings > Plan status line for a Pro org. `null` covers no row yet (never checked out). */
export function subscriptionStatusLabel(
  status: SubscriptionStatus | null,
  currentPeriodEnd: string | null,
  cancelAtPeriodEnd: boolean,
  tz: string,
): string {
  const until = currentPeriodEnd ? formatDate(new Date(currentPeriodEnd), tz) : null;

  if (!status) return "Pro";
  if (status === "trialing") return until ? `Free trial — ends ${until}` : "Free trial";
  if (status === "past_due") return "Pro — payment failed, update your card";
  if (status === "canceled") return "Pro — canceled";
  if (status === "incomplete" || status === "incomplete_expired" || status === "unpaid") {
    return "Pro — payment incomplete";
  }
  // active
  if (cancelAtPeriodEnd) return until ? `Pro — ends ${until}` : "Pro — ending soon";
  return until ? `Pro — renews ${until}` : "Pro";
}
