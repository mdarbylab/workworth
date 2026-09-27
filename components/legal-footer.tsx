import Link from "next/link";

export function LegalFooter() {
  return (
    <p className="mt-8 text-center text-xs text-slate-400">
      <Link href="/privacy" className="hover:underline">Privacy</Link> ·{" "}
      <Link href="/terms" className="hover:underline">Terms</Link> ·{" "}
      <Link href="/impressum" className="hover:underline">Impressum</Link>
    </p>
  );
}
