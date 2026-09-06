import type { Metadata } from "next";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="card text-sm text-stone-500">
        How much you worked, made, and spent — coming once time and expenses are in.
      </p>
    </div>
  );
}
