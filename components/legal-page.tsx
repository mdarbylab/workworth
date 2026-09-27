import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "./wordmark";

/** Shared chrome for /privacy, /terms and /impressum. Content styling lives
 * under the .legal scope in globals.css. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link href="/" className="inline-block">
        <Wordmark />
      </Link>
      <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">Last updated {updated}</p>
      <div className="legal mt-6 space-y-4">{children}</div>
      <p className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-400">
        <Link href="/privacy" className="hover:underline">Privacy</Link> ·{" "}
        <Link href="/terms" className="hover:underline">Terms</Link> ·{" "}
        <Link href="/impressum" className="hover:underline">Impressum</Link>
      </p>
    </main>
  );
}
