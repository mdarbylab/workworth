import { describe, expect, it } from "vitest";
import {
  effectiveRateCents,
  formatDuration,
  formatRate,
  profitCents,
  revenueCents,
  roundSeconds,
  roundingConfigFor,
} from "./calc";

describe("revenueCents", () => {
  it("computes hourly revenue as hours times rate, unrounded hours", () => {
    // $75/hr for 2h 30m (9000s) = $187.50 -> 18750 cents.
    expect(revenueCents({ billing_type: "hourly", hourly_rate_cents: 7_500, fixed_price_cents: null }, 9_000)).toBe(
      18_750,
    );
  });

  it("rounds hourly revenue to the nearest cent", () => {
    // $100/hr for 1234 seconds = 100 * 1234/3600 = $34.2777... -> 3428 cents.
    expect(revenueCents({ billing_type: "hourly", hourly_rate_cents: 10_000, fixed_price_cents: null }, 1_234)).toBe(
      3_428,
    );
  });

  it("is zero for hourly work with no seconds tracked", () => {
    expect(revenueCents({ billing_type: "hourly", hourly_rate_cents: 7_500, fixed_price_cents: null }, 0)).toBe(0);
  });

  it("treats a null hourly rate as zero", () => {
    expect(revenueCents({ billing_type: "hourly", hourly_rate_cents: null, fixed_price_cents: null }, 3_600)).toBe(0);
  });

  it("returns the fixed price regardless of seconds tracked", () => {
    expect(revenueCents({ billing_type: "fixed", hourly_rate_cents: null, fixed_price_cents: 50_000 }, 1)).toBe(
      50_000,
    );
    expect(revenueCents({ billing_type: "fixed", hourly_rate_cents: null, fixed_price_cents: 50_000 }, 999_999)).toBe(
      50_000,
    );
  });

  it("treats a null fixed price as zero", () => {
    expect(revenueCents({ billing_type: "fixed", hourly_rate_cents: null, fixed_price_cents: null }, 3_600)).toBe(0);
  });
});

describe("profitCents", () => {
  it("subtracts expenses from revenue", () => {
    expect(profitCents(10_000, 4_000)).toBe(6_000);
  });

  it("can go negative when expenses exceed revenue", () => {
    expect(profitCents(1_000, 5_000)).toBe(-4_000);
  });

  it("is zero when revenue equals expenses", () => {
    expect(profitCents(3_000, 3_000)).toBe(0);
  });

  it("equals revenue when there are no expenses", () => {
    expect(profitCents(7_500, 0)).toBe(7_500);
  });
});

describe("effectiveRateCents", () => {
  it("is null at zero seconds", () => {
    expect(effectiveRateCents(0, 0)).toBeNull();
  });

  it("is null for a few seconds, even with real profit", () => {
    // The bug this guards against: a $100 job tracked for 4 seconds used to
    // show $90,000/hr next to a duration that displays as "0m".
    expect(effectiveRateCents(10_000, 4)).toBeNull();
  });

  it("is null right up to the minute boundary", () => {
    expect(effectiveRateCents(10_000, 59)).toBeNull();
  });

  it("is a real number as soon as a full minute has tracked", () => {
    // $60 profit over exactly one minute = $3,600/hr.
    expect(effectiveRateCents(6_000, 60)).toBe(360_000);
  });

  it("computes the ordinary case correctly", () => {
    // $150 profit over exactly 2 hours = $75/hr.
    expect(effectiveRateCents(15_000, 7_200)).toBe(7_500);
  });

  it("stays accurate with a tiny residue on top of a large duration", () => {
    // This is the other case the original bug report raised — a few
    // leftover seconds nudging an otherwise round total — and it is not a
    // bug: 1h and 4s really is slightly more than an hour, so the rate is
    // correctly a little below the flat-hour figure, not suppressed.
    // $200 / (3604s / 3600) ≈ $199.78/hr.
    expect(effectiveRateCents(20_000, 3_604)).toBe(19_978);
  });
});

describe("the formatDuration / effectiveRateCents boundary", () => {
  it("never shows a rate next to a duration that displays as 0m", () => {
    for (const seconds of [0, 1, 4, 30, 59]) {
      expect(formatDuration(seconds)).toBe("0m");
      expect(effectiveRateCents(50_000, seconds)).toBeNull();
    }
  });

  it("shows a rate as soon as the duration no longer displays as 0m", () => {
    expect(formatDuration(60)).not.toBe("0m");
    expect(effectiveRateCents(50_000, 60)).not.toBeNull();
  });
});

describe("formatRate", () => {
  it("renders — for a null rate", () => {
    expect(formatRate(null)).toBe("—");
  });

  it("renders a dollar amount per hour otherwise", () => {
    expect(formatRate(7_500)).toBe("$75/hr");
  });
});

describe("roundSeconds", () => {
  // 7 minutes (420s) at a 15-minute increment (900s): 420/900 = 0.4667 units.
  it("rounds up to the next increment", () => {
    expect(roundSeconds(420, { incrementMinutes: 15, mode: "up" })).toBe(900);
  });

  it("rounds down to the previous increment", () => {
    expect(roundSeconds(420, { incrementMinutes: 15, mode: "down" })).toBe(0);
  });

  it("rounds to the nearest increment", () => {
    expect(roundSeconds(420, { incrementMinutes: 15, mode: "nearest" })).toBe(0);
    // 8 minutes (480s) is past the halfway point (450s) to the next increment.
    expect(roundSeconds(480, { incrementMinutes: 15, mode: "nearest" })).toBe(900);
  });

  it("passes seconds through unchanged with no config", () => {
    expect(roundSeconds(1_234, null)).toBe(1_234);
  });

  it("is a no-op for an entry that's already an exact multiple of the increment", () => {
    expect(roundSeconds(900, { incrementMinutes: 15, mode: "up" })).toBe(900);
    expect(roundSeconds(900, { incrementMinutes: 15, mode: "down" })).toBe(900);
  });
});

describe("roundingConfigFor", () => {
  it("is off for a free-plan org regardless of the stored setting", () => {
    expect(
      roundingConfigFor({ plan: "free", time_rounding_minutes: 15, time_rounding_mode: "up" }),
    ).toBeNull();
  });

  it("is off for a Pro org with no increment configured", () => {
    expect(
      roundingConfigFor({ plan: "pro", time_rounding_minutes: null, time_rounding_mode: "nearest" }),
    ).toBeNull();
  });

  it("returns the configured increment and mode for a Pro org", () => {
    expect(
      roundingConfigFor({ plan: "pro", time_rounding_minutes: 10, time_rounding_mode: "down" }),
    ).toEqual({ incrementMinutes: 10, mode: "down" });
  });
});
