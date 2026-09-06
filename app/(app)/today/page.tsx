import type { Metadata } from "next";
import { getSessionContext } from "@/lib/session";

export const metadata: Metadata = { title: "Today" };

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TodayPage() {
  const ctx = await getSessionContext();
  const timeZone = ctx?.organization?.timezone ?? "UTC";
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone }).format(now),
  );
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone,
  }).format(now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{greeting(hour)}</h1>
        <p className="text-stone-500">{date}</p>
      </div>

      <section className="card flex flex-col items-center gap-4 py-10 text-center">
        <p className="font-mono text-5xl tabular-nums text-stone-300">0:00:00</p>
        <p className="text-sm text-stone-500">The timer arrives in the next update.</p>
      </section>
    </div>
  );
}
