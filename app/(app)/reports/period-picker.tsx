"use client";

import Link from "next/link";
import { useState } from "react";
import type { Period, PeriodKey } from "@/lib/periods";

const PRESETS: Array<{ key: PeriodKey; label: string }> = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "custom", label: "Custom" },
];

export function PeriodPicker({ period }: { period: Period }) {
  const [custom, setCustom] = useState(period.key === "custom");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1 rounded-lg bg-stone-200 p-1">
        {PRESETS.map(({ key, label }) => {
          const active = key === "custom" ? custom : !custom && period.key === key;
          const cls = `rounded-md px-2 py-1.5 text-center text-sm font-medium ${
            active ? "bg-white text-emerald-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
          }`;
          return key === "custom" ? (
            <button key={key} type="button" onClick={() => setCustom(true)} className={cls}>
              {label}
            </button>
          ) : (
            <Link key={key} href={`/reports?period=${key}`} onClick={() => setCustom(false)} className={cls}>
              {label}
            </Link>
          );
        })}
      </div>

      {custom && (
        <form method="get" action="/reports" className="card flex flex-wrap items-end gap-3">
          <input type="hidden" name="period" value="custom" />
          <div className="min-w-0 flex-1">
            <label htmlFor="from" className="label">From</label>
            <input id="from" name="from" type="date" required defaultValue={period.fromKey} className="input" />
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="to" className="label">To</label>
            <input id="to" name="to" type="date" required defaultValue={period.toKey} className="input" />
          </div>
          <button type="submit" className="btn-primary w-auto px-4">Apply</button>
        </form>
      )}
    </div>
  );
}
