"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  clients: Array<{ id: string; name: string }>;
  periodQuery: string;
  periodLabel: string;
};

/** Sends you to a printable work report for one client over the chosen period. */
export function ClientReportForm({ clients, periodQuery, periodLabel }: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");

  if (clients.length === 0) {
    return (
      <p className="card text-sm text-stone-500">
        Add a client to a job first. Reports are grouped by who the work was for.
      </p>
    );
  }

  return (
    <form
      className="card flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/reports/statement?client=${clientId}&${periodQuery}`);
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="report_client" className="label">Client</label>
        <select
          id="report_client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="input"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary w-auto px-4">Create report</button>
      <p className="w-full text-xs text-stone-400">
        Covers {periodLabel}. Shows hours and what was done, never your expenses or profit.
      </p>
    </form>
  );
}
