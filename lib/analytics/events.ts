// Product analytics events (SPEC §12). Keep this list in sync with the spec;
// events carry ids only, never emails or free text (§11 minimal personal data).
export const EVENTS = [
  "signup",
  "org_created",
  "job_created",
  "timer_started",
  "timer_stopped",
  "time_entry_manual",
  "time_entry_edited",
  "expense_added",
  "report_viewed",
  "csv_exported",
  "member_invited",
  "member_joined",
  "seat_limit_hit",
  "upgrade_clicked",
] as const;

export type EventName = (typeof EVENTS)[number];
export type EventProps = Record<string, string | number | boolean | null | undefined>;

export const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
export const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
export const analyticsEnabled = posthogKey.length > 0;
