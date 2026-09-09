import { formatCents, formatDuration, formatRate } from "@/lib/calc";
import type { JobSummary } from "@/lib/jobs";

/** The "aha" block from SPEC §2, labeled "estimated" per §8.3. */
export function JobSummaryBlock({ summary, compact = false }: { summary: JobSummary; compact?: boolean }) {
  const rows: Array<[string, string, string?]> = [
    ["Time", formatDuration(summary.seconds)],
    ["Revenue", formatCents(summary.revenueCents)],
    ["Expenses", formatCents(summary.expensesCents)],
    ["Profit", formatCents(summary.profitCents), summary.profitCents < 0 ? "text-red-700" : "text-emerald-800"],
    ["Effective rate", formatRate(summary.rateCents)],
  ];

  if (compact) {
    return (
      <dl className="grid grid-cols-3 gap-x-2 gap-y-3 text-center sm:grid-cols-5">
        {rows.map(([label, value, cls]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-stone-500">
              {label === "Effective rate" ? "Rate" : label}
            </dt>
            <dd className={`text-sm font-semibold tabular-nums ${cls ?? ""}`}>{value}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className="divide-y divide-stone-100">
      {rows.map(([label, value, cls]) => (
        <div key={label} className="flex items-center justify-between py-2">
          <dt className="text-sm text-stone-600">{label}</dt>
          <dd className={`text-base font-semibold tabular-nums ${cls ?? ""}`}>{value}</dd>
        </div>
      ))}
      <p className="pt-2 text-xs text-stone-400">Estimated — until invoicing exists.</p>
    </dl>
  );
}
