import { describe, expect, it } from "vitest";
import {
  dateKey,
  formatDayHeading,
  parseDateTime,
  startOfDay,
  timeKey,
  tzOffsetMs,
  zonedToUtc,
} from "./dates";

const NY = "America/New_York";
// Verified via Node's own Intl: America/New_York went EST->EDT at
// 2026-03-08T07:00:00.000Z, and EDT->EST at 2026-11-01T07:00:00.000Z.

describe("tzOffsetMs", () => {
  it("is -5h in EST", () => {
    expect(tzOffsetMs(new Date("2026-01-15T12:00:00.000Z"), NY)).toBe(-5 * 3600 * 1000);
  });

  it("is -4h in EDT", () => {
    expect(tzOffsetMs(new Date("2026-07-15T12:00:00.000Z"), NY)).toBe(-4 * 3600 * 1000);
  });
});

describe("zonedToUtc", () => {
  it("converts an ordinary EST wall time", () => {
    // 2026-01-15 09:00 local (EST, UTC-5) = 14:00 UTC.
    expect(zonedToUtc(2026, 1, 15, 9, 0, NY).toISOString()).toBe("2026-01-15T14:00:00.000Z");
  });

  it("converts an ordinary EDT wall time", () => {
    // 2026-07-15 09:00 local (EDT, UTC-4) = 13:00 UTC.
    expect(zonedToUtc(2026, 7, 15, 9, 0, NY).toISOString()).toBe("2026-07-15T13:00:00.000Z");
  });

  it("resolves a wall time the day before spring-forward as EST", () => {
    expect(zonedToUtc(2026, 3, 7, 9, 0, NY).toISOString()).toBe("2026-03-07T14:00:00.000Z");
  });

  it("resolves a wall time the day after spring-forward as EDT", () => {
    expect(zonedToUtc(2026, 3, 9, 9, 0, NY).toISOString()).toBe("2026-03-09T13:00:00.000Z");
  });

  it("resolves a wall time the day before fall-back as EDT", () => {
    expect(zonedToUtc(2026, 10, 31, 9, 0, NY).toISOString()).toBe("2026-10-31T13:00:00.000Z");
  });

  it("resolves a wall time the day after fall-back as EST", () => {
    expect(zonedToUtc(2026, 11, 2, 9, 0, NY).toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("self-corrects across the spring-forward boundary itself", () => {
    // 03:30 local on 2026-03-08 doesn't exist (clocks jump 02:00->03:00), but
    // the function must still return a stable, non-NaN instant.
    const d = zonedToUtc(2026, 3, 8, 3, 30, NY);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });
});

describe("dateKey", () => {
  it("matches the local calendar day, not the UTC day", () => {
    // 2026-01-15T02:00:00Z is still 2026-01-14 21:00 in America/New_York.
    expect(dateKey(new Date("2026-01-15T02:00:00.000Z"), NY)).toBe("2026-01-14");
  });

  it("rolls over to the next day once local time passes midnight", () => {
    // 2026-01-15T05:00:00Z is 2026-01-15 00:00 in America/New_York (EST).
    expect(dateKey(new Date("2026-01-15T05:00:00.000Z"), NY)).toBe("2026-01-15");
  });
});

describe("timeKey", () => {
  it("renders the local HH:MM", () => {
    expect(timeKey(new Date("2026-01-15T14:00:00.000Z"), NY)).toBe("09:00");
  });

  it("pads single-digit hours and minutes", () => {
    expect(timeKey(new Date("2026-01-15T06:05:00.000Z"), NY)).toBe("01:05");
  });
});

describe("startOfDay", () => {
  it("returns local midnight as a UTC instant", () => {
    expect(startOfDay(new Date("2026-01-15T18:00:00.000Z"), NY).toISOString()).toBe(
      "2026-01-15T05:00:00.000Z",
    );
  });
});

describe("parseDateTime", () => {
  it("round-trips a valid date and time", () => {
    const d = parseDateTime("2026-01-15", "09:00", NY);
    expect(d?.toISOString()).toBe("2026-01-15T14:00:00.000Z");
  });

  it("rejects a malformed date", () => {
    expect(parseDateTime("2026/01/15", "09:00", NY)).toBeNull();
  });

  it("rejects a malformed time", () => {
    expect(parseDateTime("2026-01-15", "9:00", NY)).toBeNull();
  });

  it("rejects month 13", () => {
    expect(parseDateTime("2026-13-01", "09:00", NY)).toBeNull();
  });

  it("rejects day 32", () => {
    expect(parseDateTime("2026-01-32", "09:00", NY)).toBeNull();
  });

  it("rejects hour 24", () => {
    expect(parseDateTime("2026-01-15", "24:00", NY)).toBeNull();
  });

  it("rejects minute 60", () => {
    expect(parseDateTime("2026-01-15", "09:60", NY)).toBeNull();
  });
});

describe("formatDayHeading", () => {
  const now = new Date("2026-06-15T16:00:00.000Z"); // 2026-06-15 12:00 EDT

  it("labels today as Today", () => {
    expect(formatDayHeading("2026-06-15", NY, now)).toBe("Today");
  });

  it("labels yesterday as Yesterday", () => {
    expect(formatDayHeading("2026-06-14", NY, now)).toBe("Yesterday");
  });

  it("omits the year for a same-year date", () => {
    expect(formatDayHeading("2026-01-02", NY, now)).toBe("Friday, Jan 2");
  });

  it("includes the year for a different-year date", () => {
    expect(formatDayHeading("2025-12-31", NY, now)).toBe("Wednesday, Dec 31, 2025");
  });
});
