import { describe, expect, it } from "vitest";
import { periodQuery, resolvePeriod } from "./periods";

const NY = "America/New_York";

describe("resolvePeriod — month (default/fallback)", () => {
  it("falls back to this month when period is missing", () => {
    const now = new Date("2026-06-15T16:00:00.000Z"); // 2026-06-15 local
    const p = resolvePeriod({}, NY, now);
    expect(p.key).toBe("month");
    expect(p.fromKey).toBe("2026-06-01");
    expect(p.toKey).toBe("2026-06-30");
    expect(p.from.toISOString()).toBe("2026-06-01T04:00:00.000Z");
    expect(p.to.toISOString()).toBe("2026-07-01T04:00:00.000Z");
  });

  it("falls back to this month for an unrecognized period value", () => {
    const now = new Date("2026-06-15T16:00:00.000Z");
    const p = resolvePeriod({ period: "bogus" }, NY, now);
    expect(p.key).toBe("month");
  });

  it("rolls over the year boundary from December to January", () => {
    const now = new Date("2026-12-15T16:00:00.000Z"); // EST
    const p = resolvePeriod({}, NY, now);
    expect(p.fromKey).toBe("2026-12-01");
    expect(p.to.toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });
});

describe("resolvePeriod — week", () => {
  it("backs up to the preceding Monday from a Sunday", () => {
    // 2026-06-14 is a Sunday.
    const now = new Date("2026-06-14T16:00:00.000Z");
    const p = resolvePeriod({ period: "week" }, NY, now);
    expect(p.key).toBe("week");
    expect(p.fromKey).toBe("2026-06-08"); // the Monday before
    expect(p.toKey).toBe("2026-06-14");
  });

  it("stays on Monday when now is already Monday", () => {
    // 2026-06-08 is a Monday.
    const now = new Date("2026-06-08T16:00:00.000Z");
    const p = resolvePeriod({ period: "week" }, NY, now);
    expect(p.fromKey).toBe("2026-06-08");
    expect(p.toKey).toBe("2026-06-14");
  });

  it("spans exactly 7 days inclusive", () => {
    const now = new Date("2026-06-10T16:00:00.000Z"); // Wednesday
    const p = resolvePeriod({ period: "week" }, NY, now);
    expect(p.fromKey).toBe("2026-06-08");
    expect(p.toKey).toBe("2026-06-14");
  });
});

describe("resolvePeriod — last-month", () => {
  it("resolves the prior month within the same year", () => {
    const now = new Date("2026-06-15T16:00:00.000Z");
    const p = resolvePeriod({ period: "last-month" }, NY, now);
    expect(p.key).toBe("last-month");
    expect(p.fromKey).toBe("2026-05-01");
    expect(p.toKey).toBe("2026-05-31");
  });

  it("rolls back across the year boundary from January to December", () => {
    const now = new Date("2026-01-15T16:00:00.000Z");
    const p = resolvePeriod({ period: "last-month" }, NY, now);
    expect(p.fromKey).toBe("2025-12-01");
    expect(p.toKey).toBe("2025-12-31");
  });
});

describe("resolvePeriod — custom", () => {
  it("accepts a valid from <= to range", () => {
    const now = new Date("2026-06-15T16:00:00.000Z");
    const p = resolvePeriod({ period: "custom", from: "2026-06-01", to: "2026-06-10" }, NY, now);
    expect(p.key).toBe("custom");
    expect(p.fromKey).toBe("2026-06-01");
    expect(p.toKey).toBe("2026-06-10");
    expect(p.to.toISOString()).toBe("2026-06-11T04:00:00.000Z");
  });

  it("accepts a single-day range where from equals to", () => {
    const now = new Date("2026-06-15T16:00:00.000Z");
    const p = resolvePeriod({ period: "custom", from: "2026-06-05", to: "2026-06-05" }, NY, now);
    expect(p.key).toBe("custom");
    expect(p.fromKey).toBe("2026-06-05");
    expect(p.toKey).toBe("2026-06-05");
  });

  it("falls back to month when from is after to", () => {
    const now = new Date("2026-06-15T16:00:00.000Z");
    const p = resolvePeriod({ period: "custom", from: "2026-06-10", to: "2026-06-01" }, NY, now);
    expect(p.key).toBe("month");
  });

  it("falls back to month when from or to is missing", () => {
    const now = new Date("2026-06-15T16:00:00.000Z");
    const p = resolvePeriod({ period: "custom", from: "2026-06-10" }, NY, now);
    expect(p.key).toBe("month");
  });

  it("falls back to month when from/to are not well-formed date keys", () => {
    const now = new Date("2026-06-15T16:00:00.000Z");
    const p = resolvePeriod({ period: "custom", from: "06/10/2026", to: "2026-06-20" }, NY, now);
    expect(p.key).toBe("month");
  });

  it("spans a DST boundary correctly", () => {
    const now = new Date("2026-06-15T16:00:00.000Z");
    const p = resolvePeriod(
      { period: "custom", from: "2026-03-07", to: "2026-03-09" },
      NY,
      now,
    );
    // from = 2026-03-07 00:00 EST = 05:00Z; to (exclusive) = 2026-03-10 00:00 EDT = 04:00Z.
    expect(p.from.toISOString()).toBe("2026-03-07T05:00:00.000Z");
    expect(p.to.toISOString()).toBe("2026-03-10T04:00:00.000Z");
  });
});

describe("periodQuery", () => {
  it("encodes a non-custom period by key alone", () => {
    const p = resolvePeriod({ period: "week" }, NY, new Date("2026-06-15T16:00:00.000Z"));
    expect(periodQuery(p)).toBe("period=week");
  });

  it("encodes a custom period with its from/to bounds", () => {
    const p = resolvePeriod(
      { period: "custom", from: "2026-06-01", to: "2026-06-10" },
      NY,
      new Date("2026-06-15T16:00:00.000Z"),
    );
    expect(periodQuery(p)).toBe("period=custom&from=2026-06-01&to=2026-06-10");
  });
});
