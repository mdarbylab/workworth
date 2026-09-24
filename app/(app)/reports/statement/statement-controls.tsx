"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * The on-screen control bar. Hidden when printing so it never lands on the
 * document the client receives.
 */
export function StatementControls({ showMoney }: { showMoney: boolean }) {
  const router = useRouter();
  const params = useSearchParams();

  const toggleMoney = () => {
    const next = new URLSearchParams(params.toString());
    if (showMoney) next.set("money", "0");
    else next.delete("money");
    router.replace(`/reports/statement?${next}`);
  };

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-white p-3">
      <Link href="/reports" className="text-sm text-stone-600 hover:underline">← Reports</Link>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={showMoney}
          onChange={toggleMoney}
          className="h-4 w-4 accent-emerald-700"
        />
        Show rates and amounts
      </label>

      <button
        type="button"
        onClick={() => window.print()}
        className="btn-primary ml-auto w-auto px-4 py-2 text-sm"
      >
        Print or save as PDF
      </button>
    </div>
  );
}
