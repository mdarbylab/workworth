import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/calc";
import { formatDocShortDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Invoices" };

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  void: "Void",
};

const STATUS_CLASS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-ink-100 text-ink-800",
  paid: "bg-green-100 text-green-800",
  void: "bg-slate-100 text-slate-400 line-through",
};

export default async function InvoicesPage() {
  const ctx = await getSessionContext();
  if (!ctx?.organization) redirect("/onboarding");
  if (ctx.organization.plan !== "pro") redirect("/reports");
  const tz = ctx.organization.timezone;

  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, number, status, issued_on, total_cents, clients(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <p className="text-slate-500">
          <Link href="/reports" className="hover:underline">← Reports</Link>
        </p>
      </div>

      {!invoices?.length ? (
        <p className="card text-sm text-slate-500">
          No invoices yet. Create one from a client&apos;s report: go to Reports, pick a client and
          period, then &quot;Save as invoice&quot;.
        </p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Number</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Issued</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-2">
                    <Link href={`/reports/invoices/${inv.id}`} className="font-medium hover:underline">
                      {inv.number ?? "Draft"}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-slate-600">{inv.clients?.name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                    {inv.issued_on ? formatDocShortDate(inv.issued_on, tz) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums">
                    {formatCents(inv.total_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
