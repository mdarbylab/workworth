import { describe, expect, it } from "vitest";
import { subscriptionStatusLabel } from "./billing";

const NY = "America/New_York";
const periodEnd = "2026-07-15T13:00:00.000Z"; // 2026-07-15 09:00 EDT
const trialEnd = "2026-07-10T13:00:00.000Z"; // a different date than periodEnd

describe("subscriptionStatusLabel", () => {
  it("renders a plain label when there's no subscription row yet", () => {
    expect(subscriptionStatusLabel(null, null, null, NY)).toBe("Pro");
  });

  it("renders trialing with the trial end date", () => {
    expect(subscriptionStatusLabel("trialing", periodEnd, null, NY)).toBe("Free trial — ends Wed, Jul 15");
  });

  it("renders trialing without a date if none is known", () => {
    expect(subscriptionStatusLabel("trialing", null, null, NY)).toBe("Free trial");
  });

  it("renders a canceled trial using cancel_at, not current_period_end", () => {
    // Stripe schedules a trial cancellation via cancel_at (the trial's own
    // end), which isn't always the same instant as current_period_end.
    expect(subscriptionStatusLabel("trialing", periodEnd, trialEnd, NY)).toBe(
      "Free trial — ends Fri, Jul 10, won't continue to Pro",
    );
  });

  it("renders a canceled trial with no known date", () => {
    expect(subscriptionStatusLabel("trialing", null, trialEnd, NY)).toBe(
      "Free trial — ends Fri, Jul 10, won't continue to Pro",
    );
  });

  it("renders active as a renewal date", () => {
    expect(subscriptionStatusLabel("active", periodEnd, null, NY)).toBe("Pro — renews Wed, Jul 15");
  });

  it("renders active-but-canceling as an end date from cancel_at", () => {
    expect(subscriptionStatusLabel("active", periodEnd, trialEnd, NY)).toBe("Pro — ends Fri, Jul 10");
  });

  it("renders past_due with a call to action", () => {
    expect(subscriptionStatusLabel("past_due", periodEnd, null, NY)).toBe(
      "Pro — payment failed, update your card",
    );
  });

  it("renders canceled plainly", () => {
    expect(subscriptionStatusLabel("canceled", periodEnd, null, NY)).toBe("Pro — canceled");
  });

  it("renders the incomplete states as payment incomplete", () => {
    for (const status of ["incomplete", "incomplete_expired", "unpaid"] as const) {
      expect(subscriptionStatusLabel(status, periodEnd, null, NY)).toBe("Pro — payment incomplete");
    }
  });
});
