import { describe, expect, it } from "vitest";
import { effectiveRateCents, formatDuration, formatRate } from "./calc";

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
