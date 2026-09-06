// Timezone helpers built on Intl only. All storage is UTC; display and day
// grouping use the organization's IANA timezone (SPEC §7).

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsInTz(date: Date, tz: string): Parts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24, // some engines emit "24" at midnight
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

/** Milliseconds to add to UTC to get wall-clock time in `tz` at `date`. */
export function tzOffsetMs(date: Date, tz: string): number {
  const p = partsInTz(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Interpret a wall-clock time in `tz` and return the UTC instant. */
export function zonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  tz: string,
): Date {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let result = guess - off1;
  const off2 = tzOffsetMs(new Date(result), tz);
  if (off2 !== off1) result = guess - off2;
  return new Date(result);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" for `date` in `tz`. Used as the day-grouping key. */
export function dateKey(date: Date, tz: string): string {
  const p = partsInTz(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** "HH:MM" for `date` in `tz`, for <input type="time">. */
export function timeKey(date: Date, tz: string): string {
  const p = partsInTz(date, tz);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** Start of the calendar day (in `tz`) that contains `date`, as a UTC instant. */
export function startOfDay(date: Date, tz: string): Date {
  const p = partsInTz(date, tz);
  return zonedToUtc(p.year, p.month, p.day, 0, 0, tz);
}

/** Parse "YYYY-MM-DD" + "HH:MM" as wall-clock time in `tz`. Null if malformed. */
export function parseDateTime(dateStr: string, timeStr: string, tz: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!d || !t) return null;
  const [year, month, day] = [Number(d[1]), Number(d[2]), Number(d[3])];
  const [hour, minute] = [Number(t[1]), Number(t[2])];
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const result = zonedToUtc(year, month, day, hour, minute, tz);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function formatTime(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(date);
}

export function formatDate(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric" }).format(date);
}

export function formatDateTime(date: Date, tz: string): string {
  return `${formatDate(date, tz)}, ${formatTime(date, tz)}`;
}

/** Heading for a day group: "Today", "Yesterday", or "Monday, Sep 6". */
export function formatDayHeading(key: string, tz: string, now = new Date()): string {
  const today = dateKey(now, tz);
  if (key === today) return "Today";
  const yesterday = dateKey(new Date(startOfDay(now, tz).getTime() - 12 * 3600 * 1000), tz);
  if (key === yesterday) return "Yesterday";
  const [y, m, d] = key.split("-").map(Number);
  const date = zonedToUtc(y, m, d, 12, 0, tz);
  const sameYear = y === Number(today.slice(0, 4));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}
