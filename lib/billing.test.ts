import { describe, expect, it } from "vitest";
import { subscriptionStatusLabel } from "./billing";

const NY = "America/New_York";
const periodEnd = "2026-07-15T13:00:00.000Z"; // 2026-07-15 09:00 EDT

describe("subscriptionStatusLabel", () => {
  it("renders a plain label when there's no subscription row yet", () => {
    expect(subscriptionStatusLabel(null, null, false, NY)).toBe("Pro");
  });

  it("renders trialing with the trial end date", () => {
    expect(subscriptionStatusLabel("trialing", periodEnd, false, NY)).toBe("Free trial — ends Wed, Jul 15");
  });

  it("renders trialing without a date if none is known", () => {
    expect(subscriptionStatusLabel("trialing", null, false, NY)).toBe("Free trial");
  });

  it("renders active as a renewal date", () => {
    expect(subscriptionStatusLabel("active", periodEnd, false, NY)).toBe("Pro — renews Wed, Jul 15");
  });

  it("renders active-but-canceling as an end date", () => {
    expect(subscriptionStatusLabel("active", periodEnd, true, NY)).toBe("Pro — ends Wed, Jul 15");
  });

  it("renders past_due with a call to action", () => {
    expect(subscriptionStatusLabel("past_due", periodEnd, false, NY)).toBe(
      "Pro — payment failed, update your card",
    );
  });

  it("renders canceled plainly", () => {
    expect(subscriptionStatusLabel("canceled", periodEnd, false, NY)).toBe("Pro — canceled");
  });

  it("renders the incomplete states as payment incomplete", () => {
    for (const status of ["incomplete", "incomplete_expired", "unpaid"] as const) {
      expect(subscriptionStatusLabel(status, periodEnd, false, NY)).toBe("Pro — payment incomplete");
    }
  });
});
