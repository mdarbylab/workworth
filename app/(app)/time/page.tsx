import type { Metadata } from "next";

export const metadata: Metadata = { title: "Time" };

export default function TimePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Time</h1>
      <p className="card text-sm text-stone-500">Your time entries will show up here.</p>
    </div>
  );
}
