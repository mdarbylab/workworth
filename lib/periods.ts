import { dateKey, startOfDay, zonedToUtc } from "@/lib/dates";

export type PeriodKey = "week" | "month" | "last-month" | "custom";

export type Period = {
  key: PeriodKey;
  label: string;
  /** Inclusive start instant (UTC). */
  from: Date;
  /** Exclusive end instant (UTC). */
  to: Date;
  /** Inclusive "YYYY-MM-DD" bounds in the org timezone, for date columns. */
  fromKey: string;
  toKey: string;
};

const DAY_MS = 24 * 3600 * 1000;

function keyParts(key: string): [number, number, number] {
  const [y, m, d] = key.split("-").map(Number);
  return [y, m, d];
}

function addDaysKey(key: string, days: number, tz: string): string {
  const [y, m, d] = keyParts(key);
  const noon = zonedToUtc(y, m, d, 12, 0, tz);
  return dateKey(new Date(noon.getTime() + days * DAY_MS), tz);
}

/** Day after `key` as a UTC instant at 00:00 in `tz` (an exclusive bound). */
function dayAfter(key: string, tz: string): Date {
  const [y, m, d] = keyParts(addDaysKey(key, 1, tz));
  return zonedToUtc(y, m, d, 0, 0, tz);
}

function dayStart(key: string, tz: string): Date {
  const [y, m, d] = keyParts(key);
  return zonedToUtc(y, m, d, 0, 0, tz);
}

const fmtMonth = (key: string) => {
  const [y, m] = keyParts(key);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
};

const fmtDay = (key: string) => {
  const [y, m, d] = keyParts(key);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
};

const isKey = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Resolve the report period from query params, in the org's timezone.
 * Weeks start on Monday. Invalid or missing input falls back to this month.
 */
export function resolvePeriod(
  params: { period?: unknown; from?: unknown; to?: unknown },
  tz: string,
  now = new Date(),
): Period {
  const today = dateKey(now, tz);
  const [y, m] = keyParts(today);

  if (params.period === "custom" && isKey(params.from) && isKey(params.to) && params.from <= params.to) {
    const fromKey = params.from;
    const toKey = params.to;
    const from = dayStart(fromKey, tz);
    const to = dayAfter(toKey, tz);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
      return { key: "custom", label: `${fmtDay(fromKey)} – ${fmtDay(toKey)}`, from, to, fromKey, toKey };
    }
  }

  if (params.period === "week") {
    // Monday-start week containing today.
    const weekday = new Date(startOfDay(now, tz).getTime() + 12 * 3600 * 1000).getUTCDay(); // 0 = Sunday
    const back = (weekday + 6) % 7;
    const fromKey = addDaysKey(today, -back, tz);
    const toKey = addDaysKey(fromKey, 6, tz);
    return { key: "week", label: "This week", from: dayStart(fromKey, tz), to: dayAfter(toKey, tz), fromKey, toKey };
  }

  if (params.period === "last-month") {
    const ly = m === 1 ? y - 1 : y;
    const lm = m === 1 ? 12 : m - 1;
    const fromKey = `${ly}-${String(lm).padStart(2, "0")}-01`;
    const to = zonedToUtc(y, m, 1, 0, 0, tz);
    const toKey = addDaysKey(today.slice(0, 8) + "01", -1, tz);
    return { key: "last-month", label: fmtMonth(fromKey), from: dayStart(fromKey, tz), to, fromKey, toKey };
  }

  const fromKey = `${y}-${String(m).padStart(2, "0")}-01`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const to = zonedToUtc(ny, nm, 1, 0, 0, tz);
  const toKey = dateKey(new Date(to.getTime() - 12 * 3600 * 1000), tz);
  return { key: "month", label: fmtMonth(fromKey), from: dayStart(fromKey, tz), to, fromKey, toKey };
}

export function periodQuery(p: Period): string {
  return p.key === "custom" ? `period=custom&from=${p.fromKey}&to=${p.toKey}` : `period=${p.key}`;
}
