import { Constants } from "@/lib/supabase/types";

// Fixed categories in v1 (SPEC §5.4). Values match the Postgres enum.
export const EXPENSE_CATEGORIES = Constants.public.Enums.expense_category;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  materials: "Materials",
  fuel: "Fuel",
  tools: "Tools",
  supplies: "Supplies",
  software: "Software",
  subcontractor: "Subcontractor",
  other: "Other",
};

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

/** Validate a "YYYY-MM-DD" date string for the `spent_on` column. */
export function isValidDateKey(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** "September 2026" for a "YYYY-MM" or "YYYY-MM-DD" key. */
export function formatMonth(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}
