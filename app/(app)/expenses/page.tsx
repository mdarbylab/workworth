import type { Metadata } from "next";

export const metadata: Metadata = { title: "Expenses" };

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Expenses</h1>
      <p className="card text-sm text-stone-500">Your expenses will show up here.</p>
    </div>
  );
}
