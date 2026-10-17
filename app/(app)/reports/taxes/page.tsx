import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { dateKey } from "@/lib/dates";
import { resolvePeriod } from "@/lib/periods";
import { buildReport } from "@/lib/reports";
import { formatCents, roundingConfigFor } from "@/lib/calc";
import {
  TAX_YEAR_COLUMNS,
  estimatedTaxQuarters,
  hasAgreedToTaxDisclaimer,
  selfEmploymentTax,
  setAsideByQuarter,
} from "@/lib/tax";
import { TaxConsentForm } from "./consent-form";

export const metadata: Metadata = { title: "Tax estimates" };

/** "Apr 15, 2026": US dates for US tax deadlines. */
const fmtKey = (key: string, withYear = true) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
};

const pct = (bp: number) => `${bp / 100}%`;

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Tax estimates</h1>
      <p className="text-slate-500">
        <Link href="/reports" className="hover:underline">
          ← Reports
        </Link>
      </p>
    </div>
  );
}

export default async function TaxesPage() {
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");

  // Estimates need the whole business's profit; on Pro a member only sees
  // their own expenses, so their numbers would be wrong (ADR 0006).
  if (!ctx.hasFullAccess) {
    return (
      <div className="space-y-6">
        <Header />
        <p className="card text-sm text-slate-600">
          Tax estimates use the whole business&apos;s profit, so only the owner
          can see them.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: consents } = await supabase
    .from("tax_consents")
    .select("disclaimer_version")
    .eq("user_id", ctx.user.id);

  if (!hasAgreedToTaxDisclaimer(consents ?? [])) {
    return (
      <div className="space-y-6">
        <Header />
        <section className="card max-w-xl space-y-4">
          <h2 className="font-semibold">Before you start</h2>
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              WorkWorth can estimate how much to set aside for your quarterly
              estimated tax payments to the IRS, so tax time isn&apos;t a
              surprise.
            </p>
            <p>
              These numbers are <strong>estimates, not tax advice</strong>. They
              are worked out from the profit WorkWorth shows in Reports (tracked
              time, prices and expenses), not from what you were actually paid,
              and they don&apos;t know about your other income, deductions or
              credits. WorkWorth doesn&apos;t file or pay anything for you.
            </p>
            <p>
              Check with a tax professional before you pay or file anything.
            </p>
          </div>
          <TaxConsentForm />
        </section>
      </div>
    );
  }

  const tz = ctx.organization.timezone;
  const today = dateKey(new Date(), tz);
  // Until last year's January payment is due, last year is still the one
  // to plan for.
  const thisYear = Number(today.slice(0, 4));
  const year =
    today <= estimatedTaxQuarters(thisYear - 1)[3].dueKey
      ? thisYear - 1
      : thisYear;

  const { data: rates } = await supabase
    .from("tax_years")
    .select(TAX_YEAR_COLUMNS)
    .eq("tax_year", year)
    .maybeSingle();

  if (!rates) {
    return (
      <div className="space-y-6">
        <Header />
        <p className="card text-sm text-slate-600">
          The {year} tax rates aren&apos;t loaded yet, so there&apos;s no
          estimate to show. Check back soon.
        </p>
      </div>
    );
  }

  const quarters = estimatedTaxQuarters(year);
  const rounding = roundingConfigFor(ctx.organization);
  const ytdProfit = await Promise.all(
    quarters.map(async (q) => {
      if (q.fromKey > today) return null;
      const to = q.toKey < today ? q.toKey : today;
      const period = resolvePeriod(
        { period: "custom", from: `${year}-01-01`, to },
        tz,
      );
      return (await buildReport(period, rounding)).profitCents;
    }),
  );
  const setAside = setAsideByQuarter(ytdProfit, rates);

  const started = ytdProfit.filter((p): p is number => p !== null);
  const profitSoFar = started.at(-1) ?? 0;
  const tax = selfEmploymentTax(profitSoFar, rates);

  // The payment to plan for now: the earliest started period not yet due.
  const nextIndex = quarters.findIndex(
    (q, i) => setAside[i] && q.dueKey >= today,
  );
  const next = nextIndex >= 0 ? quarters[nextIndex] : null;
  const nextOpen = next ? next.toKey >= today : false;

  const rows = quarters.map((q, i) => {
    const prev = i === 0 ? 0 : (ytdProfit[i - 1] ?? 0);
    const profit = ytdProfit[i];
    return {
      ...q,
      profitCents: profit === null ? null : profit - prev,
      setAsideCents: setAside[i]?.setAsideCents ?? null,
      state:
        q.fromKey > today
          ? "Not started"
          : q.toKey >= today
            ? "So far"
            : q.dueKey >= today
              ? "Due next"
              : "Past",
    };
  });

  return (
    <div className="space-y-6">
      <Header />

      <section className="card space-y-1">
        {next ? (
          <>
            <p className="text-sm text-slate-600">
              Set aside for self-employment tax, due {fmtKey(next.dueKey)}
            </p>
            <p className="text-3xl font-semibold tabular-nums text-ink-900">
              {formatCents(setAside[nextIndex]?.setAsideCents ?? 0)}
            </p>
            <p className="text-xs text-slate-500">
              {nextOpen
                ? `For profit from ${fmtKey(next.fromKey, false)} to today. This grows as you work until ${fmtKey(next.toKey, false)}.`
                : `For profit from ${fmtKey(next.fromKey, false)} to ${fmtKey(next.toKey, false)}.`}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Every {year} payment date has passed.
          </p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">{year} by payment period</h2>
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Period</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  Due
                </th>
                <th className="px-3 py-2 text-right font-medium">Profit</th>
                <th className="px-4 py-2 text-right font-medium">Set aside</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr
                  key={r.quarter}
                  className={r.state === "Not started" ? "text-slate-400" : ""}
                >
                  <td className="px-4 py-2">
                    <span className="block whitespace-nowrap font-medium">
                      {fmtKey(r.fromKey, false)} – {fmtKey(r.toKey, false)}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {r.state}
                      <span className="sm:hidden">
                        {" "}
                        · due {fmtKey(r.dueKey, false)}
                      </span>
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 sm:table-cell">
                    {fmtKey(r.dueKey)}
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${r.profitCents !== null && r.profitCents < 0 ? "text-red-700" : ""}`}
                  >
                    {r.profitCents === null ? "—" : formatCents(r.profitCents)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums">
                    {r.setAsideCents === null
                      ? "—"
                      : formatCents(r.setAsideCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2 className="pb-2 font-semibold">{year} so far</h2>
        <dl className="divide-y divide-slate-100 text-sm">
          {(
            [
              ["Profit", profitSoFar],
              [
                `Social Security (${pct(rates.social_security_rate_bp)})`,
                tax.socialSecurityCents,
              ],
              [`Medicare (${pct(rates.medicare_rate_bp)})`, tax.medicareCents],
              ...(tax.additionalMedicareCents > 0
                ? ([
                    [
                      `Additional Medicare (${pct(rates.additional_medicare_rate_bp)})`,
                      tax.additionalMedicareCents,
                    ],
                  ] as const)
                : []),
              ["Self-employment tax", tax.totalCents],
            ] as const
          ).map(([label, cents]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4 py-2"
            >
              <dt className="text-slate-600">{label}</dt>
              <dd
                className={`font-semibold tabular-nums ${cents < 0 ? "text-red-700" : ""}`}
              >
                {formatCents(cents)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="pt-3 text-xs text-slate-400">
          An estimate, not tax advice. Self-employment tax only (Social Security
          and Medicare) on the profit shown in Reports; it doesn&apos;t include
          income tax. The extra Medicare tax uses the single-filer threshold.
        </p>
      </section>
    </div>
  );
}
