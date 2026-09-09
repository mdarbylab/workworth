import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { periodQuery, resolvePeriod } from "@/lib/periods";
import { buildReport } from "@/lib/reports";
import { formatCents, formatDuration, formatRate } from "@/lib/calc";
import { PeriodPicker } from "./period-picker";
import { TrackOnMount } from "@/components/analytics";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const params = await searchParams;
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");

  const period = resolvePeriod(params, ctx.organization.timezone);
  const report = await buildReport(period);
  const q = periodQuery(period);
  const hasFixed = report.rows.some((r) => r.jobId && r.revenueCents > 0 && r.seconds === 0);

  const questions: Array<[string, string, string?]> = [
    ["How much did I work?", formatDuration(report.seconds)],
    ["How much did I make?", formatCents(report.revenueCents)],
    ["What did I spend?", formatCents(report.expensesCents)],
    ["What did I actually make?", formatCents(report.profitCents), report.profitCents < 0 ? "text-red-700" : "text-emerald-800"],
    ["Effective hourly rate", formatRate(report.rateCents)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-stone-500">{period.label}</p>
      </div>

      <TrackOnMount event="report_viewed" props={{ period: period.key }} />
      <PeriodPicker period={period} />

      <section className="card">
        <dl className="divide-y divide-stone-100">
          {questions.map(([label, value, cls]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-stone-600 sm:text-base">{label}</dt>
              <dd className={`text-lg font-semibold tabular-nums sm:text-xl ${cls ?? ""}`}>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="pt-3 text-xs text-stone-400">
          Estimated — until invoicing exists.
          {hasFixed && " Fixed-price jobs count their full price in any period with activity."}
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">By job</h2>
        {report.rows.length === 0 ? (
          <p className="card text-sm text-stone-500">No time or expenses in this period.</p>
        ) : (
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Job</th>
                  <th className="px-3 py-2 text-right font-medium">Time</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                  <th className="px-3 py-2 text-right font-medium">Expenses</th>
                  <th className="px-3 py-2 text-right font-medium">Profit</th>
                  <th className="px-4 py-2 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.rows.map((r) => (
                  <tr key={r.jobId ?? "none"}>
                    <td className="max-w-[12rem] px-4 py-2">
                      {r.jobId ? (
                        <Link href={`/jobs/${r.jobId}`} className="block truncate font-medium hover:underline">{r.name}</Link>
                      ) : (
                        <span className="text-stone-500">{r.name}</span>
                      )}
                      {r.clientName && <span className="block truncate text-xs text-stone-500">{r.clientName}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatDuration(r.seconds)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCents(r.revenueCents)}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCents(r.expensesCents)}</td>
                    <td className={`whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums ${r.profitCents < 0 ? "text-red-700" : ""}`}>
                      {formatCents(r.profitCents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatRate(r.rateCents)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-stone-200 bg-stone-50 font-semibold">
                <tr>
                  <td className="px-4 py-2">Total</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatDuration(report.seconds)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCents(report.revenueCents)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCents(report.expensesCents)}</td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${report.profitCents < 0 ? "text-red-700" : ""}`}>
                    {formatCents(report.profitCents)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatRate(report.rateCents)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Export CSV</h2>
        <div className="grid grid-cols-2 gap-3">
          <a href={`/reports/export/time?${q}`} className="btn-secondary" download>Time entries</a>
          <a href={`/reports/export/expenses?${q}`} className="btn-secondary" download>Expenses</a>
        </div>
        <p className="text-xs text-stone-400">Times are in your business timezone ({ctx.organization.timezone}).</p>
      </section>
    </div>
  );
}
